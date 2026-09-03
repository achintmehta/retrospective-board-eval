# Visual Quality Ratings: Anchors and Process Note

This file records the 1-to-5 visual quality ratings reported in the accompanying paper, the scale
anchors as they were actually applied, and the per-run rationale. The ratings are a descriptive
observation, not a measurement. The paper treats them that way and computes no inferential
statistic on them.

## How the ratings were actually produced

After functional grading was complete, screenshots taken by hand during grading were left in each
run's `images/` folder. A large language model, **Claude Opus 4.8** accessed through the Claude
desktop application, was then asked to rate the runs on four named qualities, namely visual polish,
colour and typography, layout, and professional look and feel, working from those run folders. The
author reviewed the output.

Three properties of that process limit what the numbers can support, and are stated here so that
readers do not have to infer them:

1. **Not blinded.** The model saw the run folder names, which encode the experimental condition.
2. **Anchors were generated, not supplied.** The prompt named the four qualities but gave no 1-to-5
   definitions. The anchors below are the model's own, recovered from its output. They describe
   what it applied, rather than an instrument it was given.
3. **Rated across multiple passes** as the sample grew from 31 to 72 to 90 runs, with no
   consistency check between passes.

A companion per-facet table was produced in the same pass rather than as an independent re-rating.
It carries no information the holistic score does not, and is not part of this submission. See
"Per-facet scores" below.

The anchors and per-run rationale below remain useful as a record of what was applied, and every
dashboard screenshot is archived so that any reader, human or model, can form an independent view.

---

## How the ratings were made

- **One score per run, 1–5.** The intended reference view was that run's main dashboard (the
  board-list / landing view) at `<run>/images/MainDashboard.png`. In practice the rater was
  pointed at the whole `images/` folder, which holds two or three screenshots per run and whose
  contents vary between runs, so the set of images actually seen was not identical across runs.
- The score is a **single holistic judgement**. Four facets were weighed together rather than
  scored separately: (1) polish and finish, (2) color and typography coherence, (3) layout and
  visual hierarchy, and (4) overall professional feel.
- The descriptions below were written by re-examining each screenshot; they explain what in the
  image drove the score. They are post-hoc rationale, not a second independent rating.

## Scale anchors (as actually applied)

- **5 — Premium / marketing-grade.** Full landing-page treatment: a gradient or two-tone hero
  headline (e.g. "Run beautiful team retros in real-time"), a custom product wordmark, a cohesive
  dark theme, color-coded column or tag chips, strong typographic hierarchy, and decorative
  background work (gradients, subtle starfield). Reads like a polished SaaS marketing page.
- **4 — Clearly designed.** A deliberate, cohesive theme (usually dark) with a branded
  header/wordmark, improved typography and spacing, and styled cards and buttons, but without the
  full hero/marketing treatment of a 5.
- **3 — Clean but generic (the baseline).** Tidy and functional but visually default: a light
  (white/gray) or plain dark background, framework-default typography, a single accent button
  color, simple unstyled cards, and "Retro Board(s)" as plain text. A working app with no design
  point of view.
- **2 — Below baseline.** Essentially unstyled, with weak layout: large empty regions, no card
  styling, visible layout artifacts (stray divider rules), text floating in whitespace.
- **1 — Broken or unstyled enough to impair use.** None observed in this dataset.

## Per-facet scores (not part of the submission)

Alongside the holistic 1-5 score, a per-facet score was recorded for each run on four facets:
polish and finish, colour and typography coherence, layout and visual hierarchy, and overall
professional feel. These were produced in the same pass as the holistic score rather than as an
independent re-rating. In 86 of the 90 runs all four facet values are identical to each other and
to the holistic score, and the correlation between two of the facets is exactly 1.00, so they carry
no information the holistic score does not. They are therefore not reported in the paper and are
not part of this submission, and are noted here only so the record of what was produced is complete.
## Distribution

| Score | Count | Who |
|---|---|---|
| 5 | 24 | design-prompt runs, full or abridged (Opus 4.7 mostly; one Opus 4.6 full-prompt run; Sonnet 4.6 Max) |
| 4 | 17 | design-prompt runs (Opus 4.6 full and abridged, Sonnet 4.6 full, one per Opus 4.7 full-prompt cell) + native Antigravity Sonnet 4.6 |
| 3 | 48 | all base and +Playwright runs, both Qwen runs, three native Antigravity runs |
| 2 | 1 | native Antigravity, Gemini 3.1 Pro (high) |
| 1 | 0 | — |

Total: 90 runs.

## Summary by configuration

| Model | Effort | Condition | n | Mean aes | Aes values | Functional range |
|---|---|---|---:|---:|---|---|
| Opus 4.7 | High | base | 6 | 3.00 | 3,3,3,3,3,3 | 39–42 |
| Opus 4.7 | High | +Playwright | 6 | 3.00 | 3,3,3,3,3,3 | 41–42 |
| Opus 4.7 | High | design prompt | 6 | 4.83 | 5,5,5,4,5,5 | 39–41 |
| Opus 4.7 | High | abridged prompt | 6 | 5.00 | 5,5,5,5,5,5 | 40–42 |
| Opus 4.7 | xHigh | base | 6 | 3.00 | 3,3,3,3,3,3 | 42 |
| Opus 4.7 | xHigh | +Playwright | 6 | 3.00 | 3,3,3,3,3,3 | 42 |
| Opus 4.7 | xHigh | design prompt | 6 | 4.83 | 5,5,5,5,4,5 | 40–42 |
| Opus 4.7 | xHigh | abridged prompt | 6 | 5.00 | 5,5,5,5,5,5 | 40–42 |
| Opus 4.6 | High | base | 7 | 3.00 | 3,3,3,3,3,3,3 | 38–42 |
| Opus 4.6 | High | +Playwright | 7 | 3.00 | 3,3,3,3,3,3,3 | 39–41 |
| Opus 4.6 | High | design prompt | 6 | 4.17 | 4,4,4,4,5,4 | 40–41 |
| Opus 4.6 | High | abridged prompt | 6 | 4.00 | 4,4,4,4,4,4 | 39–42 |
| Sonnet 4.6 | High | base | 3 | 3.00 | 3,3,3 | 39–42 |
| Sonnet 4.6 | High | +Playwright | 2 | 3.00 | 3,3 | 39, 42 |
| Sonnet 4.6 | High | design prompt | 3 | 4.00 | 4,4,4 | 41–42 |
| Sonnet 4.6 | max | design prompt | 1 | 5.00 | 5 | 41 |
| Qwen 3.6 | High | +Playwright | 1 | 3.00 | 3 | 37 |
| Qwen Coder Next | High | +Playwright | 1 | 3.00 | 3 | 24 |
| Antigravity (native) | — | Gemini 3.1 Flash | 1 | 3.00 | 3 | 38 |
| Antigravity (native) | — | Gemini 3.1 Pro | 2 | 2.50 | 2,3 | 40 |
| Antigravity (native) | — | Opus 4.6 | 1 | 3.00 | 3 | 40 |
| Antigravity (native) | — | Sonnet 4.6 | 1 | 4.00 | 4 | 42 |

The decisive split is the **design prompt**, full or abridged: it moves runs from the generic-3 baseline to 4–5,
independent of model family, reasoning effort (High vs xHigh base both sit at 3.0), and the
testing tool (every +Playwright run stays at 3.0). All 90 runs are listed; the 18 abridged-prompt runs were
rated in the third pass (see "How the ratings were actually produced").

---

## Per-run detail

### Opus 4.7 — High, base (all aes 3)
Shared character: clean but generic. Themes vary (some light, some dark) but none has branding or
a design point of view; default typography, one accent color, simple cards.

- **claude_opus_4.7_high** — 3. Light-gray page, card-style "Create a board" and "All boards"; tidy, default.
- **claude_opus_4.7_high_run_2** — 3. Standard dark theme, top "Retro Board" bar, plain "Create a new board" and "Boards" cards; dark but unbranded.
- **claude_opus_4.7_high_run_3** — 3. Light page, "Retrospectives" heading, single board card; default styling.
- **claude_opus_4.7_high_run_4** — 3. Dark navy page with a "Self-hosted real-time retrospectives" tagline; still generic dark.
- **claude_opus_4.7_high_run_5** — 3. Dark page with a "RetroBoard" wordmark and "Start a retrospective"; mildly branded but otherwise default.
- **claude_opus_4.7_high_run_6** — 3. Dark page, plain "Create a new retrospective"; no design treatment.

### Opus 4.7 — High, +Playwright (all aes 3)
Adding the testing tool left the visual style untouched: identical generic baseline as base runs.

- **claude_opus_4.7_with_playwright_high** — 3. Dark navy, "Retro Boards", "Create a new board" + "Existing boards" cards; standard dark.
- **claude_opus_4.7_with_playwright_high_run_2** — 3. Light page, "Retro Board" header, plain cards.
- **claude_opus_4.7_with_playwright_high_run_3** — 3. Light page, "Create a Retro Board" + "Boards" list; default.
- **claude_opus_4.7_with_playwright_high_run_4** — 3. Dark header bar over a light body, "Retrospective boards"; generic.
- **claude_opus_4.7_with_playwright_high_run_5** — 3. Light page noting the three default columns; plain.
- **claude_opus_4.7_with_playwright_high_run_6** — 3. Blue header bar, light body, "Create a new retrospective"; default.

### Opus 4.7 — High, design prompt (aes 4–5, mean 4.83)
The marketing-page look appears: dark themes, gradient hero headlines, wordmarks, chips.

- **claude_opus_4.7_high_with_antigravity_prompt** — 5. Dark hero, "Run retros that move at the speed of your team", gradient accent, branded.
- **claude_opus_4.7_high_with_antigravity_prompt_run_2** — 5. Two-panel marketing layout, pink/purple gradient headline.
- **claude_opus_4.7_high_with_antigravity_prompt_run_3** — 5. Dark marketing hero with gradient type and styled create panel.
- **claude_opus_4.7_high_with_antigravity_prompt_run_4** — 4. Clearly designed dark theme and wordmark, but a flatter hero than its 5-rated siblings.
- **claude_opus_4.7_high_with_antigravity_prompt_run_5** — 5. "Run retrospectives that actually flow." hero, gradient, polished.
- **claude_opus_4.7_high_with_antigravity_prompt_run_6** — 5. "Run your next retrospective in seconds." gradient hero, wordmark, recent-boards section.

### Opus 4.7 — xHigh, base (all aes 3)
Higher reasoning effort did not change appearance: same generic baseline as High base.

- **claude_opus_4.7_xhigh** — 3. Dark "Retro Board" header, "Create a board" + "Boards"; standard dark.
- **claude_opus_4.7_xhigh_run_2** — 3. Dark "Realtime Retro" header, plain create/existing cards.
- **claude_opus_4.7_xhigh_run_3** — 3. Dark page, "Retrospective Boards" with a cyan accent button; generic.
- **claude_opus_4.7_xhigh_run_4** — 3. Dark "Retro Board" header, plain "Create a new board"; default.
- **claude_opus_4.7_xhigh_run_5** — 3. Dark header over light body, plain cards.
- **claude_opus_4.7_xhigh_run_6** — 3. Light page, "Retrospective Boards"; default.

### Opus 4.7 — xHigh, +Playwright (all aes 3)
Testing tool again left the style at baseline.

- **claude_opus_4.7_with_playwright_xhigh** — 3. Light page, "Create a new retrospective" card; plain.
- **claude_opus_4.7_with_playwright_xhigh_run_2** — 3. Dark page with window-dot motif, "Run a real-time retrospective"; standard dark.
- **claude_opus_4.7_with_playwright_xhigh_run_3** — 3. Dark page, "Create a new retrospective" + "Existing boards"; generic.
- **claude_opus_4.7_with_playwright_xhigh_run_4** — 3. Light page, "Start a retro" with default-columns note; plain.
- **claude_opus_4.7_with_playwright_xhigh_run_5** — 3. Light page, "Retrospective Boards", RetroBoard logo; default.
- **claude_opus_4.7_with_playwright_xhigh_run_6** — 3. Light page, "Create a new board" + "Existing boards"; plain.

### Opus 4.7 — xHigh, design prompt (aes 4–5, mean 4.83)
Same marketing-grade jump as the High design cell, independent of the higher effort.

- **claude_opus_4.7_xhigh_with_antigravity_prompt** — 5. "Run team retrospectives that feel alive." gradient hero, dark.
- **claude_opus_4.7_xhigh_with_antigravity_prompt_run_2** — 5. "Retros that feel alive." gradient hero, polished dark.
- **claude_opus_4.7_xhigh_with_antigravity_prompt_run_3** — 5. "Retros that flow, insights that ship." dual-panel marketing layout.
- **claude_opus_4.7_xhigh_with_antigravity_prompt_run_4** — 5. "Run honest retros, in real-time." gradient hero.
- **claude_opus_4.7_xhigh_with_antigravity_prompt_run_5** — 4. Cohesive dark design, "Retrospectives that feel alive.", but a simpler hero than the 5s.
- **claude_opus_4.7_xhigh_with_antigravity_prompt_run_6** — 5. "Run beautiful team retros in real-time." gradient hero, wordmark, tag chips.

### Opus 4.6 — High, base (all aes 3)
Predominantly light, default UIs; clean and usable, no design treatment.

- **claude_opus_4.6_high** — 3. Light page with a blue header bar, "Retro Board", plain cards.
- **claude_opus_4.6_high_run_1** — 3. Light-gray page, centered "Retro Board" + subtitle; default.
- **claude_opus_4.6_high_run_2** — 3. White page, centered "Retrospective Boards"; plain card.
- **claude_opus_4.6_high_run_3** — 3. Light page, centered "Retrospective Board" + subtitle; default.
- **claude_opus_4.6_high_run_4** — 3. Light page, left-aligned "Retrospective Boards", board link; plain.
- **claude_opus_4.6_high_run_5** — 3. Light page, small "Retro Board" mark, "Your Retrospective Boards"; default.
- **claude_opus_4.6_high_run_6** — 3. Light page, "Retrospective Boards", board card; plain.

### Opus 4.6 — High, +Playwright (all aes 3)
No visual change from the tool; same light/default baseline.

- **claude_opus_4.6_with_playwright_high** — 3. Light-gray page, centered "Retrospective Boards"; plain.
- **claude_opus_4.6_with_playwright_high_run_2** — 3. Light page, "Retrospective Board" + subtitle; default.
- **claude_opus_4.6_with_playwright_high_run_3** — 3. Light page, "Retrospective Boards", board card; plain.
- **claude_opus_4.6_with_playwright_high_run_4** — 3. Light page, "Retrospective Boards" + subtitle, blue link; default.
- **claude_opus_4.6_with_playwright_high_run_5** — 3. Dark header bar over a light "Boards" body; generic.
- **claude_opus_4.6_with_playwright_high_run_6** — 3. Light page, "Retrospective Boards"; plain.
- **claude_opus_4.6_with_playwright_high_run_7** — 3. Light page, plain "Retrospective Boards" + board link.

### Opus 4.6 — High, design prompt (aes 4–5, mean 4.17)
Clearly designed dark themes; mostly 4s (designed but not full marketing-hero), one 5.

- **claude_opus_4.6_high_with_antigravity_prompt** — 4. Dark theme, branded "Retrospective Board", purple accents; designed but restrained hero.
- **claude_opus_4.6_high_with_antigravity_prompt_run_2** — 4. Dark "Your Retrospectives" with styled card; cohesive.
- **claude_opus_4.6_high_with_antigravity_prompt_run_3** — 4. Dark page with gradient accent and styled create panel.
- **claude_opus_4.6_high_with_antigravity_prompt_run_4** — 4. Dark "RetroBoard" wordmark, purple button; designed.
- **claude_opus_4.6_high_with_antigravity_prompt_run_5** — 5. "Run better retrospectives" marketing hero, the most polished of this cell.
- **claude_opus_4.6_high_with_antigravity_prompt_run_6** — 4. Dark dashboard with styled input; cohesive but no full hero.

### Abridged-prompt cells (rated in the third pass; no per-run rationale was recorded)
The 18 abridged-prompt runs were rated after the per-run notes above were written, and the rating pass
for them recorded scores only. Every Opus 4.6 abridged run was rated 4 and every Opus 4.7 abridged run 5,
matching the full-prompt cells of the same model. Objective descriptors of each run's shipped source
(gradients, animations, imported fonts, design tokens and so on) are in `design_markers.csv`.

### Opus 4.6 — High, abridged prompt (all aes 4)
- **claude_opus_4.6_high_abridged_prompt** — 4.
- **claude_opus_4.6_high_abridged_prompt_run_2** — 4.
- **claude_opus_4.6_high_abridged_prompt_run_3** — 4.
- **claude_opus_4.6_high_abridged_prompt_run_4** — 4.
- **claude_opus_4.6_high_abridged_prompt_run_5** — 4.
- **claude_opus_4.6_high_abridged_prompt_run_6** — 4.

### Opus 4.7 — High, abridged prompt (all aes 5)
- **claude_opus_4.7_high_abridged_prompt** — 5.
- **claude_opus_4.7_high_abridged_prompt_run_2** — 5.
- **claude_opus_4.7_high_abridged_prompt_run_3** — 5.
- **claude_opus_4.7_high_abridged_prompt_run_4** — 5.
- **claude_opus_4.7_high_abridged_prompt_run_5** — 5.
- **claude_opus_4.7_high_abridged_prompt_run_6** — 5.

### Opus 4.7 — xHigh, abridged prompt (all aes 5)
- **claude_opus_4.7_xhigh_abridged_prompt** — 5.
- **claude_opus_4.7_xhigh_abridged_prompt_run_2** — 5.
- **claude_opus_4.7_xhigh_abridged_prompt_run_3** — 5.
- **claude_opus_4.7_xhigh_abridged_prompt_run_4** — 5.
- **claude_opus_4.7_xhigh_abridged_prompt_run_5** — 5.
- **claude_opus_4.7_xhigh_abridged_prompt_run_6** — 5.

### Sonnet 4.6 — High, base (all aes 3)
Light, default UIs; clean and generic.

- **claude_sonnet_4.6_high** — 3. Light page, centered "Retro Board", "Create a New Board" + "Existing Boards"; default.
- **claude_sonnet_4.6_high_run_2** — 3. Light-gray page, "Retro Board", purple button, board card; plain.
- **claude_sonnet_4.6_high_run_3** — 3. Light page, "Retrospective Boards", board card; default.

### Sonnet 4.6 — High, +Playwright (all aes 3)
No visual change from the tool.

- **claude_sonnet_4.6_with_playwright_high** — 3. Light page, centered "Retro Board", purple button; plain.
- **claude_sonnet_4.6_with_playwright_high_run_2** — 3. Light page, "Retro Boards", board card; default.

### Sonnet 4.6 — High, design prompt (all aes 4)
Cohesive designed dark themes; clearly above baseline but short of the full marketing-hero 5.

- **claude_sonnet_4.6_high_with_antigravity_prompt** — 4. Dark "Run Better Retrospectives" heading, purple accents, "All boards".
- **claude_sonnet_4.6_high_with_antigravity_prompt_run_2** — 4. Dark theme, styled create panel and "Your Boards".
- **claude_sonnet_4.6_high_with_antigravity_prompt_run_3** — 4. Dark "Real-time Retrospectives" panel with board form; cohesive.

### Sonnet 4.6 — max, design prompt (aes 5)
- **claude_sonnet_4.6_max_with_antigravity_prompt** — 5. Dark "Run better retrospectives" with a gradient accent word, starfield/space background, tag chips and a polished create panel; full marketing treatment.

### Qwen 3.6 and Qwen Coder Next — High, +Playwright (all aes 3)
The two local models produced plain, default UIs (no design prompt), at the baseline.

- **claude_qwen_3.6_high_with_playwright** — 3. Light-gray page, centered "Retro Boards", board card; plain.
- **claude_qwen_coder_next_high_with_playwright** — 3. Light page, "Realtime Retro Board", purple button, board list; default.

### Antigravity agent, native runs (different harness)
These five were produced by the Antigravity agent directly (its own model set and harness), so
they vary the harness as well as the prompt and are kept out of the design-prompt contrast.

- **antigravity_gemini3_flash** — 3. Dark page, "Antigravity Retro" gradient title and purple button, but cramped layout with large empty dark regions; the gradient title lifts it, the rough layout holds it at baseline.
- **antigravity_gemini_3.1_pro_high** — 2. Near-default white page: centered title and input floating in whitespace, faint vertical divider rules, no card styling — the only sub-baseline run.
- **antigravity_gemini_3.1_pro_low** — 3. Light-gray page, "Realtime Retrospective", white create card, purple button; clean but generic.
- **antigravity_opus_4.6** — 3. Dark theme with a "RetroBoard" mark and purple accent; tidy but standard, no hero treatment.
- **antigravity_sonnet_4.6** — 4. Dark theme with a wordmark, a styled "Create a New Board" panel and column chips (Went Well / Needs Improvement / Action Items); the most complete of the native runs.

---

## Verification

Every score above can be checked against the source screenshot at
`<run>/images/MainDashboard.png` in this repository (a few folders spell the file
`MainDashBoard.png` / `MainDashbaord.png`). The final scores are duplicated in
`aesthetic_ratings.csv` and S1 Table; this file only adds the rationale.
