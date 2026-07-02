# Changelog

All notable changes to this dataset and its evaluation artifacts are documented here.
Scores are derived from the per-run `EVALUATION_RUBRIC.md` files; each run's total is the
sum of its per-criterion ratings.

## v2.3.0 — 2026-07-02

This release **extends the abridged-prompt condition to xHigh effort and adds per-facet aesthetic
ratings.** The scoring instrument is unchanged (14 criteria × 3 = 42 max); every change below is to
sample size or to added artifacts. No criterion rating or total was altered — each reported total
still equals the sum of that run's 14 ratings (verified programmatically).

### Data and sampling
- Added **6 graded runs**, bringing the dataset to **90 runs** (previously 84):
  - **+6** `Opus 4.7 · xHigh · abridged-prompt`, completing the abridged-prompt condition across
    both effort levels on Opus 4.7.

### Added artifacts
- `aesthetic_facet_ratings.csv` — per-facet visual-quality ratings (polish, color & typography,
  layout & hierarchy, professional feel; 1–5 each, with the facet mean) complementing the single
  holistic aesthetic score.

### Fixes
- Added the previously missing dashboard screenshot for
  `claude_opus_4.7_xhigh_with_antigravity_prompt_run_3`.

### What the new data shows
- **At xHigh, abridging the specification costs about a point.** The full-specification xHigh base
  runs were uniformly perfect (42/42); the abridged runs averaged **41.0** — the only tier where
  abridging left a visible mark, consistent with the base already sitting at the ceiling.

## v2.2.0 — 2026-07-02

This release **introduces an abridged-prompt condition at High effort.** The scoring instrument is
unchanged (14 criteria × 3 = 42 max); every change below is to sample size only. No criterion
rating or total was altered — each reported total still equals the sum of that run's 14 ratings
(verified programmatically).

### Data and sampling
- Added **12 graded runs**, bringing the dataset to **84 runs** (previously 72). All belong to a new
  **abridged-prompt** condition, in which the agent received an abridged (condensed) version of the
  specification, holding model and effort fixed against the full-specification base:
  - **+6** `Opus 4.6 · High · abridged-prompt`
  - **+6** `Opus 4.7 · High · abridged-prompt`

### What the new data shows
- **Abridging the specification barely changed High-effort functional scores**, which stayed within
  a point of the full-specification base: Opus 4.6 High **41.2 vs 40.6** and Opus 4.7 High
  **40.8 vs 41.0**.

## v2.1.0 — 2026-06-26

This release **expands the sample and introduces a reasoning-effort dimension.** The scoring
instrument is unchanged (14 criteria × 3 = 42 max); every change below is to sample size or to
rubric **metadata formatting only**. No criterion rating or total was altered — each reported
total still equals the sum of that run's 14 ratings (verified programmatically).

### Data and sampling
- Added **31 graded runs**, bringing the dataset to **72 runs** (previously 41):
  - **+5** `Opus 4.6 · High · design-prompt` replicates, turning the design-prompt comparison
    into a matched set (previously a single run).
  - **+26** `Opus 4.7` runs completing a 2 × 3 design — **{High, xHigh} × {base, +Playwright,
    +design prompt}**, six replicates per cell.
- This is the dataset's first **effort contrast** (High vs xHigh); the 4.6-family models do not
  expose an xHigh effort level, so it is run entirely within Opus 4.7.

### Metadata normalization
- Standardized the `EVALUATION_RUBRIC.md` header fields — **Agent**, **Effort Mode**,
  **UI testing model/tool**, and **UI testing functionality invoked** — to consistent casing and
  canonical labels across all runs (e.g. `claude code` / `Claude` → `Claude Code`; `playwright`
  → `Playwright`; `No` → `None` for the tool field; the legacy `UI testing tool:` label →
  `UI testing model/tool:`). These edits are cosmetic; no score changed.

### What the new data shows
- **Reasoning effort buys first-try reliability.** Pooling the Opus 4.7 cells, the
  first-try-perfect (42/42) rate rises from **28 % at High to 89 % at xHigh**, with the
  High-level misses concentrated in first-run environment failures (npm, Docker, persistence).
  The cost premium for xHigh is ~10–30 % on the median.
- **The tool and design-prompt findings replicate at the new tier.** Adding Playwright leaves the
  functional score unchanged at +42–68 % cost; the design prompt leaves the functional score
  unchanged at +40–55 % cost (its payoff remains aesthetic, not functional).

## v2.0.0 — 2026-06-24

This release **finalizes the evaluation instrument and expands the sample.** Every change
below is to the **scoring rubric, run labels, or sample size** — applied uniformly to all
runs and fixed as rules *independent of any run's outcome*. No individual score was adjusted
to change a conclusion; every reported total equals the sum of that run's 14 criterion
ratings (verified programmatically).

### Scoring instrument (now 14 criteria, 42-point scale)
- **Removed the "data persistence across a container restart" criterion.** It conflated
  deployment configuration (whether the operator runs the container with a mounted volume,
  e.g. `-v`) with the model's code quality, so it did not measure