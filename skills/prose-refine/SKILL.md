---
name: prose-refine
description: Edit draft text to match user voice and target platform (discord, slack, github, email). Use when user asks to refine, clean up, or edit their writing.
disable-model-invocation: true
---

# Prose Refine

Edit user's draft to match their voice and target platform. One pass, no back-and-forth.

## Parameters

| Param | Values | Default |
| ----- | ------ | ------- |
| context | discord, slack, github, email, generic | generic |
| tone | casual, formal | casual |
| output | raw-md, plain | raw-md |

Parse from user: "for discord", "slack thread", "github comment", "email", "make it formal".

## Style rules (always apply)

- No bold, italic, headers, or emoji.
- Preserve user's voice — keep contractions, fragments, informality.
- Don't add punctuation the user didn't use.
- Cut filler words; don't add new ones.
- Never restructure the argument or add points the user didn't make.

## Platform adjustments

| Context | Adjustments |
| ------- | ----------- |
| discord | Short paragraphs. One idea per line break. Only backticks for code. |
| slack | Same as discord. Use `>` for quoting if responding to someone. |
| github | Markdown for code blocks, links, lists. No bold/italic in prose. |
| email | Slightly more structured. Greeting/sign-off only if user included one. |
| generic | No platform-specific adjustments. |

## Output

- raw-md: fenced code block so user can copy.
- plain: return refined text directly.

## Workflow

1. Identify draft text and target context/tone.
2. Apply style rules + platform adjustments.
3. Return refined version. Nothing else — no explanations, no "here's what I changed".
