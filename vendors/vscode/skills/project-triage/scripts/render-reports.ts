import { Database } from "bun:sqlite";
import { resolve } from "path";
import { triageDb, triageRepo, triageDir, scriptsDir } from "./paths";

const TEMPLATES_DIR = resolve(scriptsDir(), "templates");

const RUN_START = new Date().toISOString();

function render(template: string, data: Record<string, unknown>): string {
  let output = template;

  output = output.replace(/\{\{#each (\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (_, key: string, block: string) => {
    const arr = data[key];
    if (!Array.isArray(arr) || arr.length === 0) return "";
    return arr.map((item) => render(block, { ...data, ...item, this: item })).join("");
  });

  output = output.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, key: string, block: string) => {
    const val = data[key];
    if (!val) return "";
    return render(block, data);
  });

  output = output.replace(/\{\{([^#/][^}]*?)\}\}/g, (_, key: string) => {
    const parts = key.trim().split(".");
    let val: unknown = data;
    for (const p of parts) {
      if (val == null || typeof val !== "object") return "";
      val = (val as Record<string, unknown>)[p];
    }
    if (val === null || val === undefined) return "";
    return String(val);
  });

  return output;
}

function buildGhLabelCommand(number: number, addLabels: string[], removeLabels: string[]): string {
  const parts = [`gh issue edit ${number} --repo ${triageRepo()}`];
  for (const l of addLabels) {
    parts.push(`--add-label "${l}"`);
  }
  for (const l of removeLabels) {
    parts.push(`--remove-label "${l}"`);
  }
  return parts.join(" ");
}

async function main() {
  const db = new Database(triageDb(), { readonly: true });
  const timestamp = RUN_START;

  // --- Issues Report ---
  const issuesTemplate = await Bun.file(resolve(TEMPLATES_DIR, "issues.md.tmpl")).text();

  const issueTriageRows = db.prepare(`
    SELECT tl.item_number as number, tl.labels_added, tl.labels_removed, tl.confidence,
           tl.notes as rationale, tl.comment_signal, tl.triaged_at,
           i.title,
           COALESCE((SELECT json_group_array(il.label) FROM issue_labels il WHERE il.issue_number = i.number), '[]') as current_labels_json
    FROM triage_log tl
    JOIN issues i ON i.number = tl.item_number
    WHERE tl.item_type = 'issue' AND tl.agent = 'issue-triage'
      AND tl.id IN (SELECT MAX(id) FROM triage_log WHERE item_type = 'issue' AND agent = 'issue-triage' GROUP BY item_number)
    ORDER BY tl.confidence DESC
  `).all() as Array<Record<string, unknown>>;

  const enrichedIssues = issueTriageRows.map((r) => {
    const addLabels: string[] = JSON.parse((r.labels_added as string) ?? "[]");
    const removeLabels: string[] = JSON.parse((r.labels_removed as string) ?? "[]");
    const currentLabels: string[] = JSON.parse((r.current_labels_json as string) ?? "[]");
    const hasChanges = addLabels.length > 0 || removeLabels.length > 0;
    return {
      ...r,
      current_labels: currentLabels.join(", "),
      add_labels: addLabels.join(", "),
      remove_labels: removeLabels.join(", "),
      comment_signal: r.comment_signal ?? "",
      gh_command: hasChanges ? buildGhLabelCommand(r.number as number, addLabels, removeLabels) : "",
      has_changes: hasChanges,
      is_new_this_run: (r.triaged_at as string) >= timestamp.slice(0, 10),
    };
  });

  const actionable = enrichedIssues.filter((r) => r.has_changes);
  const newThisRun = actionable.filter((r) => r.is_new_this_run);
  const highConfidence = actionable.filter((r) => (r.confidence as number) >= 0.8 && !r.is_new_this_run);
  const needsReview = actionable.filter((r) => (r.confidence as number) < 0.8 && !r.is_new_this_run);
  const unchanged = enrichedIssues.filter((r) => !r.has_changes).map((r) => ({
    ...r,
    labels: r.current_labels,
    last_triaged: r.triaged_at ?? "never",
  }));

  const issuesData = {
    timestamp,
    counts: {
      total: issueTriageRows.length,
      new_this_run: newThisRun.length,
      updated_this_run: actionable.length - newThisRun.length,
      labels_added: actionable.reduce((s, r) => s + JSON.parse((r.labels_added as string) ?? "[]").length, 0),
      labels_removed: actionable.reduce((s, r) => s + JSON.parse((r.labels_removed as string) ?? "[]").length, 0),
      high_confidence: highConfidence.length + newThisRun.filter((r) => (r.confidence as number) >= 0.8).length,
      needs_review: needsReview.length + newThisRun.filter((r) => (r.confidence as number) < 0.8).length,
      unchanged: unchanged.length,
    },
    new_this_run: newThisRun,
    high_confidence: highConfidence,
    needs_review: needsReview,
    unchanged,
  };

  await Bun.write(resolve(triageDir(), "issues.md"), render(issuesTemplate, issuesData));

  // --- Backlog Report ---
  const backlogTemplate = await Bun.file(resolve(TEMPLATES_DIR, "backlog.md.tmpl")).text();

  const backlogRows = db.prepare(`
    SELECT tl.item_number as number, tl.score, tl.effort, tl.confidence, tl.area,
           tl.drivers, tl.fix_plan, tl.related_issues, tl.triaged_at,
           i.title
    FROM triage_log tl
    JOIN issues i ON i.number = tl.item_number
    WHERE tl.item_type = 'issue' AND tl.agent = 'backlog-planner'
      AND tl.id IN (SELECT MAX(id) FROM triage_log WHERE item_type = 'issue' AND agent = 'backlog-planner' GROUP BY item_number)
    ORDER BY tl.score DESC
  `).all() as Array<Record<string, unknown>>;

  const enrichedBacklog = backlogRows.map((r) => {
    const fixPlan = r.fix_plan ? JSON.parse(r.fix_plan as string) : { file: "", approach: "", test: "", branch: "" };
    const drivers: string[] = r.drivers ? JSON.parse(r.drivers as string) : [];
    const relatedIssues: number[] = r.related_issues ? JSON.parse(r.related_issues as string) : [];
    return {
      ...r,
      drivers: drivers.join(", "),
      fix_plan: fixPlan,
      related_issues: relatedIssues,
      related_issues_str: relatedIssues.map((n) => `#${n}`).join(", ") || "—",
      is_new_this_run: (r.triaged_at as string) >= timestamp.slice(0, 10),
    };
  });

  const quickFixes = enrichedBacklog.filter(
    (r) => r.effort === "quick-fix" && (r.confidence as number) >= 0.8
  );

  const groupMap = new Map<string, typeof enrichedBacklog>();
  for (const item of enrichedBacklog) {
    if (item.related_issues.length > 0) {
      const key = `${item.area}-${item.related_issues.sort().join(",")}`;
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(item);
    }
  }
  const groups = [...groupMap.entries()]
    .filter(([, items]) => items.length > 1)
    .map(([, items]) => ({
      area: items[0].area,
      description: `${items.length} related issues in ${items[0].area}`,
      issues: items,
    }));

  const backlogData = {
    timestamp,
    counts: {
      total: backlogRows.length,
      new_this_run: enrichedBacklog.filter((r) => r.is_new_this_run).length,
      quick_fix: backlogRows.filter((r) => r.effort === "quick-fix").length,
      medium: backlogRows.filter((r) => r.effort === "medium").length,
      large: backlogRows.filter((r) => r.effort === "large").length,
    },
    top10: enrichedBacklog.slice(0, 10),
    items: enrichedBacklog,
    quick_fixes: quickFixes,
    groups,
  };

  await Bun.write(resolve(triageDir(), "backlog.md"), render(backlogTemplate, backlogData));

  // --- PRs Report ---
  const prsTemplate = await Bun.file(resolve(TEMPLATES_DIR, "prs.md.tmpl")).text();

  const prRows = db.prepare(`
    SELECT tl.item_number as number, tl.score, tl.recommendation, tl.confidence, tl.notes as rationale,
           tl.agent_output, tl.triaged_at,
           p.title, p.author, p.updated_at, p.ci_status, p.linked_issue
    FROM triage_log tl
    JOIN prs p ON p.number = tl.item_number
    WHERE tl.item_type = 'pr' AND tl.agent = 'pr-triage'
      AND tl.id IN (SELECT MAX(id) FROM triage_log WHERE item_type = 'pr' AND agent = 'pr-triage' GROUP BY item_number)
    ORDER BY tl.score DESC
  `).all() as Array<Record<string, unknown>>;

  const enrichedPrs = prRows.map((r) => {
    const agentOutput = r.agent_output ? JSON.parse(r.agent_output as string) : {};
    return {
      ...r,
      staleness_days: agentOutput.staleness_days ?? 0,
      is_new_this_run: (r.triaged_at as string) >= timestamp.slice(0, 10),
    };
  });

  const reviewItems = enrichedPrs.filter((r) => r.recommendation === "REVIEW");
  const closeItems = enrichedPrs.filter((r) => r.recommendation === "CLOSE");
  const mergeReadyItems = enrichedPrs.filter((r) => r.recommendation === "MERGE-READY");

  const duplicateGroups = db.prepare(`
    SELECT dg.issue_number as issue, dg.winner_pr as winner, dg.losers_json, dg.close_action
    FROM duplicate_groups dg
    ORDER BY dg.triaged_at DESC
  `).all() as Array<Record<string, unknown>>;

  const enrichedGroups = duplicateGroups.map((g) => {
    const losers: Array<{ number: number; score: number }> = JSON.parse(g.losers_json as string);
    const winnerRow = enrichedPrs.find((p) => p.number === g.winner);
    const allPrs = [
      { number: g.winner as number, score: (winnerRow?.score as number) ?? 0, recommendation: "KEEP" },
      ...losers.map((l) => ({ ...l, recommendation: "CLOSE" })),
    ];
    const closeAction = (g.close_action as string) ||
      losers.map((l) => `gh pr close ${l.number} --repo ${triageRepo()} -c "Closing in favor of #${g.winner}"`).join("\n");
    return {
      issue: g.issue,
      winner: g.winner,
      prs: allPrs,
      pr_count: allPrs.length,
      close_action: closeAction,
    };
  });

  const prsData = {
    timestamp,
    counts: {
      total: prRows.length,
      new_this_run: enrichedPrs.filter((r) => r.is_new_this_run).length,
      review: reviewItems.length,
      close: closeItems.length,
      merge_ready: mergeReadyItems.length,
      duplicate_groups: enrichedGroups.length,
    },
    review_items: reviewItems,
    close_items: closeItems,
    merge_ready_items: mergeReadyItems,
    duplicate_groups: enrichedGroups,
  };

  await Bun.write(resolve(triageDir(), "prs.md"), render(prsTemplate, prsData));

  db.close();

  const summary = {
    rendered: ["issues.md", "backlog.md", "prs.md"],
    issues: { total: issuesData.counts.total, actionable: actionable.length, new: issuesData.counts.new_this_run },
    backlog: { total: backlogData.counts.total, quick_fixes: quickFixes.length },
    prs: { total: prsData.counts.total, review: reviewItems.length, close: closeItems.length, merge_ready: mergeReadyItems.length },
  };
  console.log(JSON.stringify(summary));
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
