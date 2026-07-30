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

// Home is the gate engine's state directory. Everything lives here and
// nothing is ever written into a working repo.
func Home() string {
	if v := os.Getenv("AGENT_GATE_HOME"); v != "" {
		return v
	}
	h, _ := os.UserHomeDir()
	return filepath.Join(h, ".agent-skills")
}

// --- Session state -------------------------------------------------------

// Route is the skill or subagent a session has claimed for its current work.
type Route struct {
	Skill     string    `json:"skill"`
	Intent    string    `json:"intent"`
	ClaimedAt time.Time `json:"claimed_at"`
}

// Override is a logged, time-boxed bypass of the complexity gate.
type Override struct {
	Reason    string    `json:"reason"`
	GrantedAt time.Time `json:"granted_at"`
	// Uses counts how many mutating calls the override has absorbed. It is
	// deliberately small: an override is for one edit, not one afternoon.
	Uses int `json:"uses"`
}

type SessionState struct {
	SessionID string    `json:"session_id"`
	Route     *Route    `json:"route,omitempty"`
	Override  *Override `json:"override,omitempty"`
	Updated   time.Time `json:"updated"`
	// Bounced records paths the complexity gate handed to the human, so it
	// does not bounce the same file twice in a row.
	Bounced map[string]bool `json:"bounced,omitempty"`
}

func statePath(sessionID string) string {
	safe := strings.NewReplacer("/", "_", "..", "_", " ", "_").Replace(sessionID)
	if safe == "" {
		safe = "no-session"
	}
	return filepath.Join(Home(), "state", safe+".json")
}

func LoadState(sessionID string) *SessionState {
	s := &SessionState{SessionID: sessionID, Bounced: map[string]bool{}}
	data, err := os.ReadFile(statePath(sessionID))
	if err != nil {
		return s
	}
	_ = json.Unmarshal(data, s)
	if s.Bounced == nil {
		s.Bounced = map[string]bool{}
	}
	return s
}

func (s *SessionState) Save() error {
	s.Updated = time.Now()
	p := statePath(s.SessionID)
	if err := os.MkdirAll(filepath.Dir(p), 0o755); err != nil {
		return err
	}
	data, err := json.MarshalIndent(s, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(p, data, 0o644)
}

// ActiveRoute returns the claimed route if one is still valid. Routes expire
// so that a claim made hours ago cannot silently authorize new work.
func (s *SessionState) ActiveRoute(ttl time.Duration) *Route {
	if s.Route == nil {
		return nil
	}
	if time.Since(s.Route.ClaimedAt) > ttl {
		return nil
	}
	return s.Route
}

// ConsumeOverride returns true if a live override covers this call, spending
// it in the process.
func (s *SessionState) ConsumeOverride(maxUses int, ttl time.Duration) bool {
	if s.Override == nil {
		return false
	}
	if time.Since(s.Override.GrantedAt) > ttl || s.Override.Uses >= maxUses {
		s.Override = nil
		return false
	}
	s.Override.Uses++
	return true
}

// --- Ledger --------------------------------------------------------------

// LedgerEntry is one append-only record of gate activity. JSONL keeps the
// engine dependency-free and the history trivially greppable.
type LedgerEntry struct {
	Time      time.Time `json:"time"`
	SessionID string    `json:"session_id"`
	Repo      string    `json:"repo"`
	Event     string    `json:"event"`
	Decision  string    `json:"decision"`
	Skill     string    `json:"skill,omitempty"`
	Tool      string    `json:"tool,omitempty"`
	Path      string    `json:"path,omitempty"`
	Reason    string    `json:"reason,omitempty"`
	Lines     int       `json:"lines,omitempty"`
}

func ledgerPath(t time.Time) string {
	return filepath.Join(Home(), "ledger", t.Format("2006-01")+".jsonl")
}

// Log appends an entry. Ledger failures are never fatal — a broken ledger
// must not break the user's editing session.
func Log(e LedgerEntry) {
	if e.Time.IsZero() {
		e.Time = time.Now()
	}
	p := ledgerPath(e.Time)
	if err := os.MkdirAll(filepath.Dir(p), 0o755); err != nil {
		return
	}
	f, err := os.OpenFile(p, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o644)
	if err != nil {
		return
	}
	defer f.Close()
	data, err := json.Marshal(e)
	if err != nil {
		return
	}
	fmt.Fprintln(f, string(data))
}

// ReadLedger returns entries newer than since, across monthly files.
func ReadLedger(since time.Time) ([]LedgerEntry, error) {
	dir := filepath.Join(Home(), "ledger")
	files, err := filepath.Glob(filepath.Join(dir, "*.jsonl"))
	if err != nil {
		return nil, err
	}
	sort.Strings(files)

	var out []LedgerEntry
	for _, f := range files {
		data, err := os.ReadFile(f)
		if err != nil {
			continue
		}
		for _, line := range strings.Split(string(data), "\n") {
			line = strings.TrimSpace(line)
			if line == "" {
				continue
			}
			var e LedgerEntry
			if json.Unmarshal([]byte(line), &e) != nil {
				continue
			}
			if e.Time.After(since) {
				out = append(out, e)
			}
		}
	}
	return out, nil
}
