# Realtime Retrospective Board — Model & Agent Evaluation

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.20789639.svg)](https://doi.org/10.5281/zenodo.20789639)

**🌐 [View the interactive report](https://achintmehta.github.io/retrospective-board-eval/)**

An observational study of **72 agentic code-generation runs**, each implementing the *same* real-time
retrospective-board specification, scored on a 14-criterion functional rubric (42-point scale) and reviewed
for visual quality. The dataset spans multiple model generations (Opus 4.7, Opus 4.6, Sonnet 4.6, Gemini 3.1,
Qwen), two agent harnesses (Claude Code, Antigravity), reasoning-effort levels (High, xHigh, Max), a
screenshot-testing tool (Playwright), and a design-oriented system prompt — with replicate runs of identical
configurations to quantify run-to-run variation.

**Evaluation period:** May–June 2026 · **Runs:** 72 · **Scale:** /42 (14 criteria × 3) · **History:** see [CHANGELOG.md](CHANGELOG.md)

---

## The task

Every run received the same OpenSpec: build a self-hosted, real-time retrospective board with a React/Vite
frontend and a Node.js backend. Requirements:

- Board creation and listing (SQLite persistence)
- Configurable columns per board
- Guest authentication (display name on join)
- Card management with drag-and-drop between columns
- Nested comments on cards
- Real-time sync via WebSockets (Socket.io) across all connected clients
- Single-container Docker deployment
- CSV export
- Developer documentation

Claude Code runs were produced with **Claude Code v2.1.132**, using the `/opsx:apply` command to have the
agent implement the OpenSpec specification.

## Scoring rubric (14 criteria · 42-point scale)

Each of 14 functional criteria is rated **3** (passed first try), **2** (fixed after one prompt), or **1**
(never fully worked). A run's total is the sum of its 14 ratings, recorded in its `EVALUATION_RUBRIC.md`.
*(This 14-criterion / 42-point instrument superseded an earlier 15-criterion / 45-point scale in v2.0; see
[CHANGELOG.md](CHANGELOG.md).)*

---

## Dataset at a glance

| Model family | Runs | Agent(s) | Functional score (mean, range) | Session cost (range) |
|---|---|---|---|---|
| **Claude Opus 4.7** | 36 | Claude Code | 41.4 (39–42) | $2.22–7.63 |
| **Claude Opus 4.6** | 21 | Claude Code, Antigravity | 40.6 (38–42) | $2.04–6.62 |
| **Claude Sonnet 4.6** | 10 | Claude Code, Antigravity | 41.0 (39–42) | $1.08–4.90 |
| **Gemini 3.1 (Pro/Flash)** | 3 | Antigravity | 39.3 (38–40) | — |
| **Qwen (3.6 / Coder Next)** | 2 | Claude Code | 30.5 (24–37) | $41–179 *(orchestration only)* |

Qwen ran locally at no inference charge; the dollar figures are the cost of the Claude orchestration layer
driving the agentic loop, not the Qwen model itself.

## Opus 4.7 effort sweep

A 2 × 3 design — **{High, xHigh} × {base, +Playwright, +design prompt}**, six replicate runs per cell:

| Cell | Mean score | First-try perfect (42/42) | Cost (median) | Aesthetics (mean /5) |
|---|---|---|---|---|
| High · base | 41.0 | 2/6 | $3.06 | 3.0 |
| High · +Playwright | 41.5 | 3/6 | $4.34 | 3.0 |
| High · +design prompt | 40.5 | 0/6 | $4.28 | 4.7 |
| xHigh · base | 42.0 | 6/6 | $3.33 | 3.0 |
| xHigh · +Playwright | 42.0 | 6/6 | $5.59 | 3.0 |
| xHigh · +design prompt | 41.5 | 4/6 | $5.17 | 4.8 |

---

## Key findings

**1. Capability tier dominates everything else.** The frontier models (Opus 4.7/4.6, Sonnet 4.6) all cluster
near the 42-point ceiling (family means ≈ 41); the cheap local model (Qwen) collapses to 24–37 while costing
20–90× more in orchestration. The ~10-point tier gap dwarfs anything tools, prompt, or effort do *within* a
tier (≤ 1–2 points).

**2. The screenshot tool added cost, not quality or reliability.** Turning Playwright on vs. off leaves the
functional score unchanged at both effort levels, while raising cost **+42 % (High) to +68 % (xHigh)** on the
median. Playwright-High runs still failed on Docker — a fault a passive screenshot cannot see. The tool
surfaces rendered-UI issues, not the build/runtime/persistence faults where failures actually live.

**3. Reasoning effort buys first-try reliability.** Pooling the Opus 4.7 cells, the first-try-perfect rate
rises from **28 % at High to 89 % at xHigh**, for only ~10–30 % more cost. The High-level misses are almost
entirely first-run environment failures (npm install, Docker, data persistence) — exactly what more
deliberation catches. The reliability the tool didn't deliver, effort did, at a fraction of the cost.

**4. The design prompt lifts aesthetics, not function.** With the design-oriented system prompt, functional
scores are unchanged, but visual quality jumps: **design-prompt runs average 4.5/5 vs 3.0/5** for non-design
runs. The lift is independent of effort (xHigh base = 3/5, same as High base) and tool — the prompt, not
compute, drives polish. Cost rises +40–55 %.

**5. Within-configuration variability is real but effort-sensitive.** At High effort, identical prompts
scatter 39–42 functionally (and 24–627 lines of source CSS). At xHigh, the functional scatter collapses to a
near-uniform 42 — the variability is largely a symptom of insufficient deliberation.

**6. Docker and npm first-run failures are the dominant defect class.** The recurring culprits: `better-sqlite3`
native compilation in Alpine containers (models that chose `sql.js`/WASM avoided it) and the Express 5 wildcard
(`app.get('*')`) breaking change. Capability and effort catch these; the screenshot tool does not.

## Visual aesthetics

Aesthetics were rated 1–5 from dashboard screenshots. The design-oriented prompt is the single strongest
predictor of visual quality — its runs produced marketing-style hero pages (custom product names, gradient
headlines, "no sign-up" copy), color-coded columns with avatar/emoji chips, and timestamp badges. Without it,
even perfect-scoring implementations produced clean-but-plain default UIs. Notably, **effort does not predict
aesthetics**: xHigh runs scored perfect functionally yet plain visually (3/5) unless the design prompt was present.

## Recommendations

- **For reliable first-shot results:** a frontier model (Opus 4.7 or Sonnet 4.6) at **higher effort** — effort,
  not a UI-testing tool, is what removes first-run failures.
- **Match the resource to the failure mode:** don't add a screenshot tool expecting reliability; the dominant
  failures are build/environment issues a screenshot can't see. Spend on capability and effort instead.
- **Use the design prompt only when you want visual polish** — it adds cost and aesthetics, not correctness.
- **Watch for** `better-sqlite3` and Express 5 as recurring Node.js gotchas.

## Reproducibility

Per-run scores live in each `*/EVALUATION_RUBRIC.md` (total = sum of 14 ratings). Screenshots are under each
run's `images/`. Methodology and version history are in [CHANGELOG.md](CHANGELOG.md) and [CITATION.cff](CITATION.cff);
the dataset is archived on Zenodo (DOI above). The design-oriented system prompt is a third-party artifact and
is intentionally not redistributed.
