package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

const usage = `agent-gate — deterministic gates for agent coding sessions

  hook <event>     Handle a lifecycle hook (payload on stdin)
  route            Claim a skill/subagent for the current session
  override         Spend a logged, time-boxed complexity-gate bypass
  catalog          List discovered skills
  report           Show authorship and gate activity
  doctor           Verify gate wiring is live in each vendor
  config           Print resolved config path and values

Events: SessionStart | UserPromptSubmit | PreToolUse | PostToolUse | Stop
`

func main() {
	if len(os.Args) < 2 {
		fmt.Fprint(os.Stderr, usage)
		os.Exit(1)
	}

	switch os.Args[1] {
	case "hook":
		cmdHook()
	case "route":
		cmdRoute()
	case "override":
		cmdOverride()
	case "catalog":
		cmdCatalog()
	case "report":
		cmdReport()
	case "doctor":
		cmdDoctor()
	case "config":
		cmdConfig()
	case "-h", "--help", "help":
		fmt.Print(usage)
	default:
		fmt.Fprintf(os.Stderr, "unknown command: %s\n\n%s", os.Args[1], usage)
		os.Exit(1)
	}
}

// flagValue does minimal flag parsing so the CLI stays dependency-free and
// tolerant of the shapes an agent might invoke it with.
func flagValue(args []string, name string) string {
	for i, a := range args {
		if a == "--"+name && i+1 < len(args) {
			return args[i+1]
		}
		if strings.HasPrefix(a, "--"+name+"=") {
			return strings.TrimPrefix(a, "--"+name+"=")
		}
	}
	return ""
}

// hasFlag reports whether a bare --name flag is present.
func hasFlag(args []string, name string) bool {
	for _, a := range args {
		if a == "--"+name {
			return true
		}
	}
	return false
}

// --- hook ---------------------------------------------------------------

func cmdHook() {
	eventArg := ""
	if len(os.Args) > 2 && !strings.HasPrefix(os.Args[2], "-") {
		eventArg = os.Args[2]
	}

	p := ParsePayload(os.Stdin, eventArg)
	cfg := LoadConfig().ForRepo("")
	if repo := p.RepoRoot(); repo != "" {
		cfg = LoadConfig().ForRepo(repo)
	}

	if !cfg.Enabled {
		emitAllow()
		return
	}

	switch p.Event {
	case EvSessionStart:
		hookSessionStart(p)
	case EvUserPrompt:
		hookUserPrompt(p)
	case EvPreTool:
		hookPreTool(cfg, p)
	case EvStop:
		hookStop(p)
	default:
		emitAllow()
	}
}

func hookSessionStart(p Payload) {
	catalog := LoadCatalog()
	if len(catalog) == 0 {
		emitAllow()
		return
	}

	var b strings.Builder
	b.WriteString("## Available skills\n\n")
	b.WriteString("Work executes through these. Claim one with ")
	b.WriteString("`agent-gate route --skill <name> --intent \"...\"` before editing.\n\n")
	for _, s := range catalog {
		b.WriteString(fmt.Sprintf("- **%s** — %s\n", s.Name, truncate(s.Description, 110)))
	}
	if profiles := loadProfiles(p.RepoRoot()); len(profiles) > 0 {
		b.WriteString("\n### Repo profiles\n\n")
		for _, pr := range profiles {
			b.WriteString(fmt.Sprintf("- **%s** (this repo binds defaults for it)\n", pr))
		}
	}

	emitContext(string(EvSessionStart), b.String())
}

func hookUserPrompt(p Payload) {
	Log(LedgerEntry{
		SessionID: p.SessionID, Repo: p.RepoRoot(),
		Event: "UserPromptSubmit", Decision: "logged",
	})

	ctx := "## Routing contract\n\n" +
		"Classify this turn:\n\n" +
		"- **RESEARCH** — questions, reading, brainstorming, explaining. Ungated. Proceed.\n" +
		"- **EXECUTION** — anything that changes files. Before your first edit, claim a route:\n" +
		"  `agent-gate route --skill <name> --intent \"<what and why>\"`\n\n" +
		"If no skill in the catalog fits an execution request, stop and offer to scaffold " +
		"one with `skill-forge` rather than improvising.\n"

	emitContext(string(EvUserPrompt), ctx)
}

func hookPreTool(cfg Config, p Payload) {
	if !p.IsMutating() {
		emitAllow()
		return
	}

	st := LoadState(p.SessionID)
	repo := p.RepoRoot()

	gates := []struct {
		name string
		run  func() Decision
	}{
		{"containment", func() Decision { return GateContainment(cfg, p) }},
		{"route", func() Decision { return GateRoute(cfg, p, st, LoadCatalog()) }},
		{"complexity", func() Decision { return GateComplexity(cfg, p, st) }},
	}

	for _, g := range gates {
		d := g.run()
		if !d.Deny {
			continue
		}
		_ = st.Save()
		Log(LedgerEntry{
			SessionID: p.SessionID, Repo: repo, Event: "PreToolUse",
			Decision: "deny:" + g.name, Tool: p.ToolName, Path: p.TargetPath,
			Reason: firstLine(d.Reason),
		})
		emitDeny(d.Reason)
		return
	}

	_ = st.Save()

	skill := ""
	if r := st.ActiveRoute(cfg.RouteTTL()); r != nil {
		skill = r.Skill
	}
	Log(LedgerEntry{
		SessionID: p.SessionID, Repo: repo, Event: "PreToolUse",
		Decision: "allow", Tool: p.ToolName, Path: p.TargetPath, Skill: skill,
		Lines: countLines(payloadContent(p)),
	})
	emitAllow()
}

func hookStop(p Payload) {
	st := LoadState(p.SessionID)
	skill := ""
	if st.Route != nil {
		skill = st.Route.Skill
	}
	Log(LedgerEntry{
		SessionID: p.SessionID, Repo: p.RepoRoot(),
		Event: "Stop", Decision: "turn-end", Skill: skill,
	})
	// A route authorizes one stretch of work, not the whole session.
	st.Route = nil
	_ = st.Save()
	emitAllow()
}

// --- hook output --------------------------------------------------------
//
// The nested hookSpecificOutput shape is understood by Claude Code, VS Code
// Copilot and Cursor alike, so one emitter covers every vendor.

func emitAllow() { fmt.Println("{}") }

func emitDeny(reason string) {
	out := map[string]any{
		"hookSpecificOutput": map[string]any{
			"hookEventName":            "PreToolUse",
			"permissionDecision":       "deny",
			"permissionDecisionReason": reason,
		},
		// Cursor's flat schema.
		"permission":    "deny",
		"agent_message": reason,
		"user_message":  firstLine(reason),
	}
	data, _ := json.Marshal(out)
	fmt.Println(string(data))
	// stderr reaches the model on vendors that ignore the JSON body.
	fmt.Fprintln(os.Stderr, reason)
	os.Exit(2)
}

func emitContext(event, ctx string) {
	out := map[string]any{
		"hookSpecificOutput": map[string]any{
			"hookEventName":     event,
			"additionalContext": ctx,
		},
		"agent_message": ctx,
	}
	data, _ := json.Marshal(out)
	fmt.Println(string(data))
}

func firstLine(s string) string {
	if i := strings.IndexByte(s, '\n'); i >= 0 {
		return s[:i]
	}
	return s
}

// --- route / override ---------------------------------------------------

func cmdRoute() {
	args := os.Args[2:]
	skill := flagValue(args, "skill")
	intent := flagValue(args, "intent")
	session := sessionID(args)

	if skill == "" {
		fmt.Fprintln(os.Stderr, "usage: agent-gate route --skill <name> [--intent \"...\"]")
		os.Exit(1)
	}

	catalog := LoadCatalog()
	if len(catalog) > 0 && !hasSkill(catalog, skill) {
		fmt.Fprintf(os.Stderr, "unknown skill: %q\n\n", skill)
		if s := Suggest(catalog, skill+" "+intent, 5); len(s) > 0 {
			fmt.Fprintln(os.Stderr, "Did you mean:")
			for _, sk := range s {
				fmt.Fprintf(os.Stderr, "  %-22s %s\n", sk.Name, truncate(sk.Description, 80))
			}
		} else {
			fmt.Fprintln(os.Stderr, "No close match. Scaffold one with the `skill-forge` skill.")
		}
		os.Exit(1)
	}

	st := LoadState(session)
	st.Route = &Route{Skill: skill, Intent: intent, ClaimedAt: time.Now()}
	if err := st.Save(); err != nil {
		fmt.Fprintf(os.Stderr, "could not save state: %v\n", err)
		os.Exit(1)
	}

	Log(LedgerEntry{SessionID: session, Repo: cwdRepo(), Event: "route", Decision: "claimed", Skill: skill, Reason: intent})
	fmt.Printf("route claimed: %s\n", skill)
	if intent != "" {
		fmt.Printf("intent: %s\n", intent)
	}
}

func cmdOverride() {
	args := os.Args[2:]
	reason := flagValue(args, "reason")
	session := sessionID(args)

	if strings.TrimSpace(reason) == "" {
		fmt.Fprintln(os.Stderr, "usage: agent-gate override --reason \"<why the agent must do this>\"")
		fmt.Fprintln(os.Stderr, "\nOverrides are logged and reported. Use them deliberately.")
		os.Exit(1)
	}

	cfg := LoadConfig()
	st := LoadState(session)
	st.Override = &Override{Reason: reason, GrantedAt: time.Now()}
	if err := st.Save(); err != nil {
		fmt.Fprintf(os.Stderr, "could not save state: %v\n", err)
		os.Exit(1)
	}

	Log(LedgerEntry{SessionID: session, Repo: cwdRepo(), Event: "override", Decision: "granted", Reason: reason})
	fmt.Printf("override granted: %d uses, %d minutes.\nLogged: %s\n",
		cfg.OverrideMaxUses, cfg.OverrideTTLMinutes, reason)
}

func sessionID(args []string) string {
	if s := flagValue(args, "session"); s != "" {
		return s
	}
	// Vendors expose the session id to child processes under various names.
	for _, env := range []string{
		"CLAUDE_SESSION_ID", "COPILOT_SESSION_ID", "CURSOR_SESSION_ID",
		"OPENCODE_SESSION_ID", "AGENT_SESSION_ID",
	} {
		if v := os.Getenv(env); v != "" {
			return v
		}
	}
	return "no-session"
}

// cwdRepo resolves the repository the CLI was invoked from, so manual
// route/override calls are attributed to the right project.
func cwdRepo() string {
	cwd, err := os.Getwd()
	if err != nil {
		return ""
	}
	return Payload{Cwd: cwd}.RepoRoot()
}

func hasSkill(catalog []Skill, name string) bool {
	for _, s := range catalog {
		if strings.EqualFold(s.Name, name) {
			return true
		}
	}
	return false
}

// loadProfiles lists per-repo skill bindings under .agent/profiles/.
func loadProfiles(repo string) []string {
	if repo == "" {
		return nil
	}
	entries, err := os.ReadDir(filepath.Join(repo, ".agent", "profiles"))
	if err != nil {
		return nil
	}
	var out []string
	for _, e := range entries {
		if strings.HasSuffix(e.Name(), ".md") {
			out = append(out, strings.TrimSuffix(e.Name(), ".md"))
		}
	}
	sort.Strings(out)
	return out
}

// --- catalog / report / doctor / config ---------------------------------

func cmdCatalog() {
	catalog := LoadCatalog()
	if len(catalog) == 0 {
		fmt.Println("No skills found. Run: make install-claude")
		return
	}
	// --paths emits bare SKILL.md paths so audits can iterate the catalog.
	if hasFlag(os.Args[2:], "paths") {
		for _, s := range catalog {
			fmt.Println(s.Path)
		}
		return
	}
	for _, s := range catalog {
		fmt.Printf("%-24s %s\n", s.Name, truncate(s.Description, 100))
	}
	fmt.Printf("\n%d skills\n", len(catalog))
}

func cmdReport() {
	days := 7
	if v := flagValue(os.Args[2:], "days"); v != "" {
		fmt.Sscanf(v, "%d", &days)
	}
	since := time.Now().AddDate(0, 0, -days)

	entries, err := ReadLedger(since)
	if err != nil || len(entries) == 0 {
		fmt.Printf("No gate activity in the last %d days.\n", days)
		return
	}

	type stat struct{ allowed, denied, lines, overrides int }
	byRepo := map[string]*stat{}
	bySkill := map[string]int{}
	denyKinds := map[string]int{}
	var overrideReasons []string

	for _, e := range entries {
		repo := e.Repo
		if repo == "" {
			repo = "(unknown)"
		} else {
			repo = filepath.Base(repo)
		}
		s, ok := byRepo[repo]
		if !ok {
			s = &stat{}
			byRepo[repo] = s
		}
		switch {
		case e.Event == "override" && e.Decision == "granted":
			s.overrides++
			overrideReasons = append(overrideReasons, e.Reason)
		case e.Decision == "allow":
			s.allowed++
			s.lines += e.Lines
		case strings.HasPrefix(e.Decision, "deny:"):
			s.denied++
			denyKinds[strings.TrimPrefix(e.Decision, "deny:")]++
		}
		if e.Skill != "" {
			bySkill[e.Skill]++
		}
	}

	fmt.Printf("Gate report — last %d days\n\n", days)
	fmt.Printf("%-24s %8s %8s %8s %10s\n", "REPO", "AI EDITS", "BOUNCED", "OVERRIDE", "AI LINES")
	repos := make([]string, 0, len(byRepo))
	for r := range byRepo {
		repos = append(repos, r)
	}
	sort.Strings(repos)
	totalAllowed, totalDenied := 0, 0
	for _, r := range repos {
		s := byRepo[r]
		fmt.Printf("%-24s %8d %8d %8d %10d\n", truncate(r, 24), s.allowed, s.denied, s.overrides, s.lines)
		totalAllowed += s.allowed
		totalDenied += s.denied
	}

	fmt.Println()
	if total := totalAllowed + totalDenied; total > 0 {
		fmt.Printf("Bounce rate: %d/%d (%.0f%%) of mutating calls came back to you.\n",
			totalDenied, total, 100*float64(totalDenied)/float64(total))
		if totalDenied == 0 {
			fmt.Println("  Nothing bounced. Your thresholds are probably too low — raise max_hand_lines.")
		}
	}

	if len(denyKinds) > 0 {
		fmt.Println("\nBounces by gate:")
		kinds := make([]string, 0, len(denyKinds))
		for k := range denyKinds {
			kinds = append(kinds, k)
		}
		sort.Strings(kinds)
		for _, k := range kinds {
			fmt.Printf("  %-14s %d\n", k, denyKinds[k])
		}
	}

	if len(bySkill) > 0 {
		fmt.Println("\nRoutes used:")
		type kv struct {
			k string
			v int
		}
		var list []kv
		for k, v := range bySkill {
			list = append(list, kv{k, v})
		}
		sort.Slice(list, func(i, j int) bool { return list[i].v > list[j].v })
		for i, e := range list {
			if i >= 10 {
				break
			}
			fmt.Printf("  %-24s %d\n", e.k, e.v)
		}
	}

	if len(overrideReasons) > 0 {
		fmt.Printf("\nOverrides (%d) — every one of these was work you chose not to do:\n", len(overrideReasons))
		for _, r := range overrideReasons {
			fmt.Printf("  - %s\n", truncate(r, 100))
		}
	}
}

func cmdConfig() {
	cfg := LoadConfig()
	fmt.Printf("config: %s\n\n", configPath())
	data, _ := json.MarshalIndent(cfg, "", "  ")
	fmt.Println(string(data))
}

// cmdDoctor verifies each vendor's wiring. A gate you believe is active but
// which never fires is worse than no gate, so this checks real files rather
// than assuming the installer succeeded.
func cmdDoctor() {
	home, _ := os.UserHomeDir()
	bin, _ := os.Executable()
	problems := 0

	fmt.Println("agent-gate doctor")
	fmt.Println()
	fmt.Printf("  binary:  %s\n", bin)
	fmt.Printf("  home:    %s\n", Home())
	fmt.Printf("  config:  %s\n\n", configPath())

	catalog := LoadCatalog()
	fmt.Printf("  catalog: %d skills\n", len(catalog))
	if len(catalog) == 0 {
		fmt.Println("    FAIL  no skills discovered — the route gate would dead-end")
		problems++
	}

	type target struct{ name, path string }
	targets := []target{
		{"claude", filepath.Join(home, ".claude", "settings.json")},
		{"vscode (user)", filepath.Join(home, ".copilot", "hooks", "agent-gate.json")},
		{"cursor", filepath.Join(home, ".cursor", "hooks.json")},
	}

	fmt.Println("\n  hook wiring:")
	wired := 0
	for _, t := range targets {
		data, err := os.ReadFile(t.path)
		switch {
		case err != nil:
			fmt.Printf("    --    %-14s not present (%s)\n", t.name, t.path)
		case strings.Contains(string(data), "agent-gate"):
			fmt.Printf("    OK    %-14s %s\n", t.name, t.path)
			wired++
		default:
			fmt.Printf("    FAIL  %-14s present but no agent-gate hooks\n", t.name)
			problems++
		}
	}

	// OpenCode uses a plugin instead of hooks JSON.
	ocPlugin := filepath.Join(home, ".config", "opencode", "plugins", "agent-gate.ts")
	ocPluginAlt := filepath.Join(home, ".config", "opencode", "plugins", "agent-gate.js")
	fmt.Println("\n  plugin wiring:")
	switch {
	case fileExists(ocPlugin) || fileExists(ocPluginAlt):
		path := ocPlugin
		if !fileExists(ocPlugin) {
			path = ocPluginAlt
		}
		fmt.Printf("    OK    %-14s %s\n", "opencode", path)
		wired++
	default:
		fmt.Printf("    --    %-14s not present (%s)\n", "opencode", ocPlugin)
	}

	if wired == 0 {
		fmt.Println("    FAIL  no vendor has live gate wiring — run: make install-gates")
		problems++
	}

	cfg := LoadConfig()
	fmt.Println("\n  gates:")
	fmt.Printf("    enabled=%v route=%v complexity=%v containment=%v\n",
		cfg.Enabled, cfg.RouteGate, cfg.ComplexityGate, cfg.ContainmentGate)
	if !cfg.Enabled {
		fmt.Println("    WARN  master switch is off — nothing will block")
	}

	if entries, err := ReadLedger(time.Now().AddDate(0, 0, -7)); err == nil {
		fmt.Printf("\n  ledger:  %d entries in the last 7 days\n", len(entries))
		if len(entries) == 0 && wired > 0 {
			fmt.Println("    WARN  wired but silent — hooks may not be firing")
		}
	}

	fmt.Println()
	if problems > 0 {
		fmt.Printf("%d problem(s) found.\n", problems)
		os.Exit(1)
	}
	fmt.Println("All checks passed.")
}

func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}
