package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// Decision is a gate verdict. Allow is the default for anything unrecognized:
// the engine fails open so a bug here can never brick an editing session.
type Decision struct {
	Deny    bool
	Reason  string
	Context string
}

var allow = Decision{}

// GateRoute enforces that mutating work happens under a named skill or
// subagent. This is the teeth behind "everything routes through a skill".
func GateRoute(cfg Config, p Payload, st *SessionState, catalog []Skill) Decision {
	if !cfg.RouteGate {
		return allow
	}
	if r := st.ActiveRoute(cfg.RouteTTL()); r != nil {
		return allow
	}

	var b strings.Builder
	b.WriteString("ROUTE GATE — no skill or subagent claimed for this work.\n\n")
	b.WriteString("Every change must execute under a named skill or subagent.\n")
	b.WriteString("Claim one before editing:\n\n")
	b.WriteString("    agent-gate route --skill <name> --intent \"<what you are doing>\"\n\n")

	if s := Suggest(catalog, p.Prompt+" "+p.TargetPath, 4); len(s) > 0 {
		b.WriteString("Closest matches in your catalog:\n")
		for _, sk := range s {
			b.WriteString(fmt.Sprintf("  %-22s %s\n", sk.Name, truncate(sk.Description, 90)))
		}
		b.WriteString("\n")
	} else if len(catalog) > 0 {
		b.WriteString(fmt.Sprintf("Catalog has %d skills — run `agent-gate catalog` to list them.\n\n", len(catalog)))
	}

	b.WriteString("If no skill fits, do NOT improvise: scaffold one with the `skill-forge`\n")
	b.WriteString("skill, then claim it. Research and reading are ungated — this gate only\n")
	b.WriteString("fires on tools that modify the workspace.")

	return Decision{Deny: true, Reason: b.String()}
}

// GateContainment keeps agent-authored prose out of repository roots. Notes
// and plans belong in .agent/, which is gitignored.
func GateContainment(cfg Config, p Payload) Decision {
	if !cfg.ContainmentGate || p.TargetPath == "" {
		return allow
	}
	ext := strings.ToLower(filepath.Ext(p.TargetPath))
	if ext != ".md" && ext != ".mdx" {
		return allow
	}

	repo := p.RepoRoot()
	if repo == "" {
		return allow
	}
	rel, err := filepath.Rel(repo, absPath(p, p.TargetPath))
	if err != nil || strings.HasPrefix(rel, "..") {
		return allow
	}

	// Editing a file that already exists is fine — this gate stops *new*
	// scratch files from accumulating, not legitimate doc maintenance.
	if _, err := os.Stat(absPath(p, p.TargetPath)); err == nil {
		return allow
	}

	if isAllowedDocPath(rel) {
		return allow
	}

	return Decision{
		Deny: true,
		Reason: fmt.Sprintf(
			"CONTAINMENT GATE — new markdown outside the allowed doc paths.\n\n"+
				"  wanted: %s\n"+
				"  put it: .agent/%s\n\n"+
				"Agent-authored notes, plans and reports live in .agent/ (gitignored).\n"+
				"Existing docs, README/CHANGELOG, docs/ and .github/ are unaffected.",
			rel, filepath.Base(rel)),
	}
}

// isAllowedDocPath lists locations where new markdown is legitimate.
func isAllowedDocPath(rel string) bool {
	rel = filepath.ToSlash(rel)
	base := strings.ToUpper(filepath.Base(rel))

	switch base {
	case "README.MD", "CHANGELOG.MD", "CONTRIBUTING.MD", "LICENSE.MD",
		"AGENTS.MD", "CLAUDE.MD", "SKILL.MD", "CODE_OF_CONDUCT.MD", "SECURITY.MD":
		return true
	}

	for _, prefix := range []string{
		".agent/", "docs/", "doc/", ".github/", ".claude/", ".cursor/",
		"website/", "site/", "content/", "shared/skills/", "shared/agents/",
	} {
		if strings.HasPrefix(rel, prefix) {
			return true
		}
	}
	// Skill and agent definitions anywhere in the tree.
	return strings.Contains(rel, "/skills/") || strings.Contains(rel, "/agents/")
}

// GateComplexity hands small changes in languages you want to stay sharp in
// back to you, with a card describing exactly what to write and how to check
// it. This is the anti-atrophy gate.
func GateComplexity(cfg Config, p Payload, st *SessionState) Decision {
	if !cfg.ComplexityGate || p.TargetPath == "" {
		return allow
	}
	if cfg.IsAssistOnly(p.TargetPath) || !cfg.IsSharpen(p.TargetPath) {
		return allow
	}

	abs := absPath(p, p.TargetPath)

	// Bounce a given file at most once per session. If you hand it back, the
	// agent should not be re-blocked on your follow-up request for help.
	if st.Bounced[abs] {
		return allow
	}
	if st.ConsumeOverride(cfg.OverrideMaxUses, cfg.OverrideTTL()) {
		return allow
	}

	size, isNew := editSize(p, abs)
	// Large or structural changes stay delegated; only small ones come back.
	if !isNew && size > cfg.MaxHandLines {
		return allow
	}
	if isNew && size > cfg.MaxHandLines {
		return allow
	}

	st.Bounced[abs] = true

	rel := abs
	if repo := p.RepoRoot(); repo != "" {
		if r, err := filepath.Rel(repo, abs); err == nil {
			rel = r
		}
	}

	skill := patternSkillFor(p.TargetPath)
	verify := verifyCmdFor(rel)
	route := "unclaimed"
	if r := st.ActiveRoute(cfg.RouteTTL()); r != nil {
		route = r.Skill
		if r.Intent != "" {
			route = r.Skill + " — " + r.Intent
		}
	}

	card := fmt.Sprintf(
		"YOU WRITE THIS.\n\n"+
			"  file:    %s\n"+
			"  do:      %s\n"+
			"  read:    skill %s\n"+
			"  verify:  %s\n"+
			"  why:     %d-line change in a sharpen language (threshold %d)\n\n"+
			"This is small enough to be worth writing by hand. Describe the approach\n"+
			"if asked, but do not make the edit.\n\n"+
			"Genuinely need the agent for it? Run:\n"+
			"    agent-gate override --reason \"<why>\"\n"+
			"Overrides are logged and show up in `agent-gate report`.",
		rel, route, skill, verify, size, cfg.MaxHandLines)

	return Decision{Deny: true, Reason: card}
}

// editSize estimates how many lines the proposed change touches, and whether
// the file is new.
func editSize(p Payload, abs string) (int, bool) {
	if _, err := os.Stat(abs); err != nil {
		return countLines(payloadContent(p)), true
	}
	if c := payloadContent(p); c != "" {
		return countLines(c), false
	}
	// No content in the payload (VS Code often omits it) — assume small so the
	// gate still engages on sharpen languages.
	return 1, false
}

// payloadContent digs the proposed text out of the tool input.
func payloadContent(p Payload) string {
	for _, key := range []string{"tool_input", "toolInput"} {
		v, ok := p.Raw[key]
		if !ok {
			continue
		}
		m, ok := v.(map[string]any)
		if !ok {
			continue
		}
		if s := extractString(m, "content", "new_string", "newString", "text", "patch"); s != "" {
			return s
		}
	}
	return ""
}

func countLines(s string) int {
	if s == "" {
		return 0
	}
	return strings.Count(strings.TrimRight(s, "\n"), "\n") + 1
}

// patternSkillFor maps a file to the convention skill that governs it.
func patternSkillFor(path string) string {
	switch strings.ToLower(filepath.Ext(path)) {
	case ".go":
		return "go-patterns"
	case ".rs":
		return "rust-patterns"
	case ".py":
		return "python-patterns"
	case ".tsx":
		return "react-patterns"
	case ".ts":
		return "typescript-patterns"
	}
	return "(none)"
}

// verifyCmdFor suggests the narrowest check that proves the change works.
// verifyCmdFor builds the check command for the handoff card. path must be
// repo-relative — an absolute path here leaks machine paths into the card and
// produces package names that don't exist.
func verifyCmdFor(path string) string {
	dir := filepath.Dir(path)
	switch strings.ToLower(filepath.Ext(path)) {
	case ".go":
		if dir == "." || dir == "" {
			return "go test ./..."
		}
		return "go test ./" + dir
	case ".rs":
		return "cargo test"
	case ".py":
		if dir == "." || dir == "" {
			return "python -m pytest"
		}
		return "python -m pytest " + dir
	case ".ts", ".tsx":
		return "npm run typecheck && npm test"
	}
	return "(project check)"
}

func absPath(p Payload, path string) string {
	if filepath.IsAbs(path) {
		return path
	}
	if p.Cwd != "" {
		return filepath.Join(p.Cwd, path)
	}
	cwd, _ := os.Getwd()
	return filepath.Join(cwd, path)
}

func truncate(s string, n int) string {
	s = strings.ReplaceAll(s, "\n", " ")
	if len(s) <= n {
		return s
	}
	return s[:n-1] + "…"
}
