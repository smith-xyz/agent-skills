---
name: arxiv-ai-scan
description: Run arxiv-search.py (via arxiv-search.sh); return stdout to the user.
---

# arXiv AI scan

From this skill directory:

```bash
./scripts/arxiv-search.sh [--days N] [--max N] [--categories a,b] [--focus PRESET|"free text"] [kw ...]
```

Defaults: `--days 7`, `--max 30`, `--categories cs.AI,cs.LG,cs.CL`. Remaining tokens = keywords (AND). "Past week" -> `--days 7`; "last N days" -> `--days N`.

`--focus` replaces positional keywords with curated search terms. Presets:

| Preset | Keywords used |
| ------ | ------------- |
| `context-files` | context file, AGENTS.md, instruction following, grounding |
| `agent-reliability` | agent reliability, tool use, planning, evaluation benchmark |
| `llm-security` | LLM security, prompt injection, jailbreak, adversarial |
| `rag` | retrieval augmented generation, RAG, knowledge grounding |
| `code-generation` | code generation, program synthesis, code completion |

Freeform: `--focus "context files LLM efficacy"` splits on spaces and uses each as a keyword.

| User says | Run |
| --------- | --- |
| What's new on arXiv in AI this week? | `./scripts/arxiv-search.sh --days 7` |
| Last 3 days about RAG and security, max 15 | `./scripts/arxiv-search.sh --days 3 --max 15 RAG security` |
| LLM security from cs.CR and cs.AI, last 14 days | `./scripts/arxiv-search.sh --days 14 --categories cs.CR,cs.AI LLM security` |
| Anything on context file efficacy, last 14 days | `./scripts/arxiv-search.sh --days 14 --focus context-files` |
| Agent reliability research this month | `./scripts/arxiv-search.sh --days 30 --focus agent-reliability` |

`arxiv-search.sh` invokes `arxiv-search.py`. On failure (e.g. no network), user runs the same in a terminal and pastes output.
