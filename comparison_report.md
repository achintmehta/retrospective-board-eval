# Realtime Retrospective Board — Model & Agent Comparison Report

**Project:** Realtime Retrospective Board (Node.js + React + Socket.io + SQLite)  
**Evaluation Date:** May 2026  
**Number of Implementations:** 22

---

## The Task

Each implementation got the same brief: build a self-hosted, real-time retrospective board with a React/Vite frontend and a Node.js backend. Requirements:

- Board creation and listing (SQLite persistence)
- Configurable columns per board
- Guest authentication (display name on join)
- Card management with drag-and-drop between columns
- Nested comments on cards
- Real-time sync via WebSockets (Socket.io) across all connected clients
- Docker deployment (single container)
- CSV export
- Developer documentation

The functional rubric scored each of 15 criteria as: **Pass/3** (worked first try), **Fail/2** (fixed after prompting), or **Fail/1** (partially fixed or permanently broken).

---

## Scoring Key

### Functional Score (15 criteria x 3 = 45 max)

| Rating | Meaning |
|--------|---------|
| 3 | Pass — worked without any changes |
| 2 | Fail — fixed after prompting the agent |
| 1 | Fail — couldn't be fixed or only partially fixed |

### Architecture Quality Score (6 dimensions x 3 = 18 max)

See the [Architecture Quality Rubric](#architecture-quality-rubric) section below for full definitions.

---

## Results by Implementation

### Claude Opus 4.7 — Perfect Functional Scores

| Implementation | Score / 45 | Local Dev | Docker | Card Move | Realtime | Notes |
|---|---|---|---|---|---|---|
| `claude_opus_4.7_high` | **45/45** | ✅ | ✅ | ✅ | ✅ | Perfect first-shot; no fixes needed |
| `claude_opus_4.7_with_playwright_high` | **45/45** | ✅ | ✅ | ✅ | ✅ | Perfect; Playwright UI tests confirmed all features |
| `claude_opus_4.7_with_playwright_xhigh` | **45/45** | ✅ | ✅ | ✅ | ✅ | Perfect; most lines of code (2,633) |
| `claude_opus_4.7_xhigh` | **45/45** | ✅ | ✅ | ✅ | ✅ | Perfect |
| `claude_opus_4.7_xhigh_with_antigravity_prompt` | **45/45** | ✅ | ✅ | ✅ | ✅ | Perfect; largest codebase (3,676 lines) |

### Antigravity Agent — Claude & Gemini

| Implementation | Score / 45 | Local Dev | Docker | Card Move | Realtime | Notes |
|---|---|---|---|---|---|---|
| `antigravity_claude_sonnet_4.6` | **45/45** | ✅ | ✅ | ✅ | ✅ | Perfect; used GPT-OSS 120B as browser QA subagent |
| `antigravity_opus_4.6` | **43/45** | ✅ | ❌→✅ | ❌→✅ | ✅ | Docker build failed (gyp); card move bug fixed after prompting |
| `antigravity_gemini_3.1_pro_high` | **43/45** | ✅ | ❌→✅ | ✅ | ✅ | Docker: GLIBC mismatch + Express 5 wildcard routing bug |
| `antigravity_gemini_3.1_pro_low` | **43/45** | ✅ | ❌→✅ | ✅ | ✅ | Docker: TypeScript not compiled; Express 5 catch-all bug; CSV missing comment replies |
| `antigravity_gemini3_flash` | **41/45** | ❌ | ✅ | ✅ | ✅ | Wouldn't start on first run; homepage then board page blank after fixes; wrong Docker volume docs |

### Claude Code Agent — Sonnet 4.6 & 4.7

| Implementation | Score / 45 | Local Dev | Docker | Card Move | Realtime | Notes |
|---|---|---|---|---|---|---|
| `claude_sonnet_4.6_with_playwright_xhigh` | **45/45** | ✅ | ✅ | ✅ | ✅ | Perfect; Playwright confirmed all features; $2.57 |
| `claude-sonnet_4.6_xhigh` | **44/45** | ❌→✅ | ✅ | ✅ | ✅ | better-sqlite3 native compile failed on Windows; switched to sql.js (WASM) |
| `claude-sonnet_4.6_xhigh_with_antigravity_prompt` | **44/45** | ✅ | ✅ | ❌→✅ | ✅ | Drag-and-drop didn't work first try; fixed after prompting |
| `claude_opus_4.6_xhigh_with_antigravity_prompt` | **44/45** | ✅ | ❌→✅ | ✅ | ✅ | Docker: better-sqlite3 gyp failure |
| `claude_sonnet_4.6_with_playwright_high` | **42/45** | ✅ | ❌→✅ | ✅ | ✅ | Docker OK after fix; comment datatype mismatch in container never fully fixed (score 1) |
| `claude_sonnet_4.7_high` | **42/45** | ✅ | ❌→✅ | ✅ | ❌→✅ | Docker: invalid ELF header (cross-compile); realtime card/column updates needed fixing |

### Claude Code Agent — Opus 4.6

| Implementation | Score / 45 | Local Dev | Docker | Card Move | Realtime | Notes |
|---|---|---|---|---|---|---|
| `claude-opus-4.6_xhigh` | **43/45** | ✅ | ❌→✅ | ✅ | ✅ | Docker volume mounted over /app; container persistence fix needed |
| `claude-opus-4.6_with_playwright_high` | **43/45** | ✅ | ❌→✅ | ❌→✅ | ✅ | Docker + card move both needed fixes; move left ghost duplicate card |
| `claude-opus-4.6_with_playwright_xhigh` | **42/45** | ✅ | ❌→✅ | ❌ | ✅ | Card move causes blank dashboard; couldn't be fully fixed (score 1) |
| `claude_opus_4.6_high` | **41/45** | ✅ | ❌→✅ | ❌ | ❌→✅ | Card move never fixed; realtime card add fixed after prompting |

### Non-Claude Models (Local — No Inference Cost)

| Implementation | Score / 45 | Local Dev | Docker | Card Move | Realtime | Notes |
|---|---|---|---|---|---|---|
| `claude_qwen_3.6_high_with_playwright` | **40/45** | ✅ | ❌→✅ | ❌→✅ | ✅ | Board creation broken; name input bug; comment crashed page. Local model — no inference cost |
| `claude_qwen_coder_next_high_with_playwright` | **27/45** | ❌→✅ | ❌→✅ | ❌ | ❌ | Most features broken or missing; worst overall result. Local model — no inference cost |

> **Note on Qwen costs:** Both Qwen runs used locally-hosted models. The dollar figures Claude Code reported ($41 and $179) reflect the cost of the **Claude orchestration layer** (Claude Opus 4.7 acting as the agent harness), not the Qwen model inference itself, which ran locally at no charge.

---

## Architecture Quality Rubric

The Playwright vs. no-Playwright case study (see `claude-opus-4.6_with_playwright_xhigh/IMPLEMENTATION_COMPARISON.md`) made clear that functional scores don't capture the full picture. Two implementations can both score 43/45 while having wildly different code structures. This rubric evaluates structural quality independently. Six dimensions, each scored 1–3 (18 max).

### Rubric Dimensions

| Dimension | 3 — Excellent | 2 — Adequate | 1 — Minimal |
|---|---|---|---|
| **Component Decomposition** | 5+ dedicated React component files (beyond pages) | 2–4 component files | 0–1 component files; monolithic pages |
| **CSS Architecture** | 5+ CSS files OR 500+ total CSS lines OR dedicated design token system | 2–4 CSS files OR 100–499 CSS lines | Under 100 total CSS lines or primarily inline styles |
| **Backend Error Handling** | 5+ try-catch blocks covering route handlers | 2–4 try-catch blocks | 0–1 try-catch blocks |
| **Frontend Robustness** | Dedicated API client module with `response.ok` checks | Inline `response.ok` checks in component files | No response checking; direct unchecked fetches |
| **Code Modularity** | Separate routes + db modules (backend) AND dedicated API client (frontend) | Separation on one axis only (backend routes OR frontend API client) | Monolithic server file, no API client |
| **DnD Robustness** | Position-sorted state management; drag works reliably first try | Card movement works or was fixed after prompting | Card movement permanently broken or causes crashes |

### Architecture Quality Scores

| # | Implementation | Decomp. | CSS | Error<br>Handling | Frontend<br>Robust. | Modularity | DnD | **AQ / 18** |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 1 | `claude_opus_4.7_xhigh_with_antigravity_prompt` | 3 | 3 | 3 | 3 | 3 | 2 | **17** |
| 2 | `claude_opus_4.7_with_playwright_xhigh` | 2 | 2 | 3 | 3 | 3 | 3 | **16** |
| 3 | `claude_opus_4.7_xhigh` | 3 | 2 | 3 | 3 | 3 | 2 | **16** |
| 4 | `antigravity_opus_4.6` | 1 | 3 | 3 | 3 | 3 | 2 | **15** |
| 5 | `antigravity_claude_sonnet_4.6` | 2 | 3 | 2 | 2 | 2 | 3 | **14** |
| 6 | `claude-opus-4.6_xhigh` | 2 | 3 | 2 | 2 | 2 | 3 | **14** |
| 7 | `claude_opus_4.7_high` | 2 | 2 | 1 | 3 | 3 | 2 | **13** |
| 8 | `claude_opus_4.7_with_playwright_high` | 2 | 2 | 1 | 3 | 3 | 2 | **13** |
| 9 | `claude_sonnet_4.7_high` | 2 | 3 | 3 | 1 | 2 | 2 | **13** |
| 10 | `antigravity_gemini_3.1_pro_high` | 1 | 2 | 3 | 1 | 2 | 3 | **12** |
| 11 | `antigravity_gemini_3.1_pro_low` | 1 | 2 | 3 | 1 | 2 | 3 | **12** |
| 12 | `claude_opus_4.6_xhigh_with_antigravity_prompt` | 2 | 3 | 1 | 2 | 2 | 2 | **12** |
| 13 | `claude_opus_4.6_high` | 2 | 3 | 1 | 2 | 2 | 1 | **11** |
| 14 | `claude_qwen_3.6_high_with_playwright` | 1 | 2 | 3 | 1 | 2 | 2 | **11** |
| 15 | `claude_sonnet_4.6_with_playwright_high` | 2 | 3 | 1 | 1 | 2 | 2 | **11** |
| 16 | `antigravity_gemini3_flash` | 1 | 2 | 3 | 1 | 1 | 2 | **10** |
| 17 | `claude-opus-4.6_with_playwright_high` | 2 | 2 | 1 | 1 | 2 | 2 | **10** |
| 18 | `claude-sonnet_4.6_xhigh` | 2 | 2 | 1 | 1 | 2 | 2 | **10** |
| 19 | `claude_qwen_coder_next_high_with_playwright` | 1 | 1 | 3 | 2 | 2 | 1 | **10** |
| 20 | `claude_sonnet_4.6_with_playwright_xhigh` | 2 | 1 | 1 | 1 | 1 | 3 | **9** |
| 21 | `claude-sonnet_4.6_xhigh_with_antigravity_prompt` | 1 | 2 | 1 | 1 | 1 | 2 | **8** |
| 22 | `claude-opus-4.6_with_playwright_xhigh` ★ | 1 | 1 | 1 | 1 | 1 | 1 | **6** |

★ `claude-opus-4.6_with_playwright_xhigh` is the subject of the detailed case study in `IMPLEMENTATION_COMPARISON.md`. Its 6/18 is the lowest score in the dataset and the clearest example of verification-enabled shortcut-taking degrading code architecture.

### Architecture Quality: Key Findings

**1. Playwright access correlates with worse architecture in Opus 4.6.** The same base model at the same effort level scores **14/18** architecture (without Playwright) vs. **6/18** with it. A gap of 8 points. The Playwright-enabled run produced 2 page components vs. 8 total files; 23 CSS lines (inline) vs. 467 lines across 8 component-specific CSS files; 0 server try-catch blocks vs. partial error handling; and DnD that crashes the app vs. position-sorted, robust state management. The tool meant to improve quality assurance degraded code structure by enabling a "verify visually and move on" strategy.

**2. The Antigravity prompt yields the best overall architecture.** `claude_opus_4.7_xhigh_with_antigravity_prompt` scores 17/18, the highest in the dataset. It combines strong component decomposition (5 components), a full CSS design system (1,012 lines across token, global, and component files), comprehensive backend error handling (5 try-catch blocks), a dedicated API client, and full code modularity.

**3. Opus 4.7 is architecturally more consistent than Opus 4.6.** All Opus 4.7 variants score 13–17/18. Even the lowest (13/18 for `with_playwright_high`) maintains proper API client separation and full code modularity. Opus 4.6 variants range from 6–14/18 with high variance, reflecting the model's inconsistency in applying architectural patterns without external guidance.

**4. Perfect functional scores don't guarantee good architecture.** `claude_sonnet_4.6_with_playwright_xhigh` (45/45 functional) scores only 9/18 AQ, near the bottom of the dataset. It ships a fully working app with 21 CSS lines, no API client module, no backend routes separation, and no error checking. Functional completeness and structural quality are independent dimensions.

**5. Backend error handling favours Antigravity and Gemini runs.** The models with the most robust server-side error handling (5+ try-catch blocks) are Antigravity Gemini 3.1 Pro, Antigravity Gemini Flash, Qwen 3.6, and select Opus 4.7 runs. Most Claude Code Sonnet and Opus 4.6 standalone runs have 0 try-catch blocks in their route handlers. It's a systematic gap across that tier.

**6. `claude_sonnet_4.7_high` is the architectural surprise.** It scores 13/18 despite being a non-premium configuration (High effort, no Playwright, no AG prompt). It gets there with comprehensive CSS (803 lines), a proper routes module with 5 try-catch blocks, and full backend error handling. Sonnet 4.7 learned architectural patterns that Sonnet 4.6 didn't.

---

## Visual Aesthetics Ratings

Each implementation was rated 1–5 based on direct review of dashboard and board page screenshots: visual polish, colour/typography coherence, layout quality, and professional feel.

| Rating | Meaning |
|--------|---------|
| 5 | Production-ready — branded, polished, dark/light theme with personality |
| 4 | Professional — clear design language, good colour use, cohesive |
| 3 | Functional — clean and usable but minimal styling, no strong identity |
| 2 | Basic — default-adjacent, sparse, or visible layout issues |
| 1 | Unstyled — raw browser defaults, UI bugs visible in screenshots |

| Implementation | Aesthetic Score | Style Notes |
|---|---|---|
| `claude_opus_4.7_xhigh_with_antigravity_prompt` | 5/5 | Dark gradient hero page with marketing tagline; colour-coded columns with avatar chips and timestamp badges; standout visual design |
| `claude-sonnet_4.6_xhigh_with_antigravity_prompt` | 5/5 | Dark gradient hero with "Run better retrospectives" marketing copy; colour-dot per column; polished board view |
| `antigravity_claude_sonnet_4.6` | 4/5 | Clean dark mode with branded navbar, card details view with structured layout |
| `antigravity_opus_4.6` | 4/5 | Dark-themed with avatar initials, colour-coded column headers (green/yellow/blue), user chip in nav |
| `claude_sonnet_4.6_with_playwright_high` | 4/5 | Bold indigo header bar, prominent branding, comment count badges on cards |
| `claude_sonnet_4.6_with_playwright_xhigh` | 4/5 | Strong indigo/blue header, clean column layout, dashed add-column affordance |
| `claude_sonnet_4.7_high` | 4/5 | Deep indigo header bar, clean white card surfaces, good vertical rhythm |
| `claude_opus_4.7_xhigh` | 3/5 | Minimal dark theme; functional but textarea inputs exposed inline on board; sparse |
| `claude_opus_4.7_high` | 3/5 | Clean light theme, inline comments work well, card layout readable |
| `claude_opus_4.7_with_playwright_high` | 3/5 | Plain light, basic typography, no strong branding |
| `claude_opus_4.7_with_playwright_xhigh` | 3/5 | Very minimal — plain "Retro Board" text nav, no colour accents beyond one blue button |
| `claude_opus_4.6_high` | 3/5 | Clean light with purple accent button, good spacing, readable |
| `claude-opus-4.6_with_playwright_high` | 3/5 | Clean light, minimal but well-structured column layout |
| `claude-sonnet_4.6_xhigh` | 3/5 | Light, clean columns, green Export CSV accent button |
| `claude-opus-4.6_xhigh` | 3/5 | Blue header bar, basic functional layout |
| `antigravity_gemini_3.1_pro_low` | 3/5 | Clean white with purple accents, decent card layout, functional |
| `claude_opus_4.6_xhigh_with_antigravity_prompt` | 2/5 | Dark but screenshot is very low resolution; text hard to read; layout cramped |
| `claude-opus-4.6_with_playwright_xhigh` | 2/5 | Completely unstyled — raw browser defaults, plain black hyperlinks, no CSS |
| `antigravity_gemini_3.1_pro_high` | 2/5 | Plain white, zero visual design, indistinguishable from raw HTML output |
| `antigravity_gemini3_flash` | 2/5 | Dark background but layout crowded to top-left corner; board view sparse |
| `claude_qwen_3.6_high_with_playwright` | 2/5 | Default browser styling, generic blue Create Board button, no visual identity |
| `claude_qwen_coder_next_high_with_playwright` | 1/5 | Completely unstyled; "Invalid Date" visible in dashboard; jarring green Add Column button |

### Aesthetic Finding: The Antigravity Prompt Dramatically Lifts Visual Quality

The two standout visual designs both used the Antigravity system prompt. They produced marketing-style hero pages with bold taglines, dark gradient themes, colour-coded columns, avatar chips, and relative timestamps. Default Claude runs produced clean-but-minimal UIs regardless of model version or effort level. The prompt itself contains strong UI/UX style guidance that overrides the model's default instinct to write working code first and worry about polish later.

---

## Score Summary Table (All 22 Implementations)

| # | Implementation | Model | Agent | Effort | Playwright | **Func / 45** | **AQ / 18** | Aesthetic/5 |
|---|---|---|---|---|---|---|---|---|
| 1 | antigravity_claude_sonnet_4.6 | Sonnet 4.6 | Antigravity | — | GPT-OSS 120B | **45** | 14 | 4 |
| 2 | antigravity_gemini3_flash | Gemini 3.1 Flash | Antigravity | — | No | 41 | 10 | 2 |
| 3 | antigravity_gemini_3.1_pro_high | Gemini 3.1 Pro | Antigravity | High | No | 43 | 12 | 2 |
| 4 | antigravity_gemini_3.1_pro_low | Gemini 3.1 Pro | Antigravity | Low | No | 43 | 12 | 3 |
| 5 | antigravity_opus_4.6 | Opus 4.6 | Antigravity | — | GPT-OSS 120B | 43 | 15 | 4 |
| 6 | claude-opus-4.6_with_playwright_high | Opus 4.6 | Claude Code | High | Yes | 43 | 10 | 3 |
| 7 | claude-opus-4.6_with_playwright_xhigh | Opus 4.6 | Claude Code | xHigh | Yes | 42 | **6** | 2 |
| 8 | claude-opus-4.6_xhigh | Opus 4.6 | Claude Code | xHigh | No | 43 | 14 | 3 |
| 9 | claude-sonnet_4.6_xhigh | Sonnet 4.6 | Claude Code | xHigh | No | 44 | 10 | 3 |
| 10 | claude-sonnet_4.6_xhigh_with_antigravity_prompt | Sonnet 4.6 | Claude Code | xHigh | No | 44 | 8 | 5 |
| 11 | claude_opus_4.6_high | Opus 4.6 | Claude Code | High | No | 41 | 11 | 3 |
| 12 | claude_opus_4.6_xhigh_with_antigravity_prompt | Opus 4.6 | Claude Code | xHigh | No | 44 | 12 | 2 |
| 13 | claude_opus_4.7_high | Opus 4.7 | Claude Code | High | No | **45** | 13 | 3 |
| 14 | claude_opus_4.7_with_playwright_high | Opus 4.7 | Claude Code | High | Yes | **45** | 13 | 3 |
| 15 | claude_opus_4.7_with_playwright_xhigh | Opus 4.7 | Claude Code | xHigh | Yes | **45** | 16 | 3 |
| 16 | claude_opus_4.7_xhigh | Opus 4.7 | Claude Code | xHigh | No | **45** | 16 | 3 |
| 17 | claude_opus_4.7_xhigh_with_antigravity_prompt | Opus 4.7 | Claude Code | xHigh | No | **45** | **17** | 5 |
| 18 | claude_qwen_3.6_high_with_playwright | Qwen 3.6 | Claude Code | High | Yes | 40 | 11 | 2 |
| 19 | claude_qwen_coder_next_high_with_playwright | Qwen Coder Next | Claude Code | High | Yes | 27 | 10 | 1 |
| 20 | claude_sonnet_4.6_with_playwright_high | Sonnet 4.6 | Claude Code | High | Yes | 42 | 11 | 4 |
| 21 | claude_sonnet_4.6_with_playwright_xhigh | Sonnet 4.6 | Claude Code | xHigh | Yes | **45** | 9 | 4 |
| 22 | claude_sonnet_4.7_high | Sonnet 4.7 | Claude Code | High | No | 42 | 13 | 4 |

---

## Key Findings

### 1. Opus 4.7 is the only model where every config scored perfect 45/45

All five Opus 4.7 runs (High, xHigh, with and without Playwright, with the Antigravity prompt) produced fully working implementations with zero manual fixes. No other base model did this. It's a step change from 4.6, which required at least one fix in every configuration tested.

### 2. Docker is the most common failure point, and the bugs are predictable

Docker broke in 11 of 22 runs. Two culprits kept showing up. First, `better-sqlite3` native compilation fails because Alpine Linux containers don't include the Python build tools the library needs. Second, Express 5 (now the npm default) removed the `app.get('*')` wildcard syntax, causing `PathError` crashes in containers. Models that chose `sql.js` (pure WASM) and knew about the Express 5 routing change got Docker right every time.

### 3. Card drag-and-drop is the hardest feature to get right on the first try

Moving cards between columns failed on the first attempt in 5 implementations. Failures ranged from silent no-ops to blank dashboards after a move to ghost duplicate cards. This feature requires tight coordination between the WebSocket broadcast, the database update, and React state. Any layer out of sync produces visible breakage.

### 4. Playwright improves functional outcomes but degrades architecture in the Opus 4.6 pair

This is the core paradox in the dataset. Comparing the same base model and effort level with and without Playwright: `claude-opus-4.6_xhigh` (no Playwright) scores 43/45 functional and **14/18 architecture**. `claude-opus-4.6_with_playwright_xhigh` (with Playwright) scores 42/45 functional and only **6/18 architecture**. The model with Playwright adopted a "write fast, verify visually, move on" strategy. Without it, the model compensated by building defensively upfront. The architectural gap wasn't caused by model capability; it was caused by the availability of the verification shortcut.

### 5. The Antigravity agent works for Sonnet 4.6 but doesn't close the gap for Opus 4.6

Antigravity (which uses a GPT-OSS 120B browser sub-agent for UI testing) delivered a perfect 45/45 for Sonnet 4.6, better than any standalone Sonnet 4.6 Claude Code run except xHigh with Playwright. But Antigravity Opus 4.6 still scored only 43/45. The agent's advantage is its ability to visually verify and fix issues. It can't substitute for model capability.

### 6. Perfect functional scores don't guarantee architectural quality

Three runs achieved 45/45 functional with very different architecture scores: `claude_opus_4.7_xhigh_with_antigravity_prompt` (17/18), `claude_opus_4.7_xhigh` (16/18), and `claude_sonnet_4.6_with_playwright_xhigh` (9/18). All three ship working apps. But only the first two ship maintainable ones. The Sonnet 4.6 Playwright xHigh run achieves functional parity with 21 lines of CSS, no API client module, no error handling, and no backend routes separation.

### 7. Non-Claude models performed worse overall

Gemini 3.1 Pro (high and low effort) scored 43/45 functional and 12/18 architecture. Solid backend error handling, minimal component structure. Gemini 3.1 Flash got 41/45 functional and 10/18 AQ. Qwen 3.6 reached 40/45 functional and 11/18 AQ at a $41 orchestration cost. Qwen Coder Next scored 27/45 functional (the worst result in the experiment) and 10/18 AQ at $179 in orchestration costs. Ironically, its TypeScript structure and 8 server-side try-catch blocks produce a respectable architecture score for what is otherwise the least functional implementation in the set.

### 8. Cost vs. quality is non-linear for API-based models

Opus 4.7 High cost $3.15 and scored perfect. Sonnet 4.6 xHigh cost $1.40 after fixes and scored 44/45. Sonnet 4.6 with Playwright at xHigh ($2.57) or any Opus 4.7 configuration ($3–6) are the most cost-effective paths to a working app. The Qwen orchestration overhead ($41–$179) exceeded the cost of the best API runs by 13–57x while delivering far worse results.

### 9. Effort mode (High vs. xHigh) has more impact on architecture than functional scores

For Opus 4.7, both High and xHigh hit 45/45 functional. Higher effort didn't add value there. But xHigh runs scored consistently higher on architecture (16/18 vs. 13/18 for Opus 4.7 without Playwright), suggesting the extra budget leads to more thoughtful structural choices. For Opus 4.6, xHigh outperformed High both functionally (43 vs. 41) and architecturally (14 vs. 11).

### 10. Visual aesthetics correlate with the Antigravity prompt, not model capability

The two standout visual designs both used the Antigravity prompt. Default Claude runs produced clean-but-minimal UIs regardless of model version or effort level. Opus 4.7 at xHigh without the prompt scored 3/5 aesthetic despite 45/45 functional. The prompt contains strong UI/UX style guidance that overrides the model's default "write working code first" instinct.

### 11. `sql.js` (WASM) is the reliable SQLite choice for agentic Docker deployments

`better-sqlite3` repeatedly caused Docker failures across multiple models and configurations. Models that chose `sql.js` avoided this entirely and shipped working containers on the first try. It's a meaningful architectural signal for future code generation benchmarks that want reliable containerisation.

---

## Recommendations

**Best first-shot functional results:** Use **Claude Opus 4.7** at any effort level. Perfect score across all tested configurations.

**Cost-conscious teams:** Use **Claude Sonnet 4.6 with Playwright at xHigh** (45/45 functional, $2.57). The implementation will have minimal architecture quality (9/18) but ships a fully working app.

**Maintainability and production readiness:** Use **Claude Opus 4.7 xHigh with the Antigravity prompt** (17/18 architecture, 45/45 functional, 5/5 aesthetic). It's the only configuration that achieves excellence on all three dimensions.

**Avoid:** Qwen Coder Next for full-stack agentic tasks. Poor functional results at extreme orchestration cost.

**Watch for:** Express 5 and `better-sqlite3` as predictable gotchas in Node.js agentic implementations. The community hasn't caught up to these breaking changes yet, and neither has training data for most models.
