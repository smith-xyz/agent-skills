package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

// Config controls the gates. JSON rather than TOML so the binary keeps zero
// dependencies. Written to ~/.agent-skills/gates.json on first run.
type Config struct {
	// Enabled master-switches the blocking gates. Logging continues either way.
	Enabled bool `json:"enabled"`
	// RouteGate denies mutating tools until a skill/subagent is claimed.
	RouteGate bool `json:"route_gate"`
	// ComplexityGate hands small, sharpening-value edits back to the human.
	ComplexityGate bool `json:"complexity_gate"`
	// ContainmentGate confines agent-authored markdown to .agent/.
	ContainmentGate bool `json:"containment_gate"`

	// RouteTTLMinutes bounds how long a claimed route authorizes work.
	RouteTTLMinutes int `json:"route_ttl_minutes"`
	// OverrideTTLMinutes and OverrideMaxUses bound an escape hatch.
	OverrideTTLMinutes int `json:"override_ttl_minutes"`
	OverrideMaxUses    int `json:"override_max_uses"`

	// Sharpen lists file extensions you want to keep hand-writing.
	Sharpen []string `json:"sharpen"`
	// AssistOnly lists extensions the complexity gate ignores entirely
	// (config, docs, generated formats — no muscle memory at stake).
	AssistOnly []string `json:"assist_only"`

	// MaxHandLines is the edit size below which a sharpen-language change is
	// bounced back to you. Above it, the agent may proceed.
	MaxHandLines int `json:"max_hand_lines"`

	// Repos holds per-repository overrides, keyed by repo basename or path.
	Repos map[string]RepoConfig `json:"repos"`
}

// RepoConfig overrides global settings for one repository. Pointer fields
// distinguish "unset" from "explicitly false".
type RepoConfig struct {
	ComplexityGate *bool    `json:"complexity_gate,omitempty"`
	RouteGate      *bool    `json:"route_gate,omitempty"`
	Sharpen        []string `json:"sharpen,omitempty"`
	MaxHandLines   *int     `json:"max_hand_lines,omitempty"`
}

func DefaultConfig() Config {
	return Config{
		Enabled:            true,
		RouteGate:          true,
		ComplexityGate:     true,
		ContainmentGate:    true,
		RouteTTLMinutes:    120,
		OverrideTTLMinutes: 15,
		OverrideMaxUses:    3,
		Sharpen:            []string{".go", ".rs", ".ts", ".tsx", ".py"},
		AssistOnly: []string{
			".md", ".json", ".yaml", ".yml", ".toml", ".lock", ".txt",
			".sum", ".mod", ".cfg", ".ini", ".env", ".sql", ".csv",
		},
		MaxHandLines: 40,
		Repos:        map[string]RepoConfig{},
	}
}

func configPath() string { return filepath.Join(Home(), "gates.json") }

// LoadConfig reads config, writing defaults on first run. A malformed config
// falls back to defaults rather than failing closed.
func LoadConfig() Config {
	cfg := DefaultConfig()
	data, err := os.ReadFile(configPath())
	if err != nil {
		_ = SaveConfig(cfg)
		return cfg
	}
	if json.Unmarshal(data, &cfg) != nil {
		return DefaultConfig()
	}
	if cfg.Repos == nil {
		cfg.Repos = map[string]RepoConfig{}
	}
	return cfg
}

func SaveConfig(cfg Config) error {
	if err := os.MkdirAll(Home(), 0o755); err != nil {
		return err
	}
	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(configPath(), data, 0o644)
}

// ForRepo returns the effective config for a repository, applying overrides.
func (c Config) ForRepo(repo string) Config {
	if repo == "" {
		return c
	}
	oc, ok := c.Repos[filepath.Base(repo)]
	if !ok {
		if oc, ok = c.Repos[repo]; !ok {
			return c
		}
	}
	out := c
	if oc.ComplexityGate != nil {
		out.ComplexityGate = *oc.ComplexityGate
	}
	if oc.RouteGate != nil {
		out.RouteGate = *oc.RouteGate
	}
	if len(oc.Sharpen) > 0 {
		out.Sharpen = oc.Sharpen
	}
	if oc.MaxHandLines != nil {
		out.MaxHandLines = *oc.MaxHandLines
	}
	return out
}

func (c Config) RouteTTL() time.Duration {
	return time.Duration(c.RouteTTLMinutes) * time.Minute
}

func (c Config) OverrideTTL() time.Duration {
	return time.Duration(c.OverrideTTLMinutes) * time.Minute
}

func (c Config) IsSharpen(path string) bool {
	ext := strings.ToLower(filepath.Ext(path))
	for _, e := range c.Sharpen {
		if strings.EqualFold(e, ext) {
			return true
		}
	}
	return false
}

func (c Config) IsAssistOnly(path string) bool {
	ext := strings.ToLower(filepath.Ext(path))
	for _, e := range c.AssistOnly {
		if strings.EqualFold(e, ext) {
			return true
		}
	}
	return false
}

// --- Skill catalog -------------------------------------------------------

type Skill struct {
	Name        string
	Description string
	Source      string
	Path        string
}

// skillDirs are the locations every supported vendor reads skills from.
func skillDirs() []string {
	h, _ := os.UserHomeDir()
	dirs := []string{
		filepath.Join(h, ".claude", "skills"),
		filepath.Join(h, ".copilot", "skills"),
		filepath.Join(h, ".cursor", "skills"),
		filepath.Join(h, ".agents", "skills"),
		filepath.Join(h, ".config", "opencode", "skills"),
	}
	if cwd, err := os.Getwd(); err == nil {
		dirs = append(dirs,
			filepath.Join(cwd, ".github", "skills"),
			filepath.Join(cwd, ".claude", "skills"),
		)
	}
	return dirs
}

// LoadCatalog discovers installed skills, de-duplicated by name.
func LoadCatalog() []Skill {
	seen := map[string]Skill{}
	for _, dir := range skillDirs() {
		entries, err := os.ReadDir(dir)
		if err != nil {
			continue
		}
		for _, e := range entries {
			name := e.Name()
			if strings.HasPrefix(name, ".") {
				continue
			}
			path := filepath.Join(dir, name, "SKILL.md")
			data, err := os.ReadFile(path)
			if err != nil {
				continue
			}
			if _, dup := seen[name]; dup {
				continue
			}
			seen[name] = Skill{
				Name:        name,
				Description: parseDescription(string(data)),
				Source:      dir,
				Path:        path,
			}
		}
	}

	out := make([]Skill, 0, len(seen))
	for _, s := range seen {
		out = append(out, s)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Name < out[j].Name })
	return out
}

// parseDescription pulls `description:` out of SKILL.md frontmatter,
// including YAML folded (`>-`) blocks.
func parseDescription(body string) string {
	lines := strings.Split(body, "\n")
	if len(lines) == 0 || strings.TrimSpace(lines[0]) != "---" {
		return ""
	}
	var desc []string
	collecting := false
	for _, ln := range lines[1:] {
		trimmed := strings.TrimSpace(ln)
		if trimmed == "---" {
			break
		}
		if collecting {
			// Continuation lines of a folded block are indented.
			if ln != "" && (strings.HasPrefix(ln, "  ") || strings.HasPrefix(ln, "\t")) {
				desc = append(desc, trimmed)
				continue
			}
			break
		}
		if strings.HasPrefix(trimmed, "description:") {
			v := strings.TrimSpace(strings.TrimPrefix(trimmed, "description:"))
			if v == ">-" || v == ">" || v == "|" || v == "|-" {
				collecting = true
				continue
			}
			desc = append(desc, v)
			collecting = true
		}
	}
	return strings.Trim(strings.Join(desc, " "), `"' `)
}

// Suggest returns catalog entries whose name or description best matches a
// free-text claim, so a rejected route can point somewhere useful.
func Suggest(catalog []Skill, query string, limit int) []Skill {
	q := strings.ToLower(strings.TrimSpace(query))
	if q == "" {
		return nil
	}
	words := strings.FieldsFunc(q, func(r rune) bool {
		return !('a' <= r && r <= 'z') && !('0' <= r && r <= '9')
	})

	type scored struct {
		s Skill
		n int
	}
	var ranked []scored
	for _, s := range catalog {
		hay := strings.ToLower(s.Name + " " + s.Description)
		n := 0
		for _, w := range words {
			if len(w) < 3 {
				continue
			}
			if strings.Contains(hay, w) {
				n++
			}
			if strings.Contains(strings.ToLower(s.Name), w) {
				n += 2
			}
		}
		if n > 0 {
			ranked = append(ranked, scored{s, n})
		}
	}
	sort.SliceStable(ranked, func(i, j int) bool { return ranked[i].n > ranked[j].n })

	var out []Skill
	for i, r := range ranked {
		if i >= limit {
			break
		}
		out = append(out, r.s)
	}
	return out
}
