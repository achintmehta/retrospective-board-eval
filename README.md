# Realtime Retrospective Board — Model & Agent Evaluation

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.20789639.svg)](https://doi.org/10.5281/zenodo.20789639)

**🌐 [View the interactive report](https://achintmehta.github.io/retrospective-board-eval/)**

## Description

A matched, replicated comparison of **90 agentic code-generation runs**, each implementing the *same*
real-time retrospective-board specification, scored on a 14-criterion functional rubric (42-point
scale) and characterised for visual design treatment. The dataset spans several model generations
(Claude Opus 4.7, Opus 4.6, Sonnet 4.6, Gemini 3.1, Qwen), two agent harnesses (Claude Code CLI and
Antigravity), reasoning-effort levels (High and xHigh, plus single Max and Low runs), a visual
automation and testing tool (the Playwright MCP server), and a design-oriented prompt condition (a
third-party agent prompt, which is not redistributed, and a one-paragraph paraphrase of its design
directive, which is) — with six or seven repeated runs of identical configurations to quantify
run-to-run variation. Conditions were chosen rather than randomised.

The repository holds three things under one DOI: the **dataset** (every run's delivered source,
screenshots, specification and scored rubric), the **analysis code** that recomputes every number in
the accompanying paper from those files, and the **derived tables and figures** the code produces.

**Evaluation period:** May–July 2026 · **Runs:** 90 · **Scale:** /42 (14 criteria × 3) ·
**History:** see [CHANGELOG.md](CHANGELOG.md) · **Analysis code:** see [analysis/](analysis/README.md)

---

## Dataset information

### Run folders

Each of the 90 run folders is one agent session that received the specification and delivered an
application. Folder names encode the configuration:

    <harness>_<model>_<effort>[_with_playwright][_with_antigravity_prompt | _abridged_prompt][_run_N]

`claude_*` folders are Claude Code CLI runs, `antigravity_*` folders are Antigravity-agent runs;
`_with_playwright` marks runs with the testing tool available; `_with_antigravity_prompt` marks runs
given the full third-party design prompt as the project's `CLAUDE.md`; `_abridged_prompt` marks runs
given the one-paragraph paraphrase instead; `_run_N` distinguishes repeated runs of one configuration
(the first run of a configuration carries no suffix). Example:
`claude_opus_4.7_xhigh_with_antigravity_prompt_run_2`.

Every run folder contains:

| Path | Content |
|---|---|
| `EVALUATION_RUBRIC.md` | The scored rubric: model, harness, effort, testing tool and whether it was invoked in the header; the 14 criterion ratings (3/2/1) with pass/fail status and notes; the run total; and, below the table, the harness's end-of-session report (session cost, model time, lines added and removed, token usage by model) preserved verbatim. |
| `openspec/` | The OpenSpec change the agent received (`proposal.md`, `design.md`, `specs/*/spec.md`, `tasks.md`). Byte-identical across all 90 runs apart from the checkbox marks the agent adds to `tasks.md`; SHA-256 hashes are listed in the paper's Article S1. |
| `images/` | Screenshots taken during verification: `MainDashboard.png` (the landing page) and `RetroBoard.png` (a board with cards), the inputs to the visual rating and to Figures 5 and S1. |
| `client/`, `src/`, `Dockerfile`, `package.json`, `docs/`, `README.md`, … | The application exactly as the agent delivered it after the session, including any corrective-prompt fixes. Dependencies (`node_modules/`), build output (`dist/`) and runtime databases (`data/`) are not archived; the delivered `package.json` and lock file reproduce them. |

The `*_with_antigravity_prompt*` runs received the third-party prompt through a `CLAUDE.md` file;
that file is excluded from every folder because the prompt is not redistributed (see
*License* below). The `_abridged_prompt` runs' `CLAUDE.md` is the text published in
[analysis/abridged_design_prompt.md](analysis/abridged_design_prompt.md).

### Top-level files

| Path | Content |
|---|---|
| `template_directory/` | The blank rubric, the specification and an empty `images/` folder: the starting state of every run. |
| `aesthetic_facet_ratings.csv` | Per-run visual ratings on four facets plus the holistic rating (1–5). |
| `analysis/aesthetic_ratings.csv` | The holistic visual rating per run, the column used by the analysis scripts. |
| `analysis/design_markers.csv` / `.xlsx` | Per-run design-treatment measures counted from each run's shipped source (Table S3 of the paper). |
| `analysis/S1_Table.xlsx` / `.docx` | The per-run data table (Table S1): configuration, score, cost, rating and the 14 criterion ratings. |
| `analysis/manuscript_numbers_derivation.md` | Every number quoted in the paper, recomputed with the arithmetic shown (Article S1). |
| `analysis/VISUAL_RATING_INSTRUMENT.md` | How the visual ratings were produced, the scale anchors as applied and per-run notes (Article S3). |
| `index.html` | The interactive report (generated by `gen_report.py`), also served at the link above. |
| `CHANGELOG.md` | Version history and methodology notes, including the rubric finalisation at v2.0.0. |
| `CITATION.cff`, `LICENSE` | Citation metadata and the MIT licence. |

## Code information

All analysis code is in [analysis/](analysis/README.md); each script locates the dataset
automatically when run from that folder (set `REPO` to point elsewhere).

| Script | What it does | Output |
|---|---|---|
| `analysis/derive_manuscript_numbers.py` | Parses every `EVALUATION_RUBRIC.md`, checks that each declared total equals the sum of its 14 ratings, and recomputes every statistic in the paper: the dataset summary, first-try reliability and repair burden, the failure profile, the tool, effort and design-prompt contrasts, the token decomposition, the two-sided Fisher exact tests and Newcombe intervals (Table S2), the within-prompted design comparisons, the Spearman correlations and the specification hash check. | `manuscript_numbers_derivation.md` |
| `analysis/count_design_markers.py` | Counts, from each run's CSS, TSX, JSX, TS, JS and HTML files (dependencies and build output excluded), the features the design directive names and technique-agnostic styling-effort measures; joins the visual rating and reports agreement. | `design_markers.csv`, `design_markers.xlsx` |
| `analysis/count_structure.py` | Source files, source lines and CSS lines per run (Tables 8 and 9). | printed table |
| `analysis/build_s1_table.py` | Builds Table S1 as a spreadsheet and, with `--docx`, as a Word table. | `S1_Table.xlsx`, `S1_Table.docx` |
| `analysis/make_figures.py` | Regenerates Figures 1–5 and Figure S1 (`DPI`, `GRID_DPI` and `CROP_TOP` control resolution and the screenshot crop; the `GRID` block names the runs shown). | `analysis/figs/` |
| `gen_report.py` | Regenerates the interactive report from the rubric files. | `index.html` |

The scripts are deterministic and read only the files in this repository, so the dataset and the
analysis travel together under one DOI. `manuscript_numbers_derivation.md` prints each comparison
with the counts behind it, with the wording the paper uses for that number, so the two can be
compared line by line.

## Usage instructions

**Get the data.** Clone the repository or download the release archive from Zenodo (the version DOI
cited in the paper is the exact snapshot the paper reports; the concept DOI above resolves to the
latest version):

    git clone https://github.com/achintmehta/retrospective-board-eval.git
    cd retrospective-board-eval

**Read a run.** Open `<run>/EVALUATION_RUBRIC.md` for the configuration, the 14 ratings, the total
and the harness's end-of-session report; open `<run>/images/` for the screenshots; the delivered
application is the rest of the folder.

**Reproduce the paper's numbers, tables and figures.**

    cd analysis
    python3 derive_manuscript_numbers.py     # every statistic, with the arithmetic shown
    python3 count_design_markers.py          # Table 6 / Table S3 measures
    python3 count_structure.py               # Tables 8 and 9
    python3 build_s1_table.py --docx         # Table S1
    python3 make_figures.py                  # Figures 1-5 and S1 into analysis/figs/

Redirect outputs with `OUT` (`derive_manuscript_numbers.py`, `build_s1_table.py`,
`count_design_markers.py`) or `OUTDIR` (`make_figures.py`).

**Run a delivered application** (to re-check any criterion yourself): in a run folder,
`npm install` then `npm run dev` for the local development server, or `docker build -t retro .`
and `docker run -p 3000:3000 retro` for the container; each delivered `README.md` documents the
run's own commands and ports. Runs that failed the local-environment or Docker criteria will fail in
the same way, since the archived code is what the agent delivered.

## Requirements

- Python 3.8 or later. `derive_manuscript_numbers.py`, `count_structure.py` and
  `count_design_markers.py` use only the standard library; `build_s1_table.py` needs `openpyxl`
  (and `python-docx` for `--docx`); `make_figures.py` needs `matplotlib` and `numpy`; `scipy` is
  optional and enables a cross-check of the Fisher exact test and the Mann–Whitney p values.
- To run the delivered applications: Node.js and npm (each delivered `package.json` declares its
  own dependencies) and Docker for the container criterion. The applications were verified on a
  Windows host; they are ordinary Node.js projects and are expected to run on Linux and macOS as
  well.
- No GPU or model access is needed to use the dataset or reproduce the analysis. Regenerating the
  runs themselves would require the agent harnesses and model access described in the paper.

## Methodology

### The task

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
shot. Antigravity runs used that agent's own harness and injected system prompt. The specification
was drafted before the first run with the OpenSpec `/opsx:explore` and `/opsx:propose` commands from
the author's concept and requirements, reviewed and edited by the author, and then frozen.

### Conditions

| Factor | Levels |
|---|---|
| Model | Claude Opus 4.7, Opus 4.6, Sonnet 4.6 (Claude Code and Antigravity); Gemini 3.1 Pro and Flash (Antigravity); Qwen 3.6 and Qwen Coder Next (local models through Claude Code, served by LM Studio on one NVIDIA RTX PRO 6000, 96 GB) |
| Reasoning effort | High; xHigh (Opus 4.7 only); one Sonnet 4.6 run at Max; Gemini 3.1 Pro at high and low |
| Testing tool | none, or the Playwright MCP server available to the agent (folders `*_with_playwright_*`); every tool-enabled run's rubric records whether the tool was invoked |
| Design prompt | none; the full third-party Antigravity system prompt supplied as the project's `CLAUDE.md` (folders `*_with_antigravity_prompt*`); or a one-paragraph paraphrase of its design directive supplied the same way (folders `*_abridged_prompt*`, text in [analysis/abridged_design_prompt.md](analysis/abridged_design_prompt.md)) |

The Opus 4.7 family forms a 2 × 4 grid — **{High, xHigh} × {base, +Playwright, +full design prompt,
+abridged design prompt}** — with six replicate runs per cell; the abridged cells were added later as
an ablation. The full Antigravity prompt is third-party material and is not redistributed; the
Antigravity-harness runs carry it by construction. Neither harness's own hidden system prompt is
redistributed either.

### Scoring rubric (14 criteria · 42-point scale)

Each of 14 functional criteria is rated **3** (passed first try), **2** (failed first, fixed after
one corrective prompt that described only the observed error), or **1** (never fully resolved). A
run's total is the sum of its 14 ratings, recorded in its `EVALUATION_RUBRIC.md`. Verification was
done by running the delivered software on the verification host (local development server, Docker
build and run, restart for persistence, card moves, comments, CSV export), not by reading the code.
*(This 14-criterion / 42-point instrument superseded an earlier 15-criterion / 45-point scale in
v2.0; the 22 runs graded earlier were re-scored under it; see [CHANGELOG.md](CHANGELOG.md).)* The
blank rubric is in `template_directory/`.

### Data processing

The analysis scripts parse the rubric files directly and refuse to run if any declared total differs
from the sum of that run's 14 ratings. Session cost is the harness's own end-of-session `/cost`
figure; where a rubric preserves two session summaries the final, cumulative one is used. The
Antigravity harness reports no cost, so those five runs are absent from cost summaries; the two Qwen
runs' cost is a token-volume estimate at hosted-model rates, not a price. The single Sonnet 4.6 run
at Max effort is counted among the design-prompt runs but enters no effort contrast, and the
abridged-prompt cells are kept out of the pooled effort contrasts. Design-treatment measures are
counted from each run's own source files with dependencies and build output excluded. No values are
imputed and no other transformation is applied beyond `log10(cost)` for plotting.

### Evaluation method and metrics

The study evaluates configuration choices of existing coding agents rather than a new model: each
contrast holds harness, specification and scoring fixed and varies one factor at a time (testing tool
versus none at fixed model and effort; High versus xHigh effort pooled over the six sweep cells;
design prompt versus none; and, as an ablation, the abridged paraphrase versus the full prompt),
with repeated identical runs to expose run-to-run variation. Metrics: the functional score
(0–42), the first-try-perfect rate (all 14 criteria rated 3), corrective prompts per run (criteria
rated 2, a lower bound on human interventions), first-try pass on the two environment criteria,
session cost (median, because cost is right-skewed), the token and time decomposition, the
source-based design measures with the design-treated classification, and a holistic 1–5 visual
rating used descriptively. Two-group contrasts are summarised with two-sided Fisher exact tests and
Newcombe 95 % intervals on the counts behind them; every such comparison is listed in
`analysis/manuscript_numbers_derivation.md`.

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

## Citations

If you use the dataset or the code, please cite the dataset and the paper:

- **Dataset:** Mehta A. 2026. *Realtime retrospective board: AI model benchmark dataset and
  evaluation artifacts.* Zenodo. https://doi.org/10.5281/zenodo.20789639 (concept DOI; each release
  has its own version DOI, and the paper cites the version it reports). See
  [CITATION.cff](CITATION.cff).
- **Paper:** Mehta A. 2026. *Reasoning effort, not tool access, buys first-try reliability in
  agentic code generation: evidence from 90 matched agent runs.* Submitted to PeerJ Computer
  Science. The citation will be updated on publication.
- **Preprint:** Mehta A. 2026. *Reasoning effort, not tool access, buys first-try reliability in
  agentic code generation: an observational study.* arXiv:2607.02436.
  https://doi.org/10.48550/arXiv.2607.02436

## License and contributions

The dataset, the analysis code and the delivered applications in this repository are released under
the MIT License (see [LICENSE](LICENSE)). Two items are deliberately absent: the third-party
Antigravity design-oriented system prompt used in the full-prompt condition, and the Claude Code
harness's own system prompt; neither is redistributed, and only the abridged paraphrase written for
this study is published (`analysis/abridged_design_prompt.md`).

The run folders are a frozen record of what the agents delivered and are not changed after
release; corrections to scoring or metadata are documented in [CHANGELOG.md](CHANGELOG.md) and
released as a new version. Issues and pull requests are welcome for the analysis code, the
documentation and the interactive report.
