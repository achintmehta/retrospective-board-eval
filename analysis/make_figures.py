#!/usr/bin/env python3
"""
make_figures.py - regenerate every figure used in the manuscript.

Usage:
    cd analysis && python3 make_figures.py
    # outputs PNGs into ./figs (override with the OUTDIR environment variable)

Requirements:
    pip install matplotlib numpy
    The per-run EVALUATION_RUBRIC.md files are read from REPO (the dataset repo).
    Visual quality ratings are read from ./aesthetic_ratings.csv (one row per run).

To change a figure, edit the CONFIG block below (run selections for the screenshot
grid, colors, or sizes) and re-run. To change a rating, edit aesthetic_ratings.csv.
Each figure is produced by its own function, so they can be tweaked independently.
"""
import os, glob, re, csv, statistics as st
import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt, matplotlib.image as mpimg
import numpy as np

# =================== CONFIG (edit me) ===================
HERE   = os.path.dirname(os.path.abspath(__file__))
# Dataset repo that holds the <run>/EVALUATION_RUBRIC.md files and <run>/images/*.png:
def _find_repo():
    """Locate the dataset repo holding <run>/EVALUATION_RUBRIC.md. Works whether this script
    sits beside that repo (manuscript folder) or inside it (analysis/)."""
    for cand in (os.path.join(HERE, ".."), os.path.join(HERE, "..", "retrospective-board-eval")):
        if glob.glob(os.path.join(cand, "claude_*", "EVALUATION_RUBRIC.md")):
            return os.path.abspath(cand)
    return os.path.join(HERE, "..", "retrospective-board-eval")
REPO   = os.environ.get("REPO") or _find_repo()
OUTDIR = os.environ.get("OUTDIR", os.path.join(HERE, "figs"))
# Output resolution for saved figures. PeerJ asks for at least 900 px wide and prefers ~3000 px.
DPI    = int(os.environ.get("DPI", "600"))
# The screenshot grid is built from raster screenshots, so resolution above the source adds
# file size but no detail. 300 already clears PeerJ's preferred width.
GRID_DPI = int(os.environ.get("GRID_DPI", "300"))
RATINGS_CSV = os.path.join(HERE, "aesthetic_ratings.csv")

# Figure 5 screenshot grid: GRID[row][col] = run folder; image used is <folder>/images/MainDashboard.png
GRID = [
 ["claude_opus_4.6_high", "claude_opus_4.6_with_playwright_high", "claude_opus_4.6_high_with_antigravity_prompt_run_5", "claude_opus_4.6_high_abridged_prompt"],
 ["claude_opus_4.7_high", "claude_opus_4.7_with_playwright_high", "claude_opus_4.7_high_with_antigravity_prompt_run_3", "claude_opus_4.7_high_abridged_prompt"],
 ["claude_opus_4.7_xhigh","claude_opus_4.7_with_playwright_xhigh","claude_opus_4.7_xhigh_with_antigravity_prompt_run_2", "claude_opus_4.7_xhigh_abridged_prompt"],
]
GRID_ROWS = ["Opus 4.6 · High", "Opus 4.7 · High", "Opus 4.7 · xHigh"]
GRID_COLS = ["Base prompt", "With Playwright", "Full design prompt", "Abridged prompt"]

GREEN="#127a4a"; BLUE="#1b5fbd"; GOLD="#a06a00"; AMBER="#c97000"; RED="#c23b2a"; PURPLE="#6d28d9"; GREY="#7f7c76"
# =======================================================

os.makedirs(OUTDIR, exist_ok=True)
plt.rcParams.update({"font.family":"DejaVu Sans","font.size":10,
                     "axes.spines.top":False,"axes.spines.right":False,
                     "figure.dpi":150,"savefig.dpi":DPI})

def load_ratings():
    d={}
    if os.path.exists(RATINGS_CSV):
        with open(RATINGS_CSV, newline="") as f:
            for i,row in enumerate(csv.reader(f)):
                if i==0 or not row: continue
                d[row[0].strip()]=int(row[1])
    return d
AEST = load_ratings()

def load_runs():
    runs=[]
    for f in sorted(glob.glob(os.path.join(REPO,"*","EVALUATION_RUBRIC.md"))):
        d=os.path.basename(os.path.dirname(f))
        if d=="template_directory": continue
        txt=open(f,encoding="utf-8",errors="replace").read()
        def hv(k):
            m=re.search(r'^%s[ \t]*(.*)$'%re.escape(k),txt,re.M); return m.group(1).strip() if m else ""
        tot=re.search(r'Total Score:\*\*\s*(\d+)/42',txt); cost=re.findall(r'Total cost:\s*\$([0-9]+\.[0-9]+)',txt)
        runs.append(dict(folder=d, model=hv("Model Name:"), effort=hv("Effort Mode:"),
            tool=hv("UI testing model/tool:"), prompt="Yes" if "antigravity" in d.lower() else ("Abridged" if "abridged" in d.lower() else "No"),
            total=int(tot.group(1)) if tot else None, cost=float(cost[-1]) if cost else None))
    return runs

def sel(runs, msub, effort=None, tool=None, prompt=None):
    out=[]
    for r in runs:
        if msub not in r["model"]: continue
        if effort and r["effort"]!=effort: continue
        if tool=="PW" and "Playwright" not in r["tool"]: continue
        if tool=="none" and "Playwright" in r["tool"]: continue
        if prompt=="yes" and r["prompt"]!="Yes": continue
        if prompt=="no" and r["prompt"]!="No": continue
        out.append(r)
    return out

def fig_tier(runs):
    fig,ax=plt.subplots(figsize=(6.4,3.7))
    for name,col in [("Sonnet 4.6",GREEN),("Opus 4.6",BLUE),("Opus 4.7",PURPLE),("Gemini",AMBER),("Qwen",RED)]:
        pts=[(r["cost"],r["total"]) for r in runs if name in r["model"] and r["cost"] and r["total"]]
        if not pts: continue
        xs=[p[0] for p in pts]; ys=np.array([p[1] for p in pts],float)+np.random.default_rng(1).normal(0,0.06,len(pts))
        ax.scatter(xs,ys,color=col,label=name,s=34,alpha=.8)
    ax.set_xscale("log"); ax.set_xlabel("Session cost (USD, log scale)"); ax.set_ylabel("Functional score (out of 42)")
    ax.set_title("Capability tier sets the score; cost varies widely within a tier",fontsize=10.5)
    ax.legend(fontsize=8,loc="lower center",ncol=3); ax.set_ylim(22,43)
    fig.tight_layout(); fig.savefig(os.path.join(OUTDIR,"fig_tier.png"),bbox_inches="tight"); plt.close(fig)

def _dot_column(ax, x0, vals, color, discrete, spread=0.055, jitter=0.07):
    """All runs as individual points. Identical values fan out symmetrically so the
    pile-up at the ceiling is visible instead of being hidden inside a quartile box."""
    if discrete:
        from collections import Counter
        for v, n in sorted(Counter(vals).items()):
            offs = (np.arange(n) - (n - 1) / 2) * spread
            ax.plot(x0 + offs, [v] * n, "o", ms=7, mfc=color, mec="white", mew=1.6,
                    linestyle="none", zorder=3)
    else:
        rng = np.random.default_rng(0)                       # fixed seed: figure is reproducible
        ax.plot(x0 + rng.uniform(-jitter, jitter, len(vals)), vals, "o", ms=7,
                mfc=color, mec="white", mew=1.6, linestyle="none", zorder=3)

def fig_tool(runs):
    base=sel(runs,"Opus 4.7",tool="none",prompt="no"); pw=sel(runs,"Opus 4.7",tool="PW",prompt="no")
    bs=[r["total"] for r in base]; ps=[r["total"] for r in pw]
    bc=[r["cost"] for r in base if r["cost"]]; pc=[r["cost"] for r in pw if r["cost"]]
    INK="#3d3a35"
    fig,(a1,a2)=plt.subplots(1,2,figsize=(7.4,3.6))
    panels=[(a1,[bs,ps],"Functional score (out of 42)","Quality: no difference of practical size",
             True, st.mean, "mean {:.2f}"),
            (a2,[bc,pc],"Session cost (USD)","Cost: higher with the tool",
             False, st.median, "median ${:.2f}")]
    for ax,(d0,d1),ylab,ttl,discrete,summ,lblfmt in panels:
        for x0,vals,c in [(1,d0,GREY),(2,d1,PURPLE)]:
            _dot_column(ax,x0,vals,c,discrete)
            m=summ(vals)
            ax.hlines(m,x0-0.20,x0+0.20,color=INK,lw=2,zorder=4)
            # label sits just right of the group's own summary line, which spans only that column
            ax.annotate(lblfmt.format(m),(x0+0.23,m),va="center",ha="left",
                        fontsize=8.5,color=INK,zorder=5)
        ax.set_xticks([1,2]); ax.set_xticklabels(["No tool","Playwright"])
        ax.set_xlim(0.62,2.98); ax.set_ylabel(ylab); ax.set_title(ttl,fontsize=9.5)
        ax.yaxis.grid(True,color="#e6e4e0",lw=0.8); ax.set_axisbelow(True)
    a1.set_ylim(38.4,42.6); a1.set_yticks([39,40,41,42])
    fig.suptitle("Adding the screenshot tool (Opus 4.7, both effort levels, n=12 per group)",fontsize=10.5)
    fig.tight_layout(rect=[0,0,1,.94]); fig.savefig(os.path.join(OUTDIR,"fig_tool.png"),bbox_inches="tight"); plt.close(fig)

def fig_effort(runs):
    o47=[r for r in runs if "Opus 4.7" in r["model"]]
    def cell(eff, cond):
        out=[]
        for r in o47:
            if r["effort"]!=eff: continue
            if cond=="abridged" and r["prompt"]=="Abridged": out.append(r)
            elif cond=="design" and r["prompt"]=="Yes": out.append(r)
            elif cond=="pw" and r["prompt"]=="No" and "Playwright" in r["tool"]: out.append(r)
            elif cond=="base" and r["prompt"]=="No" and "Playwright" not in r["tool"]: out.append(r)
        return out
    conds=["base","pw","design","abridged"]
    labels=["Base","+Playwright","+Full design\nprompt","+Abridged\nprompt\n(ablation)"]
    def perf(rs): return [sum(1 for r in rs if r["total"]==42), len(rs)]
    hi=[perf(cell("High",c)) for c in conds]; xi=[perf(cell("xHigh",c)) for c in conds]
    sweep_hi=[r for r in o47 if r["effort"]=="High" and r["prompt"]!="Abridged"]
    sweep_xi=[r for r in o47 if r["effort"]=="xHigh" and r["prompt"]!="Abridged"]
    medc=lambda rs:st.median([r["cost"] for r in rs if r["cost"]])
    fig,(a1,a2)=plt.subplots(1,2,figsize=(8.6,3.6),gridspec_kw={"width_ratios":[1.5,1]})
    x=np.arange(4); w=0.36
    a1.bar(x-w/2,[100*a/b for a,b in hi],w,color=GREY,alpha=.75,label="High")
    a1.bar(x+w/2,[100*a/b for a,b in xi],w,color=PURPLE,alpha=.75,label="xHigh")
    for xi_,(a,b) in zip(x-w/2,hi): a1.text(xi_,100*a/b+2.5,f"{a}/{b}",ha="center",fontsize=8.5)
    for xi_,(a,b) in zip(x+w/2,xi): a1.text(xi_,100*a/b+2.5,f"{a}/{b}",ha="center",fontsize=8.5)
    a1.axvline(2.5,color="#bbbbbb",lw=1,ls="--")
    a1.set_xticks(x); a1.set_xticklabels(labels,fontsize=8.5)
    a1.set_ylabel("Runs perfect on first try (%)"); a1.set_ylim(0,112); a1.set_yticks([0,25,50,75,100])
    a1.set_title("Effort helps, except under a design prompt",fontsize=10)
    a1.legend(fontsize=8.5,loc="upper right",framealpha=0.9)
    a2.bar(["High","xHigh"],[medc(sweep_hi),medc(sweep_xi)],color=[GREY,PURPLE],alpha=.7)
    for i,v in enumerate([medc(sweep_hi),medc(sweep_xi)]): a2.text(i,v+.1,f"${v:.2f}",ha="center",fontsize=10)
    a2.set_ylabel("Median session cost (USD)"); a2.set_title("Cost rises modestly (sweep)",fontsize=10)
    fig.suptitle("Reasoning effort: High vs xHigh (Opus 4.7)",fontsize=10.5)
    fig.tight_layout(rect=[0,0,1,.93]); fig.savefig(os.path.join(OUTDIR,"fig_effort.png"),bbox_inches="tight"); plt.close(fig)

def fig_aesthetics():
    # Strip plot: each small dot is one run; the large diamond marks the group mean.
    # Design group = Claude Code runs supplied the design prompt (_with_antigravity_prompt);
    # no-design group = all runs without the prompt (the 5 Antigravity-agent runs are excluded
    # and reported in S1 Table). The y-axis is zoomed to 3-5 to make the clusters identifiable.
    des=[v for k,v in AEST.items() if "_with_antigravity_prompt" in k]
    abr=[v for k,v in AEST.items() if "abridged" in k.lower()]
    nod=[v for k,v in AEST.items() if "antigravity" not in k.lower() and "abridged" not in k.lower()]
    rng=np.random.default_rng(7)
    fig,ax=plt.subplots(figsize=(8.2,6.6))
    # Bold, high-contrast, colorblind-safe: vermillion-orange (design) / teal (abridged) vs deep blue (no design)
    for x,vals,col,dark,w in [(1,des,"#D55E00","#8a3b00",0.26),(1.85,abr,"#009E73","#00543d",0.2),(2.7,nod,"#0072B2","#00405c",0.42)]:
        xs=x+rng.uniform(-w,w,len(vals))
        ax.scatter(xs,vals,s=34,color=col,alpha=0.9,edgecolors="white",linewidths=0.6,zorder=3)
        m=st.mean(vals)
        ax.scatter([x],[m],s=270,marker="D",color=dark,edgecolors="black",linewidths=1.4,zorder=5)
        ax.annotate(f"mean {m:.2f}",(x,m),xytext=(x,m+0.17),ha="center",va="bottom",fontsize=12,fontweight="bold")
    ax.set_xticks([1,1.85,2.7]); ax.set_xticklabels([f"Full design prompt\n(Claude Code, n={len(des)})",
                                              f"Abridged prompt\n(n={len(abr)})",
                                              f"No design prompt\n(n={len(nod)})"],fontsize=11)
    ax.set_xlim(0.4,3.3); ax.set_ylim(2.8,5.35); ax.set_yticks([3,4,5])
    ax.set_ylabel("Aesthetic rating (1 to 5)")
    ax.set_title("Visual quality by design prompt: each small dot is one run",fontsize=12.5)
    ax.grid(axis="y",alpha=0.25)
    fig.tight_layout(); fig.savefig(os.path.join(OUTDIR,"fig_aesthetics.png"),bbox_inches="tight"); plt.close(fig)

ABRIDGED_GRID = [
 ["claude_opus_4.6_high_with_antigravity_prompt_run_5", "claude_opus_4.6_high_abridged_prompt"],
 ["claude_opus_4.7_high_with_antigravity_prompt_run_3", "claude_opus_4.7_high_abridged_prompt"],
]
ABR_ROWS = ["Opus 4.6 · High", "Opus 4.7 · High"]
ABR_COLS = ["Full Antigravity prompt", "Abridged prompt"]

def fig_abridged():
    fig,axes=plt.subplots(2,2,figsize=(9.2,5.8))
    for i in range(2):
        for j in range(2):
            ax=axes[i][j]; p=os.path.join(REPO,ABRIDGED_GRID[i][j],"images","MainDashboard.png")
            try: ax.imshow(mpimg.imread(p))
            except Exception: ax.text(.5,.5,"(screenshot unavailable)",ha="center",transform=ax.transAxes,color=GREY)
            ax.set_xticks([]); ax.set_yticks([])
            for s2 in ax.spines.values(): s2.set_edgecolor("#bbbbbb")
            if i==0: ax.set_title(ABR_COLS[j],fontsize=13,fontweight="bold")
            if j==0: ax.set_ylabel(ABR_ROWS[i],fontsize=13,fontweight="bold")
    fig.tight_layout(); fig.savefig(os.path.join(OUTDIR,"fig_abridged_grid.png"),dpi=GRID_DPI,bbox_inches="tight"); plt.close(fig)

def fig_grid():
    fig,axes=plt.subplots(3,4,figsize=(14.6,7.6))
    for i in range(3):
        for j in range(4):
            ax=axes[i][j]; p=os.path.join(REPO,GRID[i][j],"images","MainDashboard.png")
            try: ax.imshow(mpimg.imread(p))
            except Exception: ax.text(.5,.5,"(screenshot unavailable)",ha="center",transform=ax.transAxes,color=GREY)
            ax.set_xticks([]); ax.set_yticks([])
            for s in ax.spines.values(): s.set_edgecolor("#bbbbbb")
            if i==0: ax.set_title(GRID_COLS[j],fontsize=13,fontweight="bold")
            if j==0: ax.set_ylabel(GRID_ROWS[i],fontsize=13,fontweight="bold")
    fig.tight_layout(); fig.savefig(os.path.join(OUTDIR,"fig_opus_grid.png"),dpi=GRID_DPI,bbox_inches="tight"); plt.close(fig)

if __name__ == "__main__":
    runs = load_runs()
    print(f"Loaded {len(runs)} runs from {REPO}; {len(AEST)} ratings from CSV")
    fig_tier(runs); fig_tool(runs); fig_effort(runs); fig_aesthetics(); fig_grid()
    # Copies under the names used in the submission (Figure 1 ... Figure 5).
    import shutil
    FIGURE_NAMES = {"fig_tier.png": "Figure_1.png", "fig_tool.png": "Figure_2.png", "fig_effort.png": "Figure_3.png",
                    "fig_aesthetics.png": "Figure_4.png", "fig_opus_grid.png": "Figure_5.png"}
    for src, dst in FIGURE_NAMES.items():
        shutil.copyfile(os.path.join(OUTDIR, src), os.path.join(OUTDIR, dst))
    print("Figures written to", OUTDIR)
    for f in sorted(os.listdir(OUTDIR)):
        print("  ", f)
