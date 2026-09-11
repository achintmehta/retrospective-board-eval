# analysis

Code that turns the run artifacts in this repository into the statistics, tables and figures
reported in the accompanying paper. Everything here reads the per-run `EVALUATION_RUBRIC.md`
files and source trees in the repository root, so the dataset and the analysis travel together
under one DOI. Every script locates the dataset automatically when run from this folder; set the
`REPO` environment variable to point elsewhere.

| File | What it does | Output |
|---|---|---|
| `derive_manuscript_numbers.py` | Recomputes every number quoted in the paper from the rubric files: Table 1 summaries, Table 2 first-try reliability, Table 3 failure profile, the tool and effort contrasts, Tables 4, 5 and 7, and the two-sided Fisher exact tests and Newcombe hybrid-score intervals behind Table S2. Checks that each run's declared total equals the sum of its 14 ratings. | `manuscript_numbers_derivation.md` |
| `build_s1_table.py` | Rebuilds Table S1. Sheet "Per-run data": harness, model, effort, UI testing tool, design prompt, score, cost, log10(cost), visual rating. Sheet "Criteria": the 14 criterion ratings per run and the first-try-perfect flag. With `--docx` it also writes a Word version formatted like the manuscript's table files (`--docx-only` skips the spreadsheet). | `S1_Table.xlsx`, `S1_Table.docx` |
| `count_structure.py` | Source files, source lines and CSS lines per run for Tables 8 and 9 (any run folders can be passed as arguments). | printed table |
| `count_design_markers.py` | Judge-free measures of the design treatment in each run's shipped source: the markers the design directive names (gradients, `@keyframes`, Google Fonts imports, named display fonts) and technique-agnostic investment measures (CSS lines, custom properties, shadows, radii, transforms, letter-spacing, type scale, colour counts, UI-framework dependencies). Joins the holistic visual rating and reports its agreement with the source-based classification. | `design_markers.csv` |
| `make_figures.py` | Regenerates every figure. `DPI` and `GRID_DPI` control output resolution; the `GRID` block names the runs shown in the screenshot grid. | `figs/` (also copied to `figs/Figure_N.png`) |
| `aesthetic_ratings.csv` | The holistic 1–5 visual quality rating per run: the input to the table, figure and marker scripts. | — |
| `abridged_design_prompt.md` | The one-paragraph design directive the `*_abridged_prompt` runs received as their `CLAUDE.md`, verbatim. | — |
| `VISUAL_RATING_INSTRUMENT.md` | How those ratings were produced, the scale anchors as applied, the rating distribution, and per-run notes. | — |
| `manuscript_numbers_derivation.md`, `S1_Table.xlsx`, `design_markers.csv` | Generated outputs of the scripts above, committed so that readers can inspect them without running anything. | — |

## Running

Python 3.8 or later. `derive_manuscript_numbers.py`, `count_structure.py` and
`count_design_markers.py` need only the standard library; `build_s1_table.py` needs `openpyxl` (and `python-docx` for `--docx`);
`make_figures.py` needs `matplotlib` and `numpy`. Installing `scipy` is optional and enables a
cross-check of the hand-rolled Fisher exact test against `scipy.stats.fisher_exact`.

    cd analysis
    python3 derive_manuscript_numbers.py
    python3 build_s1_table.py --docx
    python3 count_structure.py
    python3 count_design_markers.py
    python3 make_figures.py

Redirect outputs with `OUT` (`derive_manuscript_numbers.py`, `build_s1_table.py`,
`count_design_markers.py`) or `OUTDIR` (`make_figures.py`).

## Verifying the reported statistics

`manuscript_numbers_derivation.md` prints each comparison with the counts behind it, for example:

    Run perfect on first try, by reasoning effort
        Opus 4.7 xHigh, six sweep cells: 16/18 = 89%;  Opus 4.7 High, six sweep cells: 5/18 = 28%
        Fisher exact (two-sided) p = 0.00049
        risk difference 61.1 pp, 95% CI 29.4 to 78.4 pp

Those three lines correspond to one row of Table S2 in the paper. Each derivation line also
carries the wording the paper uses for that number, so the two can be compared directly.
