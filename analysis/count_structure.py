#!/usr/bin/env python3
"""
count_structure.py - structural metrics for Tables 7 and 8 of the manuscript.

For each run directory given (or the Table 7/8 default sets), counts:
  - source files: *.js, *.jsx, *.ts, *.tsx
  - total source lines: line count of those files
  - CSS lines: line count of *.css files
excluding node_modules, dist, build, coverage, .git, package-lock.json, minified files and
source maps. Reproduces the published Table 7 (seven Opus 4.6 High base runs) and Table 8
(six Opus 4.7 base runs at each effort level) exactly; the tables sort rows by CSS lines.

Usage:   cd analysis && python3 count_structure.py [run_dir ...]
         (or REPO=/path/to/retrospective-board-eval python3 count_structure.py)
Needs:   Python 3.8+, standard library only.
"""
import os, re, sys, glob

HERE = os.path.dirname(os.path.abspath(__file__))
def _find_repo():
    """Locate the dataset repo holding <run>/EVALUATION_RUBRIC.md. Works whether this script
    sits inside the repo (analysis/) or beside it (a sibling working folder)."""
    for cand in (os.path.join(HERE, ".."), os.path.join(HERE, "..", "retrospective-board-eval")):
        if glob.glob(os.path.join(cand, "claude_*", "EVALUATION_RUBRIC.md")):
            return os.path.abspath(cand)
    raise SystemExit("dataset not found: set REPO=/path/to/retrospective-board-eval")
REPO = os.environ.get("REPO") or _find_repo()
EXCL = {"node_modules", "dist", "build", "coverage", ".git"}

TABLE7 = ["claude_opus_4.6_high"] + [f"claude_opus_4.6_high_run_{i}" for i in range(1, 7)]
TABLE8 = (["claude_opus_4.7_high"] + [f"claude_opus_4.7_high_run_{i}" for i in range(2, 7)]
        + ["claude_opus_4.7_xhigh"] + [f"claude_opus_4.7_xhigh_run_{i}" for i in range(2, 7)])

def metrics(root):
    js, css = [], []
    for dp, dns, fns in os.walk(root):
        dns[:] = [d for d in dns if d not in EXCL]
        for fn in fns:
            if fn == "package-lock.json" or fn.endswith(".min.js") or fn.endswith(".map"): continue
            p = os.path.join(dp, fn)
            if fn.endswith((".js", ".jsx", ".ts", ".tsx")): js.append(p)
            elif fn.endswith(".css"): css.append(p)
    def lines(paths): return sum(sum(1 for _ in open(p, encoding="utf-8", errors="replace")) for p in paths)
    return len(js), lines(js), lines(css)

def score(run):
    t = open(os.path.join(REPO, run, "EVALUATION_RUBRIC.md"), encoding="utf-8", errors="replace").read()
    m = re.search(r"Total Score:\*\*\s*(\d+)/42", t)
    return m.group(1) if m else "?"

def report(title, runs):
    print(f"\n{title}")
    print(f"{'run':50} score files srcLines cssLines")
    out = []
    for r in runs:
        f, sl, cl = metrics(os.path.join(REPO, r)); out.append((r, score(r), f, sl, cl))
    for r, s, f, sl, cl in sorted(out, key=lambda x: x[4]):   # sorted by CSS lines, as in the tables
        print(f"{r:50} {s:>5} {f:>5} {sl:>8} {cl:>8}")

if __name__ == "__main__":
    if sys.argv[1:]:
        report("Requested runs", sys.argv[1:])
    else:
        report("Table 7: Opus 4.6 High, base (sorted by CSS lines)", TABLE7)
        report("Table 8: Opus 4.7 High, base (sorted by CSS lines)", TABLE8[:6])
        report("Table 8: Opus 4.7 xHigh, base (sorted by CSS lines)", TABLE8[6:])
