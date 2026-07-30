package main

import (
	"encoding/json"
	"io"
	"os"
	"path/filepath"
	"strings"
)

// Event is the normalized lifecycle event name. Vendors spell these
// differently; normalizeEvent maps them all onto these constants.
type Event string

const (
	EvSessionStart Event = "SessionStart"
	EvUserPrompt   Event = "UserPromptSubmit"
	EvPreTool      Event = "PreToolUse"
	EvPostTool     Event = "PostToolUse"
	EvStop         Event = "Stop"
	EvUnknown      Event = "Unknown"
)

// Payload is the vendor-neutral view of a hook invocation.
type Payload struct {
	Event     Event
	SessionID string
	Cwd       string
	Prompt    string
	ToolName  string
	// TargetPath is the file a mutating tool intends to write, when known.
	TargetPath string
	// Command is the shell command for terminal tools, when known.
	Command string
	Raw     map[string]any
}

// rawPayload covers the union of Claude Code, VS Code and Cursor field
// spellings. Vendors disagree on casing and nesting, so we accept all of them
// and pick whichever is populated.
type rawPayload struct {
	HookEventName string         `json:"hook_event_name"`
	HookEventAlt  string         `json:"hookEventName"`
	EventName     string         `json:"event"`
	SessionID     string         `json:"session_id"`
	SessionIDAlt  string         `json:"sessionId"`
	Cwd           string         `json:"cwd"`
	WorkspacePath string         `json:"workspace_path"`
	Prompt        string         `json:"prompt"`
	UserPrompt    string         `json:"user_prompt"`
	ToolName      string         `json:"tool_name"`
	ToolNameAlt   string         `json:"toolName"`
	ToolInput     map[string]any `json:"tool_input"`
	ToolInputAlt  map[string]any `json:"toolInput"`
	Command       string         `json:"command"`
}

func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if v != "" {
			return v
		}
	}
	return ""
}

func normalizeEvent(s string) Event {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "sessionstart":
		return EvSessionStart
	case "userpromptsubmit", "beforesubmitprompt":
		return EvUserPrompt
	case "pretooluse", "beforeshellexecution", "beforemcpexecution":
		return EvPreTool
	case "posttooluse", "afterfileedit", "aftershellexecution":
		return EvPostTool
	case "stop", "subagentstop":
		return EvStop
	}
	return EvUnknown
}

// ParsePayload reads a hook payload from r. It never fails hard: a malformed
// payload yields an Unknown event, which every gate treats as allow.
func ParsePayload(r io.Reader, eventOverride string) Payload {
	p := Payload{Event: EvUnknown, Raw: map[string]any{}}

	data, err := io.ReadAll(r)
	if err != nil || len(strings.TrimSpace(string(data))) == 0 {
		p.Event = normalizeEvent(eventOverride)
		return p
	}

	var raw rawPayload
	_ = json.Unmarshal(data, &raw)
	_ = json.Unmarshal(data, &p.Raw)

	// An explicit CLI arg wins: VS Code ignores matchers and fires every hook
	// on every event, so the wiring passes the event it registered for.
	ev := firstNonEmpty(eventOverride, raw.HookEventName, raw.HookEventAlt, raw.EventName)
	p.Event = normalizeEvent(ev)

	p.SessionID = firstNonEmpty(raw.SessionID, raw.SessionIDAlt, "no-session")
	p.Cwd = firstNonEmpty(raw.Cwd, raw.WorkspacePath)
	p.Prompt = firstNonEmpty(raw.Prompt, raw.UserPrompt)
	p.ToolName = firstNonEmpty(raw.ToolName, raw.ToolNameAlt)

	input := raw.ToolInput
	if input == nil {
		input = raw.ToolInputAlt
	}
	p.TargetPath = extractPath(input)
	p.Command = firstNonEmpty(extractString(input, "command"), raw.Command)

	return p
}

func extractString(m map[string]any, keys ...string) string {
	if m == nil {
		return ""
	}
	for _, k := range keys {
		if v, ok := m[k]; ok {
			if s, ok := v.(string); ok && s != "" {
				return s
			}
		}
	}
	return ""
}

// extractPath finds the target file across the many key names vendors use.
func extractPath(m map[string]any) string {
	if m == nil {
		return ""
	}
	if s := extractString(m, "file_path", "filePath", "path", "target_file", "notebook_path"); s != "" {
		return s
	}
	// OpenCode apply_patch embeds paths in marker lines inside patchText.
	if s := pathFromPatchText(extractString(m, "patchText", "patch_text")); s != "" {
		return s
	}
	// VS Code editFiles passes a list.
	for _, k := range []string{"files", "filePaths"} {
		if v, ok := m[k]; ok {
			if arr, ok := v.([]any); ok && len(arr) > 0 {
				if s, ok := arr[0].(string); ok {
					return s
				}
			}
		}
	}
	return ""
}

// pathFromPatchText pulls the first path from OpenCode apply_patch markers.
func pathFromPatchText(patch string) string {
	for _, line := range strings.Split(patch, "\n") {
		for _, prefix := range []string{
			"*** Add File: ", "*** Update File: ", "*** Delete File: ", "*** Move to: ",
		} {
			if strings.HasPrefix(line, prefix) {
				return strings.TrimSpace(strings.TrimPrefix(line, prefix))
			}
		}
	}
	return ""
}

// mutatingTools are the exact tool names known to write to disk, across all
// supported vendors.
var mutatingTools = map[string]bool{
	// Claude Code / OpenCode
	"write": true, "edit": true, "multiedit": true, "notebookedit": true,
	// OpenCode patch tool (underscore form; VS Code uses applypatch)
	"apply_patch": true,
	// VS Code Copilot
	"editfiles": true, "createfile": true, "applypatch": true, "insertedit": true,
	"createdirectory": true, "editnotebook": true,
	// Cursor
	"searchreplace": true, "deletefile": true,
}

// IsMutating reports whether this tool call can modify the workspace.
// Shell tools count only when the command itself looks like a write, so that
// running tests or greps stays frictionless.
func (p Payload) IsMutating() bool {
	name := strings.ToLower(strings.TrimSpace(p.ToolName))
	if name == "" {
		return false
	}
	if mutatingTools[name] {
		return true
	}
	if isShellTool(name) {
		return commandWrites(p.Command)
	}
	return false
}

func isShellTool(name string) bool {
	switch name {
	case "bash", "shell", "runterminalcommand", "runincreateterminal",
		"run_in_terminal", "runcommands", "terminal":
		return true
	}
	return strings.Contains(name, "terminal") || strings.Contains(name, "shell")
}

// writeCommands are shell verbs that mutate the tree. Read-only work (tests,
// builds, git status, grep) is deliberately absent so it never trips a gate.
var writeCommands = []string{
	"rm ", "mv ", "cp ", "touch ", "mkdir ", "tee ", "truncate ",
	"sed -i", "git apply", "git checkout", "git reset", "git clean",
	"git commit", "git merge", "git rebase", "patch ",
}

func commandWrites(cmd string) bool {
	c := strings.ToLower(strings.TrimSpace(cmd))
	if c == "" {
		return false
	}
	// Redirections write.
	if strings.Contains(c, ">>") || regexpRedirect(c) {
		return true
	}
	for _, w := range writeCommands {
		if strings.HasPrefix(c, w) || strings.Contains(c, "&& "+w) ||
			strings.Contains(c, "; "+w) || strings.Contains(c, "| "+w) {
			return true
		}
	}
	return false
}

// regexpRedirect spots a `>` that is a redirect rather than a comparison or
// part of `2>&1`/`->`.
func regexpRedirect(c string) bool {
	for i := 0; i < len(c); i++ {
		if c[i] != '>' {
			continue
		}
		if i > 0 && (c[i-1] == '-' || c[i-1] == '=' || c[i-1] == '>') {
			continue
		}
		if i+1 < len(c) && c[i+1] == '&' {
			continue
		}
		return true
	}
	return false
}

// RepoRoot resolves the git repository containing the target file, falling
// back to the cwd. Resolving from the *target path* rather than the process
// cwd is what makes gates work inside a monorepo-style workspace where many
// unrelated repos are open at once.
func (p Payload) RepoRoot() string {
	start := p.TargetPath
	if start == "" {
		start = p.Cwd
	}
	if start == "" {
		start, _ = os.Getwd()
	}
	if start == "" {
		return ""
	}
	if !filepath.IsAbs(start) && p.Cwd != "" {
		start = filepath.Join(p.Cwd, start)
	}

	dir := start
	if fi, err := os.Stat(dir); err != nil || !fi.IsDir() {
		dir = filepath.Dir(dir)
	}
	for {
		if _, err := os.Stat(filepath.Join(dir, ".git")); err == nil {
			return dir
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return ""
		}
		dir = parent
	}
}
