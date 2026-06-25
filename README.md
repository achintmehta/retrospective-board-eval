# Realtime Retrospective Board — Model & Agent Comparison Report

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.20789639.svg)](https://doi.org/10.5281/zenodo.20789639)

**🌐 [View the interactive report](https://achintmehta.github.io/retrospective-board-eval/)**

---

**Project:** Realtime Retrospective Board (Node.js + React + Socket.io + SQLite)  
**Evaluation Date:** May 2026  
**Number of Implementations:** 41

---

## The Task

Each implementation received the same OpenSpec: build a self-hosted, real-time retrospective board with a React/Vite frontend and a Node.js backend. Requirements included:

- Board creation and listing (SQLite persistence)
- Configurable columns per board
- Guest authentication (display name on join)
- Card management with drag-and-drop between columns
- Nested comments on cards
- Real-time sync via WebSockets (Socket.io) across all connected clients
- Docker deployment (single container)
- CSV export
- Developer documentation

The rubric scored each of 15 criteria as: **Pass/3** (worked first try), **Fail/2** (fixed after prompting), or **Fail/0–1** (could not be fixed).

---

## Scoring Key

| Rating | Meaning |
|--------|---------|
| 3 | Pass — worked without any changes |
| 2 | Fail — fixed after prompting the agent |
| 1 | Fail — partially fixed but still broken |
| 0 | Fail — could not be fixed at all |

---

## Results by Implementation

### Claude Opus 4.7 — Perfect Scores

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
| `antigravity_opus_4.6` | **41/45** | ✅ | ❌→✅ | ❌→✅ | ✅ | Docker build failed (gyp); card move bug fixed after prompting |
| `antigravity_gemini_3.1_pro_high` | **41/45** | ✅ | ❌→✅ | ✅ | ✅ | Docker: GLIBC mismatch + Express 5 wildcard routing bug |
| `antigravity_gemini_3.1_pro_low` | **41/45** | ✅ | ❌→✅ | ✅ | ✅ | Docker: TypeScript not compiled; Express 5 catch-all bug; CSV missing comment replies |
| `antigravity_gemini3_flash` | **38/45** | ❌ | ✅ | ✅ | ✅ | Would not start on first run; homepage then board page blank after fixes; wrong Docker volume docs |

### Claude Code Agent — Sonnet 4.6

| Implementation | Score / 45 | Local Dev | Docker | Card Move | Realtime | Notes |
|---|---|---|---|---|---|---|
| `claude_sonnet_4.6_with_playwright_xhigh` | **45/45** | ✅ | ✅ | ✅ | ✅ | Perfect; Playwright confirmed all features; $2.57 |
| `claude-sonnet_4.6_xhigh` | **44/45** | ❌→✅ | ✅ | ✅ | ✅ | better-sqlite3 native compile failed on Windows; switched to sql.js (WASM) |
| `claude_sonnet_4.6_with_playwright_high` | **41/45** | ✅ | ❌→✅ | ✅ | ✅ | Docker OK after fix; comment datatype mismatch in container never fully fixed (score 1) |
| `claude-sonnet_4.6_xhigh_with_antigravity_prompt` | **43/45** | ✅ | ✅ | ❌→✅ | ✅ | Drag-and-drop didn't work first try; fixed after prompting |
| `claude_sonnet_4.7_high` | **40/45** | ✅ | ❌→✅ | ✅ | ❌→✅ | Docker: invalid ELF header (cross-compile); realtime card/column updates needed fixing |

### Claude Code Agent — Opus 4.6

| Implementation | Score / 45 | Local Dev | Docker | Card Move | Realtime | Notes |
|---|---|---|---|---|---|---|
| `claude_opus_4.6_xhigh_with_antigravity_prompt` | **43/45** | ✅ | ❌→✅ | ✅ | ✅ | Docker: better-sqlite3 gyp failure |
| `claude-opus-4.6_xhigh` | **42/45** | ✅ | ❌→✅ | ✅ | ✅ | Docker volume mounted over /app; container persistence fix needed |
| `claude-opus-4.6_with_playwright_high` | **41/45** | ✅ | ❌→✅ | ❌→✅ | ✅ | Docker + card move both needed fixes; move left ghost duplicate card |
| `claude-opus-4.6_with_playwright_xhigh` | **40/45** | ✅ | ❌→✅ | ❌ | ✅ | Card move causes blank dashboard; couldn't be fully fixed (score 1) |
| `claude_opus_4.6_high` | **38/45** | ✅ | ❌→✅ | ❌ | ❌→✅ | Card move never fixed; realtime card add fixed after prompting |

### Non-Claude Models (Local — No Inference Cost)

| Implementation | Score / 45 | Local Dev | Docker | Card Move | Realtime | Notes |
|---|---|---|---|---|---|---|
| `claude_qwen_3.6_high` | **33/45** | ✅ | ❌→✅ | ❌→✅ | ✅ | Board creation broken; name input bug; comment crashed page. Local model — no inference cost |
| `claude_qwen_coder_next_high_with_playwright` | **16/45** | ❌→✅ | ❌→✅ | ❌ | ❌ | Most features broken or missing; worst overall result. Local model — no inference cost |

> **Note on Qwen costs:** Both Qwen runs used locally-hosted models. The dollar figures Claude Code reported ($41 and $178) reflect the cost of the **Claude orchestration layer** (Claude Opus 4.7 acting as the agent harness), not the Qwen model inference itself, which ran locally at no charge.

---

## Visual Aesthetics Ratings

Each implementation was rated 1–5 based on direct review of dashboard and board page screenshots, evaluating: visual polish, colour/typography coherence, layout quality, and professional feel.

| Rating | Meaning |
|--------|---------|
| 5 | Production-ready — branded, polished, dark/light theme with personality |
| 4 | Professional — clear design language, good colour use, cohesive |
| 3 | Functional — clean and usable but minimal styling, no strong identity |
| 2 | Basic — default-adjacent, sparse, or layout issues visible |
| 1 | Unstyled — raw browser defaults, UI bugs visible in screenshots |

| Implementation | Aesthetic Score | Style Notes |
|---|---|---|
| `claude_opus_4.7_xhigh_with_antigravity_prompt` | ⭐⭐⭐⭐⭐ 5/5 | Dark gradient hero page with marketing tagline; colour-coded columns with avatar chips and timestamp badges; standout visual design |
| `claude-sonnet_4.6_xhigh_with_antigravity_prompt` | ⭐⭐⭐⭐⭐ 5/5 | Dark gradient hero with "Run better retrospectives" marketing copy; colour-dot per column; polished board view |
| `antigravity_claude_sonnet_4.6` | ⭐⭐⭐⭐ 4/5 | Clean dark mode with branded navbar, card details view with structured layout |
| `antigravity_opus_4.6` | ⭐⭐⭐⭐ 4/5 | Dark themed with avatar initials, colour-coded column headers (green/yellow/blue), user chip in nav |
| `claude_sonnet_4.6_with_playwright_high` | ⭐⭐⭐⭐ 4/5 | Bold indigo header bar, prominent branding, comment count badges on cards |
| `claude_sonnet_4.6_with_playwright_xhigh` | ⭐⭐⭐⭐ 4/5 | Strong indigo/blue header, clean column layout, dashed add-column affordance |
| `claude_sonnet_4.7_high` | ⭐⭐⭐⭐ 4/5 | Deep indigo header bar, clean white card surfaces, good vertical rhythm |
| `claude_opus_4.7_xhigh` | ⭐⭐⭐ 3/5 | Minimal dark theme; functional but textarea inputs exposed inline on board; sparse |
| `claude_opus_4.7_high` | ⭐⭐⭐ 3/5 | Clean light theme, inline comments work well, card layout readable |
| `claude_opus_4.7_with_playwright_high` | ⭐⭐⭐ 3/5 | Plain light, basic typography, no strong branding |
| `claude_opus_4.7_with_playwright_xhigh` | ⭐⭐⭐ 3/5 | Very minimal — plain "Retro Board" text nav, no colour accents beyond one blue button |
| `claude_opus_4.6_high` | ⭐⭐⭐ 3/5 | Clean light with purple accent button, good spacing, readable |
| `claude-opus-4.6_with_playwright_high` | ⭐⭐⭐ 3/5 | Clean light, minimal but well-structured column layout |
| `claude-sonnet_4.6_xhigh` | ⭐⭐⭐ 3/5 | Light, clean columns, green Export CSV accent button |
| `claude-opus-4.6_xhigh` | ⭐⭐⭐ 3/5 | Blue header bar, basic functional layout |
| `antigravity_gemini_3.1_pro_low` | ⭐⭐⭐ 3/5 | Clean white with purple accents, decent card layout, functional |
| `claude_opus_4.6_xhigh_with_antigravity_prompt` | ⭐⭐ 2/5 | Dark but screenshot is very low resolution; text hard to read; layout cramped |
| `claude-opus-4.6_with_playwright_xhigh` | ⭐⭐ 2/5 | Completely unstyled — raw browser defaults, plain black hyperlinks, no CSS |
| `antigravity_gemini_3.1_pro_high` | ⭐⭐ 2/5 | Plain white, zero visual design, indistinguishable from raw HTML output |
| `antigravity_gemini3_flash` | ⭐⭐ 2/5 | Dark background but layout crowded to top-left corner; board view sparse |
| `claude_qwen_3.6_high` | ⭐⭐ 2/5 | Default browser styling, generic blue Create Board button, no visual identity |
| `claude_qwen_coder_next_high_with_playwright` | ⭐ 1/5 | Completely unstyled; "Invalid Date" visible in dashboard; jarring green Add Column button |

### Aesthetic Key Finding: The Antigravity Prompt Dramatically Lifts Visual Quality

The two strongest visual designs — `claude_opus_4.7_xhigh_with_antigravity_prompt` and `claude-sonnet_4.6_xhigh_with_antigravity_prompt` — both used the Antigravity system prompt. This prompt appears to encourage models to invest in visual design, branding, and UX copy (hero taglines, colour-coded columns, avatar indicators) in a way the default Claude prompt does not. Without it, even perfect-scoring implementations tend to produce functionally adequate but visually plain UIs.

---

## Score Summary Table (All 22 Implementations)

| # | Implementation | Model | Agent | Effort | Playwright | Score/45 | Aesthetic/5 |
|---|---|---|---|---|---|---|---|
| 1 | antigravity_claude_sonnet_4.6 | Sonnet 4.6 | Antigravity | — | GPT-OSS 120B | **45** | ⭐⭐⭐⭐ 4 |
| 2 | antigravity_gemini3_flash | Gemini 3.1 Flash | Antigravity | — | No | 38 | ⭐⭐ 2 |
| 3 | antigravity_gemini_3.1_pro_high | Gemini 3.1 Pro | Antigravity | High | No | 41 | ⭐⭐ 2 |
| 4 | antigravity_gemini_3.1_pro_low | Gemini 3.1 Pro | Antigravity | Low | No | 41 | ⭐⭐⭐ 3 |
| 5 | antigravity_opus_4.6 | Opus 4.6 | Antigravity | — | GPT-OSS 120B | 41 | ⭐⭐⭐⭐ 4 |
| 6 | claude-opus-4.6_with_playwright_high | Opus 4.6 | Claude | High | Yes | 41 | ⭐⭐⭐ 3 |
| 7 | claude-opus-4.6_with_playwright_xhigh | Opus 4.6 | Claude | xHigh | Yes | 40 | ⭐⭐ 2 |
| 8 | claude-opus-4.6_xhigh | Opus 4.6 | Claude | xHigh | No | 42 | ⭐⭐⭐ 3 |
| 9 | claude-sonnet_4.6_xhigh | Sonnet 4.6 | Claude | xHigh | No | 44 | ⭐⭐⭐ 3 |
| 10 | claude-sonnet_4.6_xhigh_with_antigravity_prompt | Sonnet 4.6 | Claude | xHigh | No | 43 | ⭐⭐⭐⭐⭐ 5 |
| 11 | claude_opus_4.6_high | Opus 4.6 | Claude | High | No | 38 | ⭐⭐⭐ 3 |
| 12 | claude_opus_4.6_xhigh_with_antigravity_prompt | Opus 4.6 | Claude | xHigh | No | 43 | ⭐⭐ 2 |
| 13 | claude_opus_4.7_high | Opus 4.7 | Claude | High | No | **45** | ⭐⭐⭐ 3 |
| 14 | claude_opus_4.7_with_playwright_high | Opus 4.7 | Claude | High | Yes | **45** | ⭐⭐⭐ 3 |
| 15 | claude_opus_4.7_with_playwright_xhigh | Opus 4.7 | Claude | xHigh | Yes | **45** | ⭐⭐⭐ 3 |
| 16 | claude_opus_4.7_xhigh | Opus 4.7 | Claude | xHigh | No | **45** | ⭐⭐⭐ 3 |
| 17 | claude_opus_4.7_xhigh_with_antigravity_prompt | Opus 4.7 | Claude | xHigh | No | **45** | ⭐⭐⭐⭐⭐ 5 |
| 18 | claude_qwen_3.6_high | Qwen 3.6 | Claude | High | Yes | 33 | ⭐⭐ 2 |
| 19 | claude_qwen_coder_next_high_with_playwright | Qwen Coder Next | Claude | High | Yes | 16 | ⭐ 1 |
| 20 | claude_sonnet_4.6_with_playwright_high | Sonnet 4.6 | Claude | High | Yes | 41 | ⭐⭐⭐⭐ 4 |
| 21 | claude_sonnet_4.6_with_playwright_xhigh | Sonnet 4.6 | Claude | xHigh | Yes | **45** | ⭐⭐⭐⭐ 4 |
| 22 | claude_sonnet_4.7_high | Sonnet 4.7 | Claude | High | No | 40 | ⭐⭐⭐⭐ 4 |

---

## Key Findings & Conclusions

### 1. Claude Opus 4.7 is the clear winner — all 5 configurations scored perfect 45/45
Every single Opus 4.7 run (at high or xHigh effort, with or without Playwright, with or without the Antigravity system prompt) produced a fully working implementation with zero manual fixes. This is a significant leap over Opus 4.6, which only achieved perfect scores in none of its runs.

### 2. Docker deployment is the single most common failure point
Docker broke in 11 of 22 implementations. The two culprits were nearly universal:
- **`better-sqlite3` native compilation failure** — the library requires Python and build tools that are absent in Alpine Linux containers. Models that proactively chose `sql.js` (pure WASM) avoided this entirely.
- **Express 5 breaking change** — Express 5 (now the npm default) removed the `app.get('*')` wildcard syntax, causing `PathError` crashes. Models unaware of this shipped broken containers.

The most robust implementations (Opus 4.7, Antigravity Sonnet 4.6) either avoided these libraries or caught and fixed them without prompting.

### 3. Card drag-and-drop is the hardest feature to get right on the first try
Moving cards between columns had the highest failure-on-first-attempt rate of any functional feature (5 implementations had bugs). Failures ranged from silent no-ops, to blank dashboards after a move, to ghost duplicate cards. This feature requires tight coordination between the WebSocket broadcast, the database update, and the React state — making it easy for one layer to be out of sync.

### 4. The Antigravity agent shines for Sonnet 4.6 but doesn't close the gap for Opus 4.6
The Antigravity agent (which uses a browser sub-agent for UI testing) delivered a perfect 45/45 for Sonnet 4.6 — a better result than any standalone Sonnet 4.6 Claude Code run except the xHigh+Playwright combo. However, Antigravity Opus 4.6 still scored only 41/45. This suggests the agent's advantage comes from its ability to visually verify and fix issues, but it can't compensate for model capability gaps.

### 5. The Antigravity system prompt helps Claude but doesn't dramatically change scores
Adding the Antigravity system prompt to Claude runs improved Docker reliability and code quality (more lines written, more thorough), but didn't push scores above what the base models achieved. Opus 4.7 xHigh scored 45 with and without the prompt.

### 6. Playwright UI testing correlates with, but doesn't guarantee, better outcomes
Playwright-enabled runs caught more runtime bugs (e.g., the Sonnet 4.6 xHigh+Playwright run was perfect), but not always. Sonnet 4.6 High+Playwright scored only 41 because a Docker-specific comment bug (SQLite datatype mismatch) couldn't be reproduced or fixed without the container environment context.

### 7. Non-Claude models performed significantly worse
- **Gemini 3.1 Pro** (high and low effort): Scored 41/45 — solid functional coverage but Docker reliability issues.
- **Gemini 3.1 Flash**: 38/45 — multiple startup failures and a blank UI required intervention.
- **Qwen 3.6**: 33/45 — multiple core features needed fixing; also the most expensive Claude run at $41 total.
- **Qwen Coder Next**: 16/45 — catastrophic failure; most features permanently broken despite spending $178. This is the worst result in the entire experiment, and far and away the most expensive.

### 8. Cost vs. quality is not linear (for API-based models)
Claude Opus 4.7 High cost **$3.15** and produced a perfect result. Claude Sonnet 4.6 xHigh cost **$1.40** after fixes and scored 44/45. The cheapest path to a working app is Claude Sonnet 4.6 (with Playwright at xHigh effort, $2.57) or any Opus 4.7 configuration (~$3–6).

**Important caveat on Qwen costs:** Both Qwen runs used locally-hosted models, so they incurred **no inference charges**. The $41 and $178 figures reported by Claude Code represent the cost of the Claude Opus 4.7 *orchestration layer* that was driving the agentic loop — not the Qwen model itself. This makes the Qwen results even more striking: not only did the local models underperform significantly, but the Claude orchestration overhead alone cost more than the best-performing API runs.

### 9. Effort mode (High vs. xHigh) has mixed impact
For Opus 4.7, both High and xHigh achieved 45/45, so higher effort didn't add value but also didn't hurt. For Opus 4.6, xHigh generally outperformed High (42 vs. 38), suggesting the extra thinking budget helped a weaker model more. For Sonnet, xHigh was clearly better (44–45 vs. 40–41).

### 10. Visual aesthetics correlate strongly with the Antigravity prompt, not model capability
After reviewing all 44 screenshots, the two standout visual designs — Opus 4.7 xHigh+Antigravity and Sonnet 4.6 xHigh+Antigravity — both used the Antigravity system prompt. These produced marketing-style hero pages with bold taglines ("Run team retrospectives that feel alive"), dark gradient themes, colour-coded columns with dot indicators, avatar chips, and relative timestamps. Default Claude runs without the Antigravity prompt consistently produced clean-but-minimal UIs regardless of model version or effort level. Opus 4.7 at xHigh without the prompt scored 3/5 aesthetic despite scoring 45/45 functional. The prompt itself appears to contain strong UI/UX style guidance that overrides the model's default "write working code" instinct.

Notably, `claude-opus-4.6_with_playwright_xhigh` produced a completely unstyled page (1–2/5 aesthetic) despite being an xHigh effort run — demonstrating that effort mode does not predict visual quality. And the functional failures (Qwen Coder Next) also corresponded with the worst visual quality (1/5), as a broken app tends not to have polished CSS either.

### 11. The most reliable SQLite choice was `sql.js` (WASM), not `better-sqlite3`
The `better-sqlite3` library repeatedly caused Docker failures across multiple models and configurations. Models that chose `sql.js` (a pure JavaScript/WASM SQLite port) avoided this entirely and shipped working containers on the first try. This is a meaningful architectural signal for future code generation benchmarks.

---

## Recommendations

**For best first-shot results:** Use **Claude Opus 4.7** at any effort level — perfect score guaranteed across all tested configurations.

**For cost-conscious teams:** Use **Claude Sonnet 4.6 with Playwright at xHigh** — perfect score at ~$2.57.

**Avoid:** Qwen Coder Next for full-stack agentic tasks — poor results at extreme cost.

**Watch for:** Express 5 and `better-sqlite3` as common gotchas in Node.js agentic implementations — the community hasn't yet updated training data/conventions for these breaking changes.
