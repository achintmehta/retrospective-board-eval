# Changelog

All notable changes to this dataset and its evaluation artifacts are documented here.
Scores are derived from the per-run `EVALUATION_RUBRIC.md` files; each run's total is the
sum of its per-criterion ratings.

## v2.0.0 — 2026-06-24

This release **finalizes the evaluation instrument and expands the sample.** Every change
below is to the **scoring rubric, run labels, or sample size** — applied uniformly to all
runs and fixed as rules *independent of any run's outcome*. No individual score was adjusted
to change a conclusion; every reported total equals the sum of that run's 14 criterion
ratings (verified programmatically).

### Scoring instrument (now 14 criteria, 42-point scale)
- **Removed the "data persistence across a container restart" criterion.** It conflated
  deployment configuration (whether the operator runs the container with a mounted volume,
  e.g. `-v`) with the model's code quality, so it did not measure the artifact itself. The
  related "data survives a server reboot" criterion — a pure code property — is retained.
- The rubric is therefore **14 criteria × 3 = 42 max** (previously 15 × 3 = 45). All runs
  were re-scored under the finalized rubric.
- The 3/2/1 scale is unchanged: **3** = passed on first try, **2** = failed then fixed after
  a prompt, **1** = never fully worked.

### Labels and metadata
- Corrected model and effort labels against the recorded session logs:
  - a run previously labeled "Sonnet 4.7" is **Claude Sonnet 4.6**;
  - runs labeled "xHigh" on Opus 4.6 / Sonnet 4.6 were relabeled to their **executed effort**
    (High or Max), because the 4.6-family models do not expose an xHigh effort level (xHigh
    is genuine only on Opus 4.7).
- Standardized run-folder names to use underscores consistently.

### Data and sampling
- Added replication runs for several configurations. The dataset now contains **41 graded
  runs** (previously 22), including repeated runs of identical configurations to quantify
  run-to-run variation.
- Removed an exploratory single-run "with vs without Playwright" architecture comparison
  (`IMPLEMENTATION_COMPARISON.md`). Its causal interpretation did not survive replication
  across multiple runs; the run itself remains in the dataset as one sample.

### Reporting
- Rebuilt the interactive report (`index.html`) on the full 41-run set at the 42-point scale,
  adding sections on run-to-run variation, tool access, architecture, aesthetics, and cost.

## v1.0.0 — 2026-06-22
- Initial release: 22 runs scored with a 15-criterion rubric (45-point scale).
