# Realtime Retrospective Board — Model & Agent Evaluation

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.20789639.svg)](https://doi.org/10.5281/zenodo.20789639)

**🌐 [View the interactive report](https://achintmehta.github.io/retrospective-board-eval/)**

A matched, replicated comparison of **90 agentic code-generation runs**, each implementing the *same*
real-time retrospective-board specification, scored on a 14-criterion functional rubric (42-point
scale) and characterised for visual design treatment. The dataset spans several model generations
(Claude Opus 4.7, Opus 4.6, Sonnet 4.6, Gemini 3.1, Qwen), two agent harnesses (Claude Code CLI and
Antigravity), reasoning-effort levels (High and xHigh, plus single Max and Low runs), a visual
automation and testing tool (the Playwright MCP server), and a design-oriented prompt condition (a
third-party agent prompt, which is not redistributed, and a one-paragraph paraphrase of its design
directive, which is) — with six or seven repeated runs of identical configurations to quantify
run-to-run variation. Conditions were chosen rather than randomised.

**Evaluation period:** May–July 2026 · **Runs:** 90 · **Scale:** /42 (14 criteria × 3) ·
**History:** see [CHANGELOG.md](CHANGELOG.md) · **Analysis code:** see [analysis/](analysis/README.md)

---

## The task

Every run received the same OpenSpec change: build a self-hosted, real-time retrospective board with a
React/Vite frontend and a Node.js backend. Requirements:

- Board creation and listing (SQLite persistence)
- Configurable columns per board
- Guest sign-in (display name on join)
- Card management with drag-and-drop between columns
- Nested comments on cards
- Real-time sync via WebSockets (Socket.io) across all connected clients
- Single-container Docker deployment
- CSV export
- Developer documentation

The specification is identical in all 90 run folders (`<run>/openspec/`). Claude Code runs were
produced with **Claude Code CLI v2.1.132** using the `/opsx:apply realtime-retro-board` command, zero
shot. Antigravity runs used that agent's own harness and injected system prompt.

## Conditions

| Factor | Levels |
|---|---|
| Model | Claude Opus 4.7, Opus 4.6, Sonnet 4.6 (Claude Code and Antigravity); Gemini 3.1 Pro and Flash (Antigravity); Qwen 3.6 and Qwen Coder Next (local models through Claude Code) |
| Reasoning effort | High; xHigh (Opus 4.7 only); one Sonnet 4.6 run at Max; Gemini 3.1 Pro at high and low |
| Testing tool | none, or the Playwright MCP server available to the agent (folders `*_with_playwright_*`); every tool-enabled run's rubric records whether the tool was invoked |
| Design prompt | none; the full third-party Antigravity system prompt supplied as the project's `CLAUDE.md` (folders `*_with_antigravity_prompt*`); or a one-paragraph paraphrase of its design directive supplied the same way (folders `*_abridged_prompt*`, text in [analysis/abridged_design_prompt.md](analysis/abridged_design_prompt.md)) |

The full Antigravity prompt is third-party material and is not redistributed; the Antigravity-harness
runs carry it by construction. Neither harness's own hidden system prompt is redistributed either.

## Scoring rubric (14 criteria · 42-point scale)

Each of 14 functional criteria is rated **3** (passed first try), **2** (failed first, fixed after
one corrective prompt that described only the observed error), or **1** (never fully resolved). A
run's total is the sum of its 14 ratings, recorded in its `EVALUATION_RUBRIC.md`, which also preserves
the harness's end-of-session cost, time, token and lines-changed report. *(This 14-criterion /
42-point instrument superseded an earlier 15-criterion / 45-point scale in v2.0; all runs were
re-scored under it; see [CHANGELOG.md](CHANGELOG.md).)* The blank rubric is in
`template_directory/`.

---

## Dataset at a glance

| Harness | Model family | Runs | Functional score (mean, range) | Session cost (range) |
|---|---|---|---|---|
| Claude Code | **Claude Opus 4.7** | 48 | 41.3 (39–42) | $2.22–7.63 |
| Claude Code | **Claude Opus 4.6** | 26 | 40.7 (38–42) | $2.04–6.62 |
| Claude Code | **Claude Sonnet 4.6** | 9 | 40.9 (39–42) | $1.08–4.90 |
| Claude Code | **Qwen (3.6 / Coder Next)** | 2 | 30.5 (24–37) | $41–179 *(see note)* |
| Antigravity | **Claude Opus 4.6** | 1 | 40.0 | not recorded |
| Antigravity | **Claude Sonnet 4.6** | 1 | 42.0 | not recorded |
| Antigravity | **Gemini 3.1 (Pro high, Pro low, Flash)** | 3 | 39.3 (38–40) | not recorded |

Cost is the session cost reported by Claude Code CLI's `/cost` command, which estimates a dollar
amount from token counts at per-token model prices. The Qwen models ran locally, where inference
costs nothing at the margin; the harness priced their token volume at the hosted-model rate under
which it reported the usage (the rubric's usage lines show the alias), so the Qwen figures are a
token-volume estimate, not a price paid. The Antigravity harness does not report session cost.

## Opus 4.7 effort grid

A 2 × 4 design — **{High, xHigh} × {base, +Playwright, +full design prompt, +abridged design
prompt}**, six replicate runs per cell. The abridged cells were added later as an ablation and are
kept out of the pooled effort contrast below.

| Cell | Mean score | First-try perfect (42/42, no corrective prompt) | Cost (median) | Visual rating (mean /5) |
|---|---|---|---|---|
| High · base | 41.0 | 2/6 | $3.06 | 3.0 |
| High · +Playwright | 41.5 | 3/6 | $4.34 | 3.0 |
| High · +full design prompt | 40.5 | 0/6 | $4.28 | 4.8 |
| High · +abridged design prompt | 40.8 | 1/6 | $4.14 | 5.0 |
| xHigh · base | 42.0 | 6/6 | $3.33 | 3.0 |
| xHigh · +Playwright | 42.0 | 6/6 | $5.59 | 3.0 |
| xHigh · +full design prompt | 41.5 | 4/6 | $5.17 | 4.8 |
| xHigh · +abridged design prompt | 41.0 | 1/6 | $4.73 | 5.0 |

---

## Key findings

**1. Capability tier dominates everything else.** The frontier models (Opus 4.7, Opus 4.6,
Sonnet 4.6) all cluster near the 42-point ceiling (family means ≈ 41). The two local Qwen models
score 37 and 24, roughly ten points below, with `/cost` token-volume estimates twelve to fifty times
the frontier median of about $3.60. The tier gap dwarfs anything tools, prompt or effort do *within*
a tier (≤ 1–2 points on the total).

**2. Run totals conceal first-try reliability.** Because a criterion fixed after one corrective
prompt still earns 2 of 3 points, family means less than a point apart hide large differences on the
first attempt. Docker deployment, the dominant defect, failed first try in 40 of 90 runs (44 %); its
first-try pass rate rose from 19 % (5 of 26) on Opus 4.6 High to 75 % (18 of 24) on Opus 4.7 High
(Fisher exact p = 0.00016), while first-try failures on the local development environment moved the
other way (1 of 26 → 10 of 24). The two environment criteria account for 55 of the 100 first-try
criterion failures in the dataset.

**3. The testing tool added cost, not quality or reliability.** With model and effort fixed,
Playwright left the functional score unchanged while raising the median cost by 42 % (Opus 4.7 High),
68 % (Opus 4.7 xHigh) and 27 % (Opus 4.6 High). Every tool-enabled run invoked the tool. The token
records show the premium is context re-reading — median cache-read tokens rise from 2.3 M to 5.3 M
(High) and 7.0 M (xHigh) while output tokens stay flat — and tool-enabled runs still failed on Docker
builds, which a browser tool cannot see.

**4. Reasoning effort buys first-try reliability.** Pooling the six Opus 4.7 sweep cells, the
first-try-perfect rate rises from **28 % at High (5 of 18) to 89 % at xHigh (16 of 18)** (Fisher exact
p = 0.00049; risk difference 61 percentage points, 95 % CI 29 to 78), corrective prompts fall from 16
to 3, and the median cost premium is 9 % (base), 29 % (+Playwright) and 21 % (+design prompt).

**5. The design prompt changes what is built, not how well it works.** None of the 45 Claude Code
runs without a design prompt shipped a CSS gradient, a keyframe animation, a Google Fonts import or a
named display face; all 40 prompted runs shipped all four, defined about three times as many CSS
custom properties, and wrote about three times as much CSS
([analysis/design_markers.csv](analysis/design_markers.csv)). The holistic visual rating agrees:
every unprompted Claude Code run was rated 3 and every prompted run 4 or 5. Functional scores were
unchanged within run-to-run variation, but the prompt costs first-try reliability, concentrated on
drag-and-drop (11 of 40 prompted runs missed it first try against 5 of 45), and the cost persists at
xHigh. A one-paragraph paraphrase of the directive reproduces both the features and the functional
price, so neither the third-party prompt's length nor its tone is needed.

**6. Within-configuration variability is real but effort-sensitive.** Seven identical Opus 4.6 High
base runs scattered from 38 to 42 functionally, 10–17 source files, and 41–626 lines of hand-written
CSS. On Opus 4.7 the structural spread narrowed on its own (273–395 CSS lines at High) while functional
scores still scattered 39–42; at xHigh they were a uniform 42.

**7. Docker and npm first-run failures are the dominant defect class.** The recurring culprits are
`better-sqlite3` native compilation in minimal containers (runs that chose `sql.js`/WASM avoided it)
and the Express 5 change that removed the `app.get('*')` wildcard route. Capability and effort catch
these; a browser-testing tool does not.

## Visual design treatment

Two independent measures are provided. `analysis/design_markers.csv` counts, from each run's shipped
source, the features the design directive names and technique-agnostic styling-effort measures; it
needs no judge and is fully reproducible. `analysis/aesthetic_ratings.csv` holds a holistic 1–5
rating per run produced by a large language model (Claude Opus 4.8) from the archived dashboard
screenshots and reviewed by the author; it was not blinded to condition, and
[analysis/VISUAL_RATING_INSTRUMENT.md](analysis/VISUAL_RATING_INSTRUMENT.md) documents how it was
produced, the anchors as applied, and its limits. The two agree in all 85 Claude Code runs. Every
run's dashboard screenshots are under `<run>/images/`, so any reader can form an independent view.

## Recommendations

- **For reliable first-shot results:** a frontier model at higher effort. Effort, not a
  browser-testing tool, is what removed first-run failures here.
- **Match the resource to the failure mode:** the dominant failures were build and environment
  faults a screenshot cannot see; spend on capability and effort, or on a tool aimed at the build.
- **Ask for visual quality explicitly** — a paragraph of project instructions is enough — and budget
  for the small functional risk it carries in the most interaction-heavy features.
- **Watch for** `better-sqlite3` and Express 5 as recurring Node.js gotchas.

## Reproducibility

Per-run scores live in each `<run>/EVALUATION_RUBRIC.md` (total = sum of 14 ratings), with the
harness's end-of-session report preserved below the table. Screenshots are under each run's
`images/`. The [analysis/](analysis/README.md) folder contains the scripts that recompute every
number in the paper from these files, rebuild the supplemental tables and regenerate the figures;
`analysis/manuscript_numbers_derivation.md` shows the arithmetic behind each reported value.
Methodology and version history are in [CHANGELOG.md](CHANGELOG.md); the dataset is archived on
Zenodo (DOI above). The Antigravity design-oriented system prompt is a third-party artifact and is
intentionally not redistributed; the abridged paraphrase written for this study is published in
`analysis/abridged_design_prompt.md`.

## Citing

Dataset: Mehta A. 2026. *Realtime retrospective board: AI model benchmark dataset and evaluation
artifacts.* Zenodo. https://doi.org/10.5281/zenodo.20789639 (concept DOI; each release has its own
version DOI). See [CITATION.cff](CITATION.cff).

Paper: Mehta A. *Reasoning effort, not tool access, buys first-try reliability in agentic code
generation: evidence from 90 matched agent runs.* Submitted to PeerJ Computer Science, 2026. The
citation will be updated on publication.
