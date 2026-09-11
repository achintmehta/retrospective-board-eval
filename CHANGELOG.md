# Changelog

All notable changes to this dataset and its evaluation artifacts are documented here.
Scores are derived from the per-run `EVALUATION_RUBRIC.md` files; each run's total is the
sum of its per-criterion ratings.

## v2.5.0 — 2026-09-11

This release addresses the PeerJ CS submission technical checks comments by restructuring the 
documentation, splitting the screenshot figure, and archives the figure outputs.  The scoring
instrument (14 criteria × 3 = 42 max) and the sample (90 runs) are unchanged. No criterion rating, 
total cost or reported statistic was altered and each total still equals the sum of that run's 14
ratings.

### Documentation
- `README.md` modified to the structure that PeerJ requires for code and data accompanying an AI
  Application article: description, dataset information (the run-folder naming scheme and the
  contents of every run folder and top-level file), code information, usage instructions,
  requirements, methodology (task, conditions, rubric, data processing, evaluation method and
  metrics), citations, and license and contribution guidelines. All previously documented
  content is retained.
- The paper's preprint (arXiv:2607.02436) is now cited in the README, in `CITATION.cff` and as a
  related identifier in `.zenodo.json`.

### Figures
- `make_figures.py` contains `fig_conditions()`, which renders Figure 5 as four full-width panels
  (Opus 4.7 at High effort under the base, Playwright, full design prompt and abridged design
  prompt conditions), each showing the upper part of the run's dashboard screenshot so that the
  interface text is legible; `CROP_TOP` controls the crop. The previous twelve-panel grid (three
  Opus configurations by four conditions) is unchanged and is now written as `Figure_S1.png`,
  the paper's Supplemental Figure S1. The runs shown are unchanged.
- The rendered figures are now committed under `analysis/figs/` folder

### Analysis code
- `derive_manuscript_numbers.py`: the Table 2 block reports first-try passes on the local
  development environment criterion; a design-treatment block reproduces the within-prompted
  comparisons (runs rated 5 against runs rated 4 on each source-based measure, two-sided
  Mann–Whitney U with tie and continuity corrections), the agreement counts between the rating
  and the source-based classification, and the Spearman correlations between the rating and a
  composite rank of eight source measures; a specification-identity block verifies by SHA-256
  that every run folder holds byte-identical OpenSpec documents. `manuscript_numbers_derivation.md`
  regenerated accordingly.
- `count_structure.py` and `analysis/README.md`: the structure tables are Tables 8 and 9 in the
  paper's current numbering (the v2.4.0 entry below refers to them as Tables 7 and 8, the
  numbering at that time).
- `make_figures.py`: figures restyled to the journal's requirements (panel letters, marker
  shapes and hatching in addition to colour, no in-image titles, Figure 4 without the mean
  markers); a folder-name test that misclassified the abridged-prompt runs as full-prompt runs
  in the figure code is fixed (the published figures were unaffected because the affected
  branch was not drawn).
- `build_s1_table.py` outputs (`S1_Table.xlsx`, `S1_Table.docx`) regenerated; `gen_report.py`
  and `index.html`: the same folder-name fix, and the effort-grid visual rating is shown as
  counts of runs at each rating rather than a mean.
- `analysis/design_markers.xlsx`, the spreadsheet form of `design_markers.csv`, is added.

### Metadata
- `CITATION.cff` and `.zenodo.json` bumped to v2.5.0.

## v2.4.0 — 2026-09-03

This release **adds the analysis code and corrects the documentation.** The scoring instrument
(14 criteria × 3 = 42 max) and the sample (90 runs) are unchanged. No criterion rating or total
was altered — each reported total still equals the sum of that run's 14 ratings, and the analysis
scripts refuse to run if any rubric's declared total differs from that sum.

### Analysis code (new `analysis/` folder)
- `derive_manuscript_numbers.py` recomputes every statistic reported in the accompanying paper
  from the rubric files: per-family summaries, first-try reliability and repair burden per
  configuration, the criterion-level failure profile, the tool and effort contrasts, the token and
  cost decomposition, and the two-sided Fisher exact tests and Newcombe hybrid-score intervals
  behind the paper's Table S2. Output: `manuscript_numbers_derivation.md`.
- `build_s1_table.py` rebuilds the per-run supplemental table (`S1_Table.xlsx`, and with `--docx`
  a Word version), including a sheet with the 14 criterion ratings per run.
- `count_structure.py` counts source files, source lines and CSS lines per run (the paper's
  Tables 7 and 8).
- `count_design_markers.py` measures the design treatment in each run's shipped source without a
  judge: features the design directive names (gradients, keyframe animations, Google Fonts
  imports, named display faces) and technique-agnostic styling-effort measures
  (CSS lines, custom properties, shadows, radii, transforms, letter-spacing, type scale, dark
  colours, UI-framework dependencies). Output: `design_markers.csv`, and with `--docx` a
  by-condition summary table and a per-run spreadsheet.
- `make_figures.py` regenerates every figure in the paper; the outputs are committed under
  `analysis/figs/`.
- `aesthetic_ratings.csv` (the holistic 1–5 visual rating per run) and
  `VISUAL_RATING_INSTRUMENT.md` (how the ratings were produced, the scale anchors as applied, the
  distribution over all 90 runs, and per-run notes) move into the repository so that the rating
  data travels with the code that uses it.
- `abridged_design_prompt.md` publishes the one-paragraph design directive that the
  `*_abridged_prompt` runs received as their `CLAUDE.md`. The third-party Antigravity prompt used
  by the `*_with_antigravity_prompt` runs is still not redistributed (see README).
- See `analysis/README.md` for requirements and usage.

### What the new measures show
- **The design prompt changes the shipped source categorically.** None of the 45 Claude Code
  runs without a design prompt contains a CSS gradient, a keyframe animation, a Google Fonts
  import or a named display face; all 22 full-prompt runs and all 18 abridged-prompt runs contain
  all four. Prompted runs also define about three times as many CSS custom properties (median 33
  and 30 against 10, with no overlap between groups) and write about three times as much CSS.
  No run in any condition depends on a UI or styling framework.
- **The holistic visual rating agrees with the source-based classification** in all 85 Claude
  Code runs (89 of 90 overall; the exception is the Antigravity Opus 4.6 run, which carries the
  markers but was rated 3), and within the 40 prompted runs the runs rated 5 contain more
  gradients, CSS, design tokens, shadows and transforms than the runs rated 4.

### Metadata
- `claude_opus_4.7_high_abridged_prompt_run_6/EVALUATION_RUBRIC.md`: agent label typo
  (`Claude Coe`) corrected to `Claude Code`.
- `claude_opus_4.7_high_abridged_prompt/EVALUATION_RUBRIC.md`: model label `Opus 4.7`
  normalised to `Claude Opus 4.7`, matching the other rubrics.
- The four Antigravity rubrics that still used the legacy `UI testing model:` label now use
  `UI testing model/tool:`, and `GPT-OSS_120B` is written `GPT-OSS 120B`. These edits are
  cosmetic; no score changed.

### Documentation corrections
- The v2.2.0 and v2.3.0 entries below previously described the abridged-prompt condition as an
  "abridged version of the specification". That was wrong and has been corrected in place: every
  run in the dataset received the identical OpenSpec specification, and the abridged condition
  replaces the full third-party *design prompt* with a one-paragraph paraphrase of its design
  directive.
- The v2.0.0 entry, which had been truncated mid-sentence in the v2.3.0 release, is restored in
  full.
- README, `CITATION.cff` and `.zenodo.json` updated to the 90-run dataset. The README's earlier
  explanation of the Qwen cost figures ("the cost of the Claude orchestration layer") is replaced:
  the figures are Claude Code's `/cost` estimate of the locally served model's token volume,
  priced at the hosted-model rate under which the harness reported the usage, not a price paid.

## v2.3.0 — 2026-07-02

This release **extends the abridged design-prompt condition to xHigh effort and adds per-facet
aesthetic ratings.** The scoring instrument is unchanged (14 criteria × 3 = 42 max); every change
below is to sample size or to added artifacts. No criterion rating or total was altered — each
reported total still equals the sum of that run's 14 ratings (verified programmatically).

### Data and sampling
- Added **6 graded runs**, bringing the dataset to **90 runs** (previously 84):
  - **+6** `Opus 4.7 · xHigh · abridged design prompt`, completing the abridged-prompt condition
    across both effort levels on Opus 4.7. As in v2.2.0, these runs received the full
    specification; only the design prompt was abridged.

### Added artifacts
- `aesthetic_facet_ratings.csv` — per-facet visual-quality scores (polish, colour and
  typography, layout and hierarchy, professional feel; 1–5 each). These were produced in the same
  rating pass as the holistic score rather than as an independent re-rating, and in 86 of the 90
  runs all four facet values equal the holistic score. The file is retained as a record of what
  was produced; the paper does not use it as evidence.

### Fixes
- Added the previously missing dashboard screenshot for
  `claude_opus_4.7_xhigh_with_antigravity_prompt_run_3`.

### What the new data shows
- **At xHigh, the abridged design prompt keeps the visual lift and costs first-try reliability.**
  All six runs were rated 5, but only 1 of 6 was perfect on the first try against 6 of 6 for the
  xHigh base cell; the mean functional score was 41.0 against 42.0, and the misses were Docker
  deployment (three runs) and drag-and-drop (two runs). Raising effort does not remove the
  functional price of a design prompt.

## v2.2.0 — 2026-07-02

This release **introduces an abridged design-prompt condition at High effort.** The scoring
instrument is unchanged (14 criteria × 3 = 42 max); every change below is to sample size only.
No criterion rating or total was altered — each reported total still equals the sum of that
run's 14 ratings (verified programmatically).

### Data and sampling
- Added **12 graded runs**, bringing the dataset to **84 runs** (previously 72). All belong to a
  new **abridged design-prompt** condition: the agent received the identical full specification,
  and, in place of the full third-party Antigravity prompt, a one-paragraph paraphrase of that
  prompt's design directive as the project's `CLAUDE.md` (the text is published in
  `analysis/abridged_design_prompt.md` as of v2.4.0). Model and effort are held fixed against the
  base cells:
  - **+6** `Opus 4.6 · High · abridged design prompt`
  - **+6** `Opus 4.7 · High · abridged design prompt`

### What the new data shows
- **The paraphrase reproduces the full prompt's visual lift.** Every Opus 4.6 abridged run was
  rated 4 and every Opus 4.7 abridged run 5, matching the full-prompt cells of the same model,
  while every base run remains at 3.
- **Functional scores stayed within a point of base**: Opus 4.6 High **41.2 vs 40.6** and
  Opus 4.7 High **40.8 vs 41.0**. First-try reliability was 3 of 6 (Opus 4.6, against 1 of 7 for
  base) and 1 of 6 (Opus 4.7, against 2 of 6), with 3 of the 6 Opus 4.7 abridged runs missing the
  drag-and-drop criterion on the first try.

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
