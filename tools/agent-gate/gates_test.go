package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func payloadFor(t *testing.T, body string) Payload {
	t.Helper()
	return ParsePayload(strings.NewReader(body), "")
}

// A gate that blocks reading or testing would make the workflow unusable, so
// these cases matter more than the deny cases.
func TestNonMutatingToolsAreNeverGated(t *testing.T) {
	cases := []struct {
		name string
		body string
	}{
		{"read", `{"tool_name":"Read","tool_input":{"file_path":"/a/b.go"}}`},
		{"grep", `{"tool_name":"Grep","tool_input":{"pattern":"x"}}`},
		{"go test", `{"tool_name":"Bash","tool_input":{"command":"go test ./..."}}`},
		{"git status", `{"tool_name":"Bash","tool_input":{"command":"git status"}}`},
		{"git diff", `{"tool_name":"Bash","tool_input":{"command":"git diff HEAD"}}`},
		{"ls", `{"tool_name":"Bash","tool_input":{"command":"ls -la"}}`},
		{"npm test", `{"tool_name":"runTerminalCommand","tool_input":{"command":"npm test"}}`},
		{"cargo check", `{"tool_name":"Shell","tool_input":{"command":"cargo check"}}`},
		{"pointer arrow", `{"tool_name":"Bash","tool_input":{"command":"echo a -> b"}}`},
		{"stderr redirect", `{"tool_name":"Bash","tool_input":{"command":"go build 2>&1"}}`},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if payloadFor(t, c.body).IsMutating() {
				t.Errorf("%s was treated as mutating; it must pass through untouched", c.name)
			}
		})
	}
}

func TestMutatingToolsAreDetectedAcrossVendors(t *testing.T) {
	cases := []struct {
		name string
		body string
	}{
		{"claude write", `{"tool_name":"Write","tool_input":{"file_path":"/a.go"}}`},
		{"claude edit", `{"tool_name":"Edit","tool_input":{"file_path":"/a.go"}}`},
		{"opencode apply_patch", `{"tool_name":"apply_patch","tool_input":{"patchText":"*** Update File: src/a.ts\n@@\n-a\n+b\n"}}`},
		{"vscode editFiles", `{"toolName":"editFiles","toolInput":{"filePath":"/a.go"}}`},
		{"vscode applyPatch", `{"tool_name":"applyPatch","tool_input":{"path":"/a.go"}}`},
		{"cursor searchReplace", `{"tool_name":"searchReplace","tool_input":{"path":"/a.go"}}`},
		{"shell rm", `{"tool_name":"Bash","tool_input":{"command":"rm -rf build"}}`},
		{"shell redirect", `{"tool_name":"Bash","tool_input":{"command":"echo x > f.txt"}}`},
		{"shell sed -i", `{"tool_name":"Shell","tool_input":{"command":"sed -i s/a/b/ f"}}`},
		{"chained rm", `{"tool_name":"Bash","tool_input":{"command":"cd /x && rm -f y"}}`},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if !payloadFor(t, c.body).IsMutating() {
				t.Errorf("%s should be gated as mutating", c.name)
			}
		})
	}
}

// Vendors disagree on field casing; a missed spelling silently disables gates.
func TestPayloadNormalizationAcrossVendorSpellings(t *testing.T) {
	claude := payloadFor(t, `{"hook_event_name":"PreToolUse","session_id":"s1","tool_name":"Write","tool_input":{"file_path":"/a.go"}}`)
	vscode := payloadFor(t, `{"hookEventName":"PreToolUse","sessionId":"s1","toolName":"editFiles","toolInput":{"filePaths":["/a.go"]}}`)
	cursor := ParsePayload(strings.NewReader(`{"event":"beforeSubmitPrompt","sessionId":"s2","prompt":"hi"}`), "")

	if claude.Event != EvPreTool || vscode.Event != EvPreTool {
		t.Errorf("PreToolUse not normalized: claude=%v vscode=%v", claude.Event, vscode.Event)
	}
	if claude.TargetPath != "/a.go" || vscode.TargetPath != "/a.go" {
		t.Errorf("target path not extracted: claude=%q vscode=%q", claude.TargetPath, vscode.TargetPath)
	}
	op := payloadFor(t, `{"tool_name":"apply_patch","tool_input":{"patchText":"*** Add File: pkg/new.go\n@@\n+package pkg\n"}}`)
	if op.TargetPath != "pkg/new.go" {
		t.Errorf("opencode apply_patch path not extracted, got %q", op.TargetPath)
	}
	if cursor.Event != EvUserPrompt {
		t.Errorf("cursor beforeSubmitPrompt should map to UserPromptSubmit, got %v", cursor.Event)
	}
	if cursor.Prompt != "hi" {
		t.Errorf("prompt not extracted, got %q", cursor.Prompt)
	}
}

// VS Code fires every hook on every event, so the CLI argument must win.
func TestEventOverrideWins(t *testing.T) {
	p := ParsePayload(strings.NewReader(`{"hook_event_name":"PostToolUse","tool_name":"Write"}`), "PreToolUse")
	if p.Event != EvPreTool {
		t.Errorf("explicit event arg should win, got %v", p.Event)
	}
}

// Malformed input must fail open, never block the user.
func TestMalformedPayloadFailsOpen(t *testing.T) {
	for _, body := range []string{"", "not json", "{", "[]", "null"} {
		p := ParsePayload(strings.NewReader(body), "")
		if p.IsMutating() {
			t.Errorf("malformed payload %q must not be treated as mutating", body)
		}
	}
}

// Repo resolution must key off the target file, not the process cwd — this is
// what makes gates correct inside a multi-repo workspace.
func TestRepoRootResolvesFromTargetNotCwd(t *testing.T) {
	root := t.TempDir()
	repoA := filepath.Join(root, "repo-a")
	repoB := filepath.Join(root, "repo-b")
	for _, r := range []string{repoA, repoB} {
		if err := os.MkdirAll(filepath.Join(r, ".git"), 0o755); err != nil {
			t.Fatal(err)
		}
	}
	nested := filepath.Join(repoB, "internal", "pkg")
	if err := os.MkdirAll(nested, 0o755); err != nil {
		t.Fatal(err)
	}

	p := Payload{Cwd: repoA, TargetPath: filepath.Join(nested, "x.go")}
	if got := p.RepoRoot(); got != repoB {
		t.Errorf("expected repo from target path %q, got %q", repoB, got)
	}
}

func TestContainmentAllowsLegitimateDocsAndBlocksScratch(t *testing.T) {
	cfg := DefaultConfig()
	repo := t.TempDir()
	if err := os.MkdirAll(filepath.Join(repo, ".git"), 0o755); err != nil {
		t.Fatal(err)
	}

	allowed := []string{"README.md", "docs/design.md", ".agent/notes.md", ".github/x.md", "shared/skills/a/SKILL.md"}
	for _, rel := range allowed {
		p := Payload{Cwd: repo, TargetPath: filepath.Join(repo, rel), ToolName: "Write"}
		if d := GateContainment(cfg, p); d.Deny {
			t.Errorf("%s should be allowed, got deny: %s", rel, firstLine(d.Reason))
		}
	}

	blocked := []string{"ANALYSIS.md", "notes/scratch.md", "PLAN-v2.md"}
	for _, rel := range blocked {
		p := Payload{Cwd: repo, TargetPath: filepath.Join(repo, rel), ToolName: "Write"}
		if d := GateContainment(cfg, p); !d.Deny {
			t.Errorf("%s should be contained to .agent/, but was allowed", rel)
		}
	}

	// Editing an existing file is doc maintenance, not sprawl.
	existing := filepath.Join(repo, "ANALYSIS.md")
	if err := os.WriteFile(existing, []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}
	if d := GateContainment(cfg, Payload{Cwd: repo, TargetPath: existing}); d.Deny {
		t.Error("editing an existing markdown file must not be blocked")
	}
}

func TestComplexityGateBouncesSmallSharpenEdits(t *testing.T) {
	cfg := DefaultConfig()
	repo := t.TempDir()
	if err := os.MkdirAll(filepath.Join(repo, ".git"), 0o755); err != nil {
		t.Fatal(err)
	}
	target := filepath.Join(repo, "x.go")
	if err := os.WriteFile(target, []byte("package x\n"), 0o644); err != nil {
		t.Fatal(err)
	}

	small := Payload{
		Cwd: repo, TargetPath: target, ToolName: "Edit",
		Raw: map[string]any{"tool_input": map[string]any{"new_string": "func A() {\n\treturn\n}"}},
	}
	st := &SessionState{Bounced: map[string]bool{}}
	if d := GateComplexity(cfg, small, st); !d.Deny {
		t.Fatal("a small Go edit should be handed back to the human")
	}

	// Never bounce the same file twice — that would trap the session.
	st2 := &SessionState{Bounced: map[string]bool{target: true}}
	if d := GateComplexity(cfg, small, st2); d.Deny {
		t.Error("an already-bounced file must not be blocked again")
	}
}

func TestComplexityGateIgnoresLargeAndAssistOnlyEdits(t *testing.T) {
	cfg := DefaultConfig()
	repo := t.TempDir()
	if err := os.MkdirAll(filepath.Join(repo, ".git"), 0o755); err != nil {
		t.Fatal(err)
	}

	big := strings.Repeat("line\n", cfg.MaxHandLines+10)
	target := filepath.Join(repo, "big.go")
	if err := os.WriteFile(target, []byte("package x\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	large := Payload{
		Cwd: repo, TargetPath: target, ToolName: "Edit",
		Raw: map[string]any{"tool_input": map[string]any{"new_string": big}},
	}
	if d := GateComplexity(cfg, large, &SessionState{Bounced: map[string]bool{}}); d.Deny {
		t.Error("large changes should stay delegated to the agent")
	}

	yaml := Payload{
		Cwd: repo, TargetPath: filepath.Join(repo, "cfg.yaml"), ToolName: "Write",
		Raw: map[string]any{"tool_input": map[string]any{"content": "a: 1"}},
	}
	if d := GateComplexity(cfg, yaml, &SessionState{Bounced: map[string]bool{}}); d.Deny {
		t.Error("assist-only file types must never bounce")
	}
}

func TestRouteGateBlocksUntilClaimed(t *testing.T) {
	cfg := DefaultConfig()
	p := Payload{ToolName: "Write", TargetPath: "/tmp/a.go"}

	st := &SessionState{Bounced: map[string]bool{}}
	if d := GateRoute(cfg, p, st, nil); !d.Deny {
		t.Fatal("unrouted work must be denied")
	}

	st.Route = &Route{Skill: "code-review", ClaimedAt: time.Now()}
	if d := GateRoute(cfg, p, st, nil); d.Deny {
		t.Error("claimed route should allow work")
	}

	// A stale claim must not authorize new work.
	st.Route = &Route{Skill: "code-review", ClaimedAt: time.Now().Add(-24 * time.Hour)}
	if d := GateRoute(cfg, p, st, nil); !d.Deny {
		t.Error("expired route must be denied")
	}
}

func TestOverrideIsBoundedAndSpent(t *testing.T) {
	cfg := DefaultConfig()
	st := &SessionState{Override: &Override{Reason: "incident", GrantedAt: time.Now()}}

	for i := 0; i < cfg.OverrideMaxUses; i++ {
		if !st.ConsumeOverride(cfg.OverrideMaxUses, cfg.OverrideTTL()) {
			t.Fatalf("override should still be live on use %d", i+1)
		}
	}
	if st.ConsumeOverride(cfg.OverrideMaxUses, cfg.OverrideTTL()) {
		t.Error("override must expire after max uses")
	}

	st.Override = &Override{Reason: "old", GrantedAt: time.Now().Add(-time.Hour)}
	if st.ConsumeOverride(cfg.OverrideMaxUses, cfg.OverrideTTL()) {
		t.Error("expired override must not be honored")
	}
}

func TestPerRepoConfigOverrides(t *testing.T) {
	cfg := DefaultConfig()
	off := false
	lines := 5
	cfg.Repos["throwaway"] = RepoConfig{ComplexityGate: &off, MaxHandLines: &lines}

	got := cfg.ForRepo("/Users/me/src/throwaway")
	if got.ComplexityGate {
		t.Error("per-repo override should disable the complexity gate")
	}
	if got.MaxHandLines != 5 {
		t.Errorf("expected overridden threshold 5, got %d", got.MaxHandLines)
	}
	if other := cfg.ForRepo("/Users/me/src/other"); !other.ComplexityGate {
		t.Error("unrelated repos must keep the global setting")
	}
}

func TestParseDescriptionHandlesFoldedYAML(t *testing.T) {
	folded := "---\nname: x\ndescription: >-\n  First line\n  second line\n---\n# body\n"
	if got := parseDescription(folded); got != "First line second line" {
		t.Errorf("folded description mis-parsed: %q", got)
	}

	plain := "---\nname: x\ndescription: Simple one\n---\n"
	if got := parseDescription(plain); got != "Simple one" {
		t.Errorf("plain description mis-parsed: %q", got)
	}
}

func TestSuggestRanksNameMatchesHighest(t *testing.T) {
	catalog := []Skill{
		{Name: "code-review", Description: "Review a pull request"},
		{Name: "commit-prep", Description: "Prepare a commit message"},
		{Name: "go-patterns", Description: "Go conventions"},
	}
	got := Suggest(catalog, "review a pull request", 2)
	if len(got) == 0 || got[0].Name != "code-review" {
		t.Errorf("expected code-review ranked first, got %+v", got)
	}
}

// verifyCmdFor must produce commands that are valid from the repo root.
// It previously used the basename of an absolute dir, yielding nonsense like
// "go test ./proj" for a file sitting at the repo root.
func TestVerifyCmdIsRepoRelative(t *testing.T) {
	cases := []struct{ rel, want string }{
		{"queue.go", "go test ./..."},
		{"internal/scheduler/queue.go", "go test ./internal/scheduler"},
		{"main.py", "python -m pytest"},
		{"pkg/util.py", "python -m pytest pkg"},
		{"src/app.ts", "npm run typecheck && npm test"},
		{"src/lib.rs", "cargo test"},
	}
	for _, c := range cases {
		if got := verifyCmdFor(c.rel); got != c.want {
			t.Errorf("verifyCmdFor(%q) = %q, want %q", c.rel, got, c.want)
		}
	}
}

// The card must never leak absolute machine paths.
func TestVerifyCmdHasNoAbsolutePaths(t *testing.T) {
	for _, rel := range []string{"queue.go", "internal/x/q.go", "pkg/u.py"} {
		if got := verifyCmdFor(rel); strings.Contains(got, "/Users/") ||
			strings.Contains(got, "/tmp/") || strings.HasPrefix(got, "/") {
			t.Errorf("verifyCmdFor(%q) leaked an absolute path: %q", rel, got)
		}
	}
}
