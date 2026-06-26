#!/usr/bin/env python3
"""Regenerate index.html from the per-run EVALUATION_RUBRIC.md files.

Usage:
    python gen_report.py

Paths resolve relative to this script, so it can be run from anywhere. It reads
every <run_folder>/EVALUATION_RUBRIC.md, parses each run's config, 14 criterion
ratings, total, and session cost, and writes index.html (the interactive report).
Aesthetic ratings (1-5, screenshot review) for the rated runs are in AEST below.
"""
import os, glob, re, statistics as st
BASE = os.path.dirname(os.path.abspath(__file__))

# ---- parse all rubrics ----
runs = []
for f in sorted(glob.glob(BASE + "/*/EVALUATION_RUBRIC.md")):
    d = os.path.basename(os.path.dirname(f))
    if d == "template_directory":
        continue
    txt = open(f, encoding="utf-8", errors="replace").read()
    def hv(k):
        m = re.search(r'^%s[ \t]*(.*)$' % re.escape(k), txt, re.M)
        return m.group(1).strip() if m else ""
    crit = []
    for line in txt.splitlines():
        if re.match(r'^\|\s*\*\*(\d+)\*\*\s*\|', line):
            parts = line.split("|")
            rr = re.sub(r'[^0-9]', '', parts[4]) if len(parts) > 4 else ""
            crit.append(int(rr) if rr else None)
    tot = re.search(r'Total Score:\*\*\s*(\d+)/42', txt)
    cost = re.findall(r'Total cost:\s*\$([0-9]+\.[0-9]+)', txt)
    runs.append(dict(folder=d, model=hv("Model Name:"), agent=hv("Agent:"),
        effort=hv("Effort Mode:"), tool=hv("UI testing model/tool:"),
        prompt="Yes" if "antigravity" in d.lower() else "No",
        total=int(tot.group(1)) if tot else None,
        cost=float(cost[-1]) if cost else None, crit=crit))

# ---- aesthetic ratings (1-5), screenshot review ----
AEST = {
 "claude_opus_4.6_high_with_antigravity_prompt_run_2":4,"claude_opus_4.6_high_with_antigravity_prompt_run_3":4,
 "claude_opus_4.6_high_with_antigravity_prompt_run_4":4,"claude_opus_4.6_high_with_antigravity_prompt_run_5":5,
 "claude_opus_4.6_high_with_antigravity_prompt_run_6":4,
 "claude_opus_4.7_high_with_antigravity_prompt_run_4":4,"claude_opus_4.7_high_with_antigravity_prompt_run_5":5,
 "claude_opus_4.7_high_with_antigravity_prompt_run_6":5,
 "claude_opus_4.7_xhigh_with_antigravity_prompt_run_2":5,"claude_opus_4.7_xhigh_with_antigravity_prompt_run_3":5,
 "claude_opus_4.7_xhigh_with_antigravity_prompt_run_4":5,"claude_opus_4.7_xhigh_with_antigravity_prompt_run_5":4,
 "claude_opus_4.7_xhigh_with_antigravity_prompt_run_6":5,
 "claude_opus_4.7_high_run_4":3,"claude_opus_4.7_high_run_5":3,"claude_opus_4.7_high_run_6":3,
 "claude_opus_4.7_xhigh_run_2":3,"claude_opus_4.7_xhigh_run_3":3,"claude_opus_4.7_xhigh_run_4":3,
 "claude_opus_4.7_xhigh_run_5":3,"claude_opus_4.7_xhigh_run_6":3,
 "claude_opus_4.7_with_playwright_high_run_2":3,"claude_opus_4.7_with_playwright_high_run_3":3,
 "claude_opus_4.7_with_playwright_high_run_4":3,"claude_opus_4.7_with_playwright_high_run_5":3,
 "claude_opus_4.7_with_playwright_high_run_6":3,
 "claude_opus_4.7_with_playwright_xhigh_run_2":3,"claude_opus_4.7_with_playwright_xhigh_run_3":3,
 "claude_opus_4.7_with_playwright_xhigh_run_4":3,"claude_opus_4.7_with_playwright_xhigh_run_5":3,
 "claude_opus_4.7_with_playwright_xhigh_run_6":3,
}
CRIT_FULL = [
 ("Local Dev Environment","Does the local development environment come up without manual code changes?"),
 ("Docker Deployment","Does the Docker image build and run without errors?"),
 ("Home Page","Does the landing page load correctly and show the board dashboard?"),
 ("Board Creation","Can you create a new board with a custom title?"),
 ("User Identification","Can users identify themselves for the board?"),
 ("Card Interaction","Can you add cards to columns?"),
 ("Moving Cards","Can cards be moved between different columns?"),
 ("Commenting","Can users add comments to existing cards?"),
 ("Realtime Updates","Does a new card added to a board reflect in other browser windows instantly without refresh?"),
 ("Realtime Updates","Does a card moved to a different column reflect in other browser windows instantly without refresh?"),
 ("Realtime Updates","Does a new comment added to a card reflect in other browser windows instantly without refresh?"),
 ("Data Persistence","Does data survive a server reboot?"),
 ("Documentation","Is there documentation for the API and running the app?"),
 ("Export","Does the app export data to CSV?"),
]
rubric_rows = "".join(f'<tr><td class="num">{i+1}</td><td><b>{n}</b></td><td style="color:var(--text-2)">{q}</td></tr>' for i,(n,q) in enumerate(CRIT_FULL))

def shortmodel(m): return m.replace("Claude ","").strip()
def imgpaths(folder):
    dd=os.path.join(BASE,folder,"images")
    files=sorted(os.listdir(dd)) if os.path.isdir(dd) else []
    def pick(*pats):
        for p in pats:
            for ff in files:
                if p.lower() in ff.lower(): return folder+"/images/"+ff
        return ""
    dash=pick("MainDashboard","Dashboard","Main")
    board=pick("RetroBoard","Board")
    if not dash and files: dash=folder+"/images/"+files[0]
    return dash, board
def scoreclass(t):
    if t is None: return "na"
    if t>=42: return "s-perfect"
    if t>=39: return "s-good"
    if t>=37: return "s-mid"
    return "s-low"
def stars(a): return ("★"*a+"☆"*(5-a)) if a else ""

for r in runs:
    r["dash"],r["board"]=imgpaths(r["folder"]); r["aest"]=AEST.get(r["folder"]); r["mshort"]=shortmodel(r["model"])

N=len(runs); perfect=sum(1 for r in runs if r["total"]==42)
fam_order=["Claude Opus 4.7","Claude Opus 4.6","Claude Sonnet 4.6","Gemini","Qwen"]
def famkey(m):
    if "Opus 4.7" in m: return "Claude Opus 4.7"
    if "Opus 4.6" in m: return "Claude Opus 4.6"
    if "Sonnet 4.6" in m: return "Claude Sonnet 4.6"
    if "Gemini" in m: return "Gemini"
    if "Qwen" in m: return "Qwen"
    return m
fams={}
for r in runs: fams.setdefault(famkey(r["model"]),[]).append(r)
def sweepcell(eff,kind):
    if kind=="base": return [r for r in runs if "Opus 4.7" in r["model"] and r["effort"]==eff and "Playwright" not in r["tool"] and r["prompt"]=="No"]
    if kind=="PW": return [r for r in runs if "Opus 4.7" in r["model"] and r["effort"]==eff and "Playwright" in r["tool"] and r["prompt"]=="No"]
    return [r for r in runs if "Opus 4.7" in r["model"] and r["effort"]==eff and r["prompt"]=="Yes"]
sweep=[("High","base","High · base"),("High","PW","High · +Playwright"),("High","P","High · +design prompt"),
       ("xHigh","base","xHigh · base"),("xHigh","PW","xHigh · +Playwright"),("xHigh","P","xHigh · +design prompt")]

CSS = r"""
:root{--bg:#f5f4f1;--surface:#fff;--surface-2:#f9f8f6;--surface-3:#efede8;--border:rgba(0,0,0,.08);
--gold:#a06a00;--gold-light:#c99030;--gold-dim:rgba(160,106,0,.07);--blue:#1b5fbd;--blue-dim:rgba(27,95,189,.08);
--green:#127a4a;--green-dim:rgba(18,122,74,.1);--amber:#c97000;--amber-dim:rgba(201,112,0,.12);--red:#c23b2a;--red-dim:rgba(194,59,42,.1);
--text:#1a1916;--text-2:#595550;--muted:#9e9b96;--fd:'Playfair Display',Georgia,serif;--fb:'Inter',system-ui,sans-serif;--fm:'JetBrains Mono',monospace;}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}html{scroll-behavior:smooth}
body{background:var(--bg);color:var(--text);font-family:var(--fb);font-size:16px;line-height:1.6;-webkit-font-smoothing:antialiased}
a{color:var(--blue);text-decoration:none}
.hero{position:relative;overflow:hidden;padding:80px 60px 56px;border-bottom:1px solid var(--border);background:linear-gradient(155deg,#fdfcf9,#f0ede5)}
.hero::before{content:'';position:absolute;inset:0;background-image:radial-gradient(rgba(160,106,0,.045) 1px,transparent 1px);background-size:40px 40px}
.eyebrow{font-family:var(--fm);font-size:.72rem;font-weight:500;letter-spacing:.2em;text-transform:uppercase;color:var(--gold);margin-bottom:16px;position:relative}
.hero h1{font-family:var(--fd);font-size:clamp(2.2rem,5vw,3.6rem);font-weight:900;line-height:1.08;margin-bottom:18px;max-width:820px;position:relative}
.hero h1 em{font-style:italic;color:var(--gold)}
.hero-sub{color:var(--text-2);font-size:1.04rem;line-height:1.7;max-width:720px;margin-bottom:42px;position:relative}
.hero-stats{display:flex;gap:44px;flex-wrap:wrap;position:relative}
.stat-num{font-family:var(--fd);font-size:2.5rem;font-weight:900;line-height:1;color:var(--gold)}
.stat-label{font-size:.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:.12em;margin-top:4px}
nav{position:sticky;top:0;z-index:100;background:rgba(255,255,255,.92);backdrop-filter:blur(16px);box-shadow:0 1px 0 rgba(0,0,0,.08);padding:0 60px;height:52px;display:flex;align-items:center;gap:4px;flex-wrap:wrap;overflow-x:auto}
nav a{font-size:.8rem;color:var(--text-2);padding:6px 12px;border-radius:6px;white-space:nowrap}
nav a:hover{background:var(--gold-dim);color:var(--gold)}
section{padding:64px 60px;border-bottom:1px solid var(--border);max-width:1400px}
.section-eyebrow{font-family:var(--fm);font-size:.7rem;letter-spacing:.18em;text-transform:uppercase;color:var(--gold);margin-bottom:10px}
h2{font-family:var(--fd);font-size:2rem;font-weight:800;margin-bottom:14px;line-height:1.15}
.section-desc{color:var(--text-2);max-width:760px;margin-bottom:32px}
.req-list{columns:2;gap:40px;max-width:760px;color:var(--text-2);margin-left:18px}
table{border-collapse:collapse;width:100%;max-width:980px;font-size:.9rem}
th,td{text-align:left;padding:9px 14px;border-bottom:1px solid var(--border);vertical-align:top}
th{font-family:var(--fm);font-size:.68rem;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);font-weight:500}
td.num,th.num{text-align:center;font-variant-numeric:tabular-nums}
tr:hover td{background:var(--surface-2)}
.card-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:14px}
.card{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:16px 18px;cursor:pointer;transition:.15s;box-shadow:0 1px 4px rgba(0,0,0,.05)}
.card:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,0,0,.1);border-color:var(--gold-light)}
.card-top{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:8px}
.card-model{font-weight:700;font-size:.98rem}
.card-folder{font-family:var(--fm);font-size:.64rem;color:var(--muted);word-break:break-all;margin-bottom:10px}
.badge{display:inline-block;font-family:var(--fm);font-size:.62rem;padding:2px 7px;border-radius:20px;margin:0 4px 4px 0;letter-spacing:.03em}
.b-eff{background:var(--blue-dim);color:var(--blue)}.b-tool{background:var(--amber-dim);color:var(--amber)}
.b-prompt{background:var(--gold-dim);color:var(--gold)}.b-agent{background:var(--green-dim);color:var(--green)}
.score{font-family:var(--fd);font-weight:900;font-size:1.5rem;line-height:1;padding:4px 10px;border-radius:8px}
.s-perfect{background:var(--green-dim);color:var(--green)}.s-good{background:var(--blue-dim);color:var(--blue)}
.s-mid{background:var(--amber-dim);color:var(--amber)}.s-low{background:var(--red-dim);color:var(--red)}.na{background:var(--surface-3);color:var(--muted)}
.card-meta{display:flex;justify-content:space-between;font-size:.74rem;color:var(--muted);margin-top:10px;font-family:var(--fm)}
.stars{color:var(--gold-light);letter-spacing:1px}
.hm{overflow-x:auto;border:1px solid var(--border);border-radius:10px;background:var(--surface)}
.hm table{font-size:.7rem;min-width:920px}
.hm th{padding:6px 5px;font-size:.6rem;text-align:center}
.hm td{padding:0;text-align:center;border:1px solid rgba(0,0,0,.04)}
.hm .lbl{text-align:left;padding:4px 8px;font-family:var(--fm);font-size:.62rem;white-space:nowrap;color:var(--text-2)}
.cell{width:26px;height:22px;display:inline-block;line-height:22px;font-family:var(--fm);font-size:.62rem;color:#fff;border-radius:3px}
.c3{background:#2f9e6a}.c2{background:#d99022}.c1{background:#c23b2a}.c0{background:var(--surface-3);color:var(--muted)}
.bars{max-width:1000px}
.bar-row{display:grid;grid-template-columns:230px 1fr 80px;align-items:center;gap:12px;padding:3px 0;font-size:.78rem}
.bar-track{background:var(--surface-3);border-radius:4px;height:16px;position:relative;overflow:hidden}
.bar-fill{height:100%;border-radius:4px;background:linear-gradient(90deg,var(--gold-light),var(--gold))}
.bar-lbl{font-family:var(--fm);font-size:.68rem;color:var(--text-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bar-val{font-family:var(--fm);font-size:.72rem;text-align:right;color:var(--text-2)}
.find{display:grid;grid-template-columns:repeat(auto-fit,minmax(330px,1fr));gap:18px;max-width:1200px}
.find-card{background:var(--surface);border:1px solid var(--border);border-left:3px solid var(--gold);border-radius:10px;padding:20px 22px}
.find-card h3{font-family:var(--fd);font-size:1.15rem;margin-bottom:8px}
.find-card p{color:var(--text-2);font-size:.92rem}
.kpi{font-family:var(--fd);font-weight:900;color:var(--gold)}
.gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;max-width:1000px;margin-top:8px}
.gal{border:1px solid var(--border);border-radius:8px;overflow:hidden;background:var(--surface);cursor:pointer}
.gal img{width:100%;display:block;aspect-ratio:16/9;object-fit:cover;object-position:top}
.gal-cap{padding:6px 9px;font-family:var(--fm);font-size:.6rem;color:var(--muted);display:flex;justify-content:space-between}
.gal-grouphead{font-family:var(--fm);font-size:.72rem;font-weight:500;letter-spacing:.1em;text-transform:uppercase;color:var(--text-2);margin-bottom:12px;display:flex;align-items:center;gap:9px}
.gal-grouphead::before{content:'';width:22px;height:3px;border-radius:2px;background:var(--gold)}
.gal-grouphead.plain{color:var(--muted)}.gal-grouphead.plain::before{background:var(--muted)}
footer{padding:48px 60px;color:var(--muted);font-size:.82rem}
#lightbox{display:none;position:fixed;inset:0;z-index:9999;background:rgba(20,18,16,.82);backdrop-filter:blur(10px);align-items:center;justify-content:center}
#lightbox.open{display:flex}
#lb-inner{position:relative;background:var(--surface);box-shadow:0 8px 32px rgba(0,0,0,.3);border-radius:16px;padding:30px 34px;max-width:1100px;width:95vw;max-height:90vh;overflow-y:auto}
#lb-title{font-family:var(--fd);font-size:1.35rem;font-weight:700}#lb-sub{font-family:var(--fm);font-size:.7rem;color:var(--muted);margin-bottom:20px}
#lb-imgs{display:grid;grid-template-columns:1fr 1fr;gap:18px}#lb-imgs img{width:100%;border-radius:8px;border:1px solid var(--border)}
#lb-imgs .ph{aspect-ratio:16/10;background:var(--surface-3);border-radius:8px;display:flex;align-items:center;justify-content:center;color:var(--muted);font-family:var(--fm);font-size:.7rem}
#lb-close{position:absolute;top:14px;right:16px;background:none;border:1px solid var(--border);color:var(--muted);width:32px;height:32px;border-radius:50%;cursor:pointer}
@media(max-width:720px){.hero,nav,section,footer{padding-left:22px;padding-right:22px}.req-list{columns:1}.bar-row{grid-template-columns:150px 1fr 64px}}
"""

ranked=sorted(runs,key=lambda r:(-(r["total"] or 0), r["cost"] if r["cost"] else 999))
cards=[]
for r in ranked:
    b=[]
    if r["agent"]=="Antigravity": b.append('<span class="badge b-agent">Antigravity</span>')
    b.append(f'<span class="badge b-eff">{r["effort"] or "—"}</span>')
    if "Playwright" in r["tool"]: b.append('<span class="badge b-tool">Playwright</span>')
    if r["prompt"]=="Yes": b.append('<span class="badge b-prompt">Design prompt</span>')
    cost=f'${r["cost"]:.2f}' if r["cost"] else '—'
    aest=f'<span class="stars">{stars(r["aest"])}</span>' if r["aest"] else ''
    cards.append(f'<div class="card" data-title="{r["mshort"]}" data-sub="{r["folder"]}" data-dash="{r["dash"]}" data-board="{r["board"]}">'
        f'<div class="card-top"><div class="card-model">{r["mshort"]}</div><div class="score {scoreclass(r["total"])}">{r["total"]}</div></div>'
        f'<div class="card-folder">{r["folder"]}</div><div>{"".join(b)}</div>'
        f'<div class="card-meta"><span>{cost}</span>{aest}</div></div>')

hmhead="".join(f'<th title="{CRIT_FULL[i][0]}: {CRIT_FULL[i][1]}">{i+1}</th>' for i in range(14))
hmrows=[]
for r in ranked:
    cells=""
    for c in r["crit"]:
        cls={3:"c3",2:"c2",1:"c1"}.get(c,"c0")
        cells+=f'<td><span class="cell {cls}">{c if c else ""}</span></td>'
    hmrows.append(f'<tr><td class="lbl">{r["folder"]} · <b>{r["total"]}</b></td>{cells}</tr>')

sw=[]
for eff,kind,label in sweep:
    rs=sweepcell(eff,kind); sc=[r["total"] for r in rs if r["total"]]; cs=[r["cost"] for r in rs if r["cost"]]
    ae=[AEST[r["folder"]] for r in rs if r["folder"] in AEST]; perf=sum(1 for x in sc if x==42)
    sw.append(f'<tr><td>{label}</td><td class="num">{st.mean(sc):.1f}</td><td class="num">{perf}/{len(sc)}</td>'
              f'<td class="num">${st.median(cs):.2f}</td><td class="num">{(sum(ae)/len(ae)):.1f}</td></tr>')

fam=[]
for k in fam_order:
    rs=fams.get(k,[])
    if not rs: continue
    sc=[r["total"] for r in rs if r["total"]]; cs=[r["cost"] for r in rs if r["cost"]]
    crange=f'${min(cs):.2f}–{max(cs):.2f}' if cs else '—'
    fam.append(f'<tr><td><b>{k}</b></td><td class="num">{len(rs)}</td><td class="num">{st.mean(sc):.1f}</td>'
               f'<td class="num">{min(sc)}–{max(sc)}</td><td class="num">{crange}</td></tr>')

costruns=sorted([r for r in runs if r["cost"] and r["cost"]<20],key=lambda r:r["cost"])
maxc=max(r["cost"] for r in costruns)
bars=[]
for r in costruns:
    w=r["cost"]/maxc*100
    bars.append(f'<div class="bar-row"><span class="bar-lbl">{r["folder"]}</span>'
                f'<div class="bar-track"><div class="bar-fill" style="width:{w:.0f}%"></div></div>'
                f'<span class="bar-val">${r["cost"]:.2f} · {r["total"]}</span></div>')

galf_design=["claude_opus_4.7_xhigh_with_antigravity_prompt_run_4","claude_opus_4.7_high_with_antigravity_prompt_run_5","claude_opus_4.6_high_with_antigravity_prompt_run_5"]
galf_plain=["claude_opus_4.7_xhigh_run_3","claude_opus_4.7_with_playwright_high_run_3","claude_opus_4.7_high_run_6"]
byf={r["folder"]:r for r in runs}
def galtiles(folders):
    out=[]
    for fol in folders:
        r=byf.get(fol)
        if not r: continue
        out.append(f'<div class="gal" data-title="{r["mshort"]}" data-sub="{r["folder"]}" data-dash="{r["dash"]}" data-board="{r["board"]}">'
                   f'<img src="{r["dash"]}" loading="lazy" alt=""><div class="gal-cap"><span>{r["mshort"]}</span><span class="stars">{stars(r["aest"])}</span></div></div>')
    return "".join(out)
gal_design=galtiles(galf_design); gal_plain=galtiles(galf_plain)

HTML=f"""<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Realtime Retro Board — 72-Run Model Benchmark</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,800;0,900;1,400&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>{CSS}</style></head><body>
<div class="hero"><div class="eyebrow">Observational Study · v2.1 · {N} Runs</div>
<h1>One spec, <em>seventy-two</em> agentic builds of the same app</h1>
<p class="hero-sub">Every run received the identical real-time retrospective-board specification, scored on a 14-criterion functional rubric (42-point scale) and reviewed for visual quality. The dataset spans model generations, agent harnesses, reasoning-effort levels, a screenshot-testing tool, and a design-oriented prompt — with replicate runs to quantify run-to-run variation.</p>
<div class="hero-stats">
<div><div class="stat-num">{N}</div><div class="stat-label">Graded runs</div></div>
<div><div class="stat-num">{perfect}</div><div class="stat-label">Perfect 42/42</div></div>
<div><div class="stat-num">5</div><div class="stat-label">Model families</div></div>
<div><div class="stat-num">/42</div><div class="stat-label">14 criteria × 3</div></div></div></div>
<nav><a href="#overview">Overview</a><a href="#rubric">Rubric</a><a href="#sweep">Effort Sweep</a><a href="#rankings">All Runs</a><a href="#heatmap">Heatmap</a><a href="#findings">Findings</a><a href="#aesthetics">Aesthetics</a><a href="#costs">Cost</a><a href="#recs">Recommendations</a></nav>

<section id="overview"><div class="section-eyebrow">The Task</div><h2>One spec, {N} runs</h2>
<p class="section-desc">Each run built a self-hosted, real-time retrospective board (React/Vite + Node.js + Socket.io + SQLite) from the same OpenSpec. Requirements:</p>
<ul class="req-list"><li>Board creation &amp; listing (SQLite)</li><li>Configurable columns</li><li>Guest auth (display name)</li><li>Drag-and-drop cards between columns</li><li>Nested comments</li><li>Real-time WebSocket sync</li><li>Single-container Docker</li><li>CSV export</li><li>Developer documentation</li></ul>
<p class="section-desc" style="margin-top:18px">Claude Code runs were produced with <b>Claude Code v2.1.132</b>, using the <code>/opsx:apply</code> command to have the agent implement the OpenSpec specification.</p>
<table style="margin-top:24px"><thead><tr><th>Model family</th><th class="num">Runs</th><th class="num">Mean</th><th class="num">Range</th><th class="num">Cost</th></tr></thead><tbody>{"".join(fam)}</tbody></table>
<p class="section-desc" style="margin-top:14px;font-size:.85rem">Qwen ran locally at no inference charge; its dollar figures are Claude-orchestration overhead only.</p></section>

<section id="rubric"><div class="section-eyebrow">Scoring Instrument</div><h2>The 14-criterion rubric</h2>
<p class="section-desc">Every run is scored on the same 14 functional criteria, each rated 3 / 2 / 1; the run's total is their sum (42 max). The numbered columns in the heatmap below correspond to these criteria.</p>
<table><thead><tr><th class="num">#</th><th>Criterion</th><th>What it checks</th></tr></thead><tbody>{rubric_rows}</tbody></table>
<div style="margin-top:26px;display:flex;gap:14px;flex-wrap:wrap">
<div class="find-card" style="border-left-color:#2f9e6a;padding:14px 18px;max-width:320px"><b style="color:#2f9e6a">3 — Pass</b><p style="font-size:.86rem">Worked on the first try, no changes needed.</p></div>
<div class="find-card" style="border-left-color:#d99022;padding:14px 18px;max-width:320px"><b style="color:#c97000">2 — Fixed</b><p style="font-size:.86rem">Failed initially, fixed after one prompt to the agent.</p></div>
<div class="find-card" style="border-left-color:#c23b2a;padding:14px 18px;max-width:320px"><b style="color:#c23b2a">1 — Failed</b><p style="font-size:.86rem">Never fully worked despite prompting.</p></div>
</div></section>

<section id="sweep"><div class="section-eyebrow">Opus 4.7 Effort Sweep</div><h2>Effort buys what the tool didn't</h2>
<p class="section-desc">A 2 × 3 design — High/xHigh effort across base, +Playwright, and +design-prompt conditions, six replicates per cell. Raising effort from High to xHigh moves first-try-perfect from 28% to 89%; the screenshot tool moves cost, not score; the design prompt moves aesthetics, not score.</p>
<table><thead><tr><th>Cell</th><th class="num">Mean score</th><th class="num">First-try 42/42</th><th class="num">Cost (median)</th><th class="num">Aesthetics /5</th></tr></thead><tbody>{"".join(sw)}</tbody></table></section>

<section id="rankings"><div class="section-eyebrow">Score Rankings</div><h2>All {N} runs</h2>
<p class="section-desc">Sorted by total score, then cost. Click any card for its screenshots. Repeated configurations appear multiple times by design — that spread is the point.</p>
<div class="card-grid">{"".join(cards)}</div></section>

<section id="heatmap"><div class="section-eyebrow">Feature Heatmap</div><h2>Runs × 14 criteria</h2>
<p class="section-desc">Each cell is a criterion score (3 / 2 / 1); hover a column number for its definition. Rows sorted by total. Docker (col 2) and Local Dev (col 1) carry most of the misses.</p>
<div class="hm"><table><thead><tr><th class="lbl">Run · total</th>{hmhead}</tr></thead><tbody>{"".join(hmrows)}</tbody></table></div></section>

<section id="findings"><div class="section-eyebrow">Key Findings</div><h2>What the data shows</h2>
<div class="find">
<div class="find-card"><h3>Capability tier dominates</h3><p>Frontier models cluster near the 42 ceiling (family means ≈ 41); the cheap local model collapses to <span class="kpi">24–37</span> at 20–90× the orchestration cost. The tier gap dwarfs anything tools, prompt, or effort do within a tier (≤ 1–2 points).</p></div>
<div class="find-card"><h3>The tool adds cost, not reliability</h3><p>Playwright on vs off leaves functional score flat while raising cost <span class="kpi">+42–68%</span>. Playwright-High runs still failed on Docker — a fault a screenshot can't see.</p></div>
<div class="find-card"><h3>Effort buys first-try reliability</h3><p>Opus 4.7 High→xHigh: first-try-perfect rises <span class="kpi">28% → 89%</span> for ~10–30% more cost. The reliability the tool didn't deliver, effort did.</p></div>
<div class="find-card"><h3>Design prompt lifts aesthetics, not function</h3><p>Functional score unchanged; visual rating <span class="kpi">4.5 vs 3.0</span> (prompt vs none), independent of effort and tool.</p></div>
<div class="find-card"><h3>Variability is effort-sensitive</h3><p>At High, identical prompts scatter 39–42 (and 24–627 lines of CSS); xHigh compresses the functional scatter to a near-uniform 42.</p></div>
<div class="find-card"><h3>Docker &amp; npm are the dominant failures</h3><p><code>better-sqlite3</code> native builds and the Express 5 wildcard break most first-run containers. Capability and effort catch them; the tool doesn't.</p></div>
</div></section>

<section id="aesthetics"><div class="section-eyebrow">Visual Aesthetics</div><h2>The design prompt, not compute, drives polish</h2>
<p class="section-desc">Dashboards rated 1–5. Across the 31 newly rated runs, the <b>13 design-prompt runs average 4.5/5</b> vs <b>3.0/5</b> for the 18 non-design runs — a lift independent of effort (xHigh base = 3/5, identical to High base) and tool. The two labeled groups below show the contrast: design-prompt builds (marketing heroes, gradient themes, color-coded columns) vs default builds (clean but plain).</p>
<div class="gal-grouphead">With design prompt · avg 4.5 / 5</div>
<div class="gallery">{gal_design}</div>
<div class="gal-grouphead plain" style="margin-top:30px">No design prompt (default) · avg 3.0 / 5</div>
<div class="gallery">{gal_plain}</div></section>

<section id="costs"><div class="section-eyebrow">Cost Efficiency</div><h2>Score vs cost</h2>
<p class="section-desc">Final session cost (USD) after all fixes, low to high; bar scaled to the most expensive Claude API run. The two off-scale Qwen runs (local models, orchestration overhead only) are omitted here.</p>
<div class="bars">{"".join(bars)}</div></section>

<section id="recs"><div class="section-eyebrow">Recommendations</div><h2>What to use</h2>
<div class="find">
<div class="find-card"><h3>For reliable first-shot results</h3><p>A frontier model at <b>higher effort</b> — effort, not a UI-testing tool, is what removes first-run failures.</p></div>
<div class="find-card"><h3>Match resource to failure mode</h3><p>Don't add a screenshot tool expecting reliability; the dominant failures are build/environment issues it can't see. Spend on capability and effort.</p></div>
<div class="find-card"><h3>Use the design prompt for polish only</h3><p>It adds cost and aesthetics, not correctness — invoke it when visual quality matters.</p></div>
</div></section>

<footer>Observational dataset · {N} runs · 14-criterion / 42-point rubric · MIT-licensed · archived on Zenodo (see README). Generated by gen_report.py from the per-run EVALUATION_RUBRIC.md files.</footer>

<div id="lightbox"><div id="lb-inner"><button id="lb-close">&#x2715;</button><div id="lb-title"></div><div id="lb-sub"></div>
<div id="lb-imgs"><div><div style="font-family:var(--fm);font-size:.65rem;color:var(--muted);margin-bottom:6px">DASHBOARD</div><div id="lb-d"></div></div>
<div><div style="font-family:var(--fm);font-size:.65rem;color:var(--muted);margin-bottom:6px">BOARD</div><div id="lb-b"></div></div></div></div></div>
<script>
function img(s){{return s?'<img src="'+s+'" alt="">':'<div class="ph">no screenshot</div>';}}
document.querySelectorAll('.card,.gal').forEach(function(c){{c.addEventListener('click',function(){{
 document.getElementById('lb-title').textContent=c.dataset.title;
 document.getElementById('lb-sub').textContent=c.dataset.sub;
 document.getElementById('lb-d').innerHTML=img(c.dataset.dash);
 document.getElementById('lb-b').innerHTML=img(c.dataset.board);
 document.getElementById('lightbox').classList.add('open');}});}});
function closeLb(){{document.getElementById('lightbox').classList.remove('open');}}
document.getElementById('lb-close').addEventListener('click',closeLb);
document.getElementById('lightbox').addEventListener('click',function(e){{if(e.target.id==='lightbox')closeLb();}});
document.addEventListener('keydown',function(e){{if(e.key==='Escape')closeLb();}});
</script></body></html>"""

open(os.path.join(BASE,"index.html"),"w",encoding="utf-8").write(HTML)
print("OK index.html:",len(HTML),"bytes;",N,"runs;",perfect,"perfect")
