#!/usr/bin/env python3
"""
derive_manuscript_numbers.py - recompute every number quoted in the manuscript from the
per-run rubric files and the visual-rating CSV, and write manuscript_numbers_derivation.md
showing the arithmetic behind each one.

Usage:   cd analysis && python3 derive_manuscript_numbers.py
         (or REPO=/path/to/retrospective-board-eval python3 derive_manuscript_numbers.py)
Reads:   REPO/<run>/EVALUATION_RUBRIC.md   (criterion ratings, session cost, token/time report)
         ./aesthetic_ratings.csv            (holistic 1-5 visual rating per run)
Writes:  ./manuscript_numbers_derivation.md
Needs:   Python 3.8+, standard library only. If scipy is installed the hand-rolled Fisher exact
         test is cross-checked against scipy.stats.fisher_exact.

Tables 7 and 8 (source files / lines / CSS per run) are produced by count_structure.py, and the
design-treatment measures by count_design_markers.py; both read the run source trees rather than
the rubrics and are not rederived here.
"""
import os, re, csv, glob, statistics as st
from math import comb, sqrt
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
def _find_repo():
    """Locate the dataset repo holding <run>/EVALUATION_RUBRIC.md. Works whether this script
    sits inside the repo (analysis/) or beside it (a sibling working folder)."""
    for cand in (os.path.join(HERE, ".."), os.path.join(HERE, "..", "retrospective-board-eval")):
        if glob.glob(os.path.join(cand, "claude_*", "EVALUATION_RUBRIC.md")):
            return os.path.abspath(cand)
    raise SystemExit("dataset not found: set REPO=/path/to/retrospective-board-eval")
REPO = os.environ.get("REPO") or _find_repo()
OUT = os.environ.get("OUT", os.path.join(HERE, "manuscript_numbers_derivation.md"))

def parse_num(s):
    s = s.replace(",", "")
    if s.endswith("k"): return float(s[:-1]) * 1e3
    if s.endswith("m"): return float(s[:-1]) * 1e6
    return float(s)

def parse_min(s):
    h = re.search(r"(\d+)h", s); m = re.search(r"(\d+)m", s); sec = re.search(r"(\d+)s", s)
    return (int(h.group(1))*60 if h else 0) + (int(m.group(1)) if m else 0) + (int(sec.group(1))/60 if sec else 0)

runs = {}
for f in sorted(glob.glob(os.path.join(REPO, "*", "EVALUATION_RUBRIC.md"))):
    d = os.path.basename(os.path.dirname(f))
    if d == "template_directory": continue
    txt = open(f, encoding="utf-8", errors="replace").read()
    crits = re.findall(r"\|\s*\*\*(\d+)\*\*\s*\|.*?\|\s*(Pass|Fail)[^|]*\|\s*(\d)\s*\|", txt)
    ratings = {int(c): int(r) for c, _, r in crits}
    if len(ratings) != 14:
        raise SystemExit(f"{d}: parsed {len(ratings)} criteria, expected 14")
    declared = re.search(r"Total Score:\**\s*(\d+)\s*/\s*42", txt)
    if declared and int(declared.group(1)) != sum(ratings.values()):
        raise SystemExit(f"{d}: declared total {declared.group(1)} != sum of ratings {sum(ratings.values())}")
    costs = re.findall(r"Total cost:\s*\$([0-9][0-9,]*\.[0-9]+)", txt)
    api = re.findall(r"Total duration \(API\):\s*([^\n]+)", txt)
    added = re.findall(r"Total code changes:\s*([\d,]+) lines added", txt)
    # per-model usage line of the primary model; the LAST such line is the end-of-session report
    toks = re.findall(r"claude-(?:opus|sonnet)[^\n:]*:\s*([\d.,km]+) input,\s*([\d.,km]+) output,\s*([\d.,km]+) cache read", txt)
    runs[d] = dict(
        r=ratings, total=sum(ratings.values()),
        cost=float(costs[-1].replace(",", "")) if costs else None,
        api=parse_min(api[-1]) if api else None,
        added=int(added[-1].replace(",", "")) if added else None,
        out=parse_num(toks[-1][1]) if toks else None,
        cr=parse_num(toks[-1][2]) if toks else None,
        harness="Antigravity" if d.startswith("antigravity") else "Claude Code",
    )

AEST = {}
with open(os.path.join(HERE, "aesthetic_ratings.csv"), newline="") as fh:
    for i, row in enumerate(csv.reader(fh)):
        if i == 0 or not row: continue
        AEST[row[0].strip()] = int(row[1])
missing = [k for k in runs if k not in AEST]
if missing: raise SystemExit(f"no visual rating for: {missing}")

def fam(n):
    if "opus_4.7" in n: return "Opus 4.7"
    if "opus_4.6" in n: return "Opus 4.6"
    if "sonnet" in n: return "Sonnet 4.6"
    if "gemini" in n: return "Gemini 3.1"
    return "Qwen"

def fisher(a, b, c, d):
    """Two-sided Fisher exact test on [[a,b],[c,d]]: sum of the probabilities of all tables with
    the same margins that are no more probable than the observed one."""
    n = a+b+c+d; r1 = a+b; c1 = a+c
    def p(x): return comb(c1, x) * comb(n-c1, r1-x) / comb(n, r1)
    p0 = p(a)
    return sum(p(x) for x in range(max(0, r1+c1-n), min(r1, c1)+1) if p(x) <= p0 + 1e-12)

def wilson(k, n, z=1.959963985):
    """Wilson score interval for a single proportion."""
    pt = k / n; d = 1 + z*z/n; c = pt + z*z/(2*n)
    h = z * sqrt(pt*(1-pt)/n + z*z/(4*n*n))
    return ((c-h)/d, (c+h)/d)

def newcombe(k1, n1, k2, n2):
    """Newcombe's hybrid-score interval (his method 10) for the difference p1 - p2."""
    p1, p2 = k1/n1, k2/n2
    l1, u1 = wilson(k1, n1); l2, u2 = wilson(k2, n2)
    d = p1 - p2
    return d, d - sqrt((p1-l1)**2 + (u2-p2)**2), d + sqrt((u1-p1)**2 + (p2-l2)**2)

def sel(sub=None, exc=(), only=None):
    out = []
    for k in runs:
        if sub and sub not in k: continue
        if any(e in k for e in exc): continue
        if only and not only(k): continue
        out.append(k)
    return sorted(out)

CRIT = {1:"Local dev environment",2:"Docker deployment",3:"Home page",4:"Board creation",5:"User identification",
        6:"Card interaction",7:"Moving cards",8:"Commenting",9:"Realtime: new card",10:"Realtime: card move",
        11:"Realtime: new comment",12:"Data persistence",13:"Documentation",14:"CSV export"}
def ftp(ks):  return [k for k in ks if all(v == 3 for v in runs[k]["r"].values())]
def n2s(ks):  return sum(sum(1 for v in runs[k]["r"].values() if v == 2) for k in ks)
def cpass(ks, c): return [k for k in ks if runs[k]["r"][c] == 3]
def misses(k): return [c for c, v in runs[k]["r"].items() if v != 3]
def costs(ks): return sorted(runs[k]["cost"] for k in ks if runs[k]["cost"])
def scores(ks): return [runs[k]["total"] for k in ks]
def med(v): return st.median(v)
def fmt_costs(v): return "[" + ", ".join("%.2f" % x for x in v) + "]"

L = []
def w(s=""): L.append(s)

w("# Manuscript numbers: derivations")
w()
w("Generated by `derive_manuscript_numbers.py` from the per-run `EVALUATION_RUBRIC.md` files in the")
w(f"archived dataset and `aesthetic_ratings.csv`. Runs parsed: **{len(runs)}**; every run's declared total")
w("equals the sum of its 14 criterion ratings. Each value quoted in the manuscript is recomputed below")
w("with the arithmetic shown, so it can be checked against the archived rubric files.")
w("Tables 7 and 8 (files, lines, CSS per run) come from `count_structure.py`, and the design-treatment")
w("measures from `count_design_markers.py`; both read the run source trees, not the rubrics.")
w()

# ---------------- Table 1 ----------------
w("## Dataset and Table 1 (summary by harness and model family)")
w()
cc = [k for k in runs if runs[k]["harness"] == "Claude Code"]
ag = [k for k in runs if runs[k]["harness"] == "Antigravity"]
w(f"- Harness split: Claude Code {len(cc)} runs, Antigravity {len(ag)} runs (quoted '85 through Claude Code CLI and 5 through the Antigravity agent').")
for name in ["Opus 4.7", "Opus 4.6", "Sonnet 4.6", "Qwen"]:
    ks = [k for k in cc if fam(k) == name]
    sc = scores(ks); cs = costs(ks)
    w(f"- Claude Code, **{name}**: n={len(ks)}; mean = {sum(sc)}/{len(ks)} = {sum(sc)/len(ks):.2f}; range {min(sc)}-{max(sc)}; cost ${min(cs):.2f}-${max(cs):.2f}")
for name in ["Opus 4.6", "Sonnet 4.6", "Gemini 3.1"]:
    ks = [k for k in ag if fam(k) == name]
    sc = scores(ks)
    w(f"- Antigravity, **{name}**: n={len(ks)}; mean = {sum(sc)}/{len(ks)} = {sum(sc)/len(ks):.2f}; range {min(sc)}-{max(sc)}; cost not recorded")
w()
frontier = [k for k in cc if fam(k) in ("Opus 4.7", "Opus 4.6", "Sonnet 4.6")]
fc = costs(frontier)
w(f"- Frontier (Claude Code) cost median: median of {len(fc)} priced runs = **${med(fc):.2f}** (quoted 'about $3.60');")
w(f"  frontier min = ${min(fc):.2f}, max = **${max(fc):.2f}** (quoted 'from about $1 to $8').")
q = costs([k for k in runs if fam(k) == "Qwen"])
w(f"- Qwen /cost figures ${q[0]:.2f} and ${q[1]:.2f} (quoted '$41 and $179'): ratios to the frontier median = {q[0]/med(fc):.1f}x and {q[1]/med(fc):.1f}x")
w(f"  (quoted 'twelve to fifty times'); ratio of the cheaper Qwen run to the frontier max = {q[0]/max(fc):.1f}x (quoted 'more than five times').")
w()

# ---------------- Table 2 / reliability ----------------
w("## First-try reliability (Table 2 and text)")
w()
is_cc = lambda k: runs[k]["harness"] == "Claude Code"
h46 = sel("opus_4.6", only=is_cc)
h47 = sel("opus_4.7", exc=("xhigh",), only=is_cc)
x47 = sel("opus_4.7", exc=("abridged",), only=lambda k: "xhigh" in k and is_cc(k))
xab = sel("opus_4.7_xhigh_abridged")
s8  = sel("sonnet", exc=("_max_",), only=is_cc)
qw  = sel("qwen")
w(f"- Opus 4.6 High pooled (main batch 20 + abridged 6 = {len(h46)}): first-try perfect = {len(ftp(h46))}/{len(h46)} (quoted '4 of 26'); Docker (criterion 2) first-try pass = {len(cpass(h46,2))}/{len(h46)} (quoted '5 of 26').")
w(f"- Opus 4.7 High pooled (sweep 18 + abridged 6 = {len(h47)}): first-try perfect = {len(ftp(h47))}/{len(h47)} (quoted '6 of 24'); Docker pass = {len(cpass(h47,2))}/{len(h47)} (quoted '18 of 24').")
w(f"- Sonnet 4.6 High (n={len(s8)}): first-try perfect = {len(ftp(s8))}/{len(s8)} (quoted '3 of 8'); Docker pass = {len(cpass(s8,2))}/{len(s8)}.")
w(f"- Opus 4.7 xHigh sweep (n={len(x47)}): Docker pass = {len(cpass(x47,2))}/{len(x47)} (quoted '17 of 18'); local dev (criterion 1) pass = {len(cpass(x47,1))}/{len(x47)} (quoted 'all 18').")
a, bb = len(cpass(h46,2)), len(h46)-len(cpass(h46,2))
c, dd = len(cpass(h47,2)), len(h47)-len(cpass(h47,2))
w(f"- Docker generation contrast: {a}/{len(h46)} vs {c}/{len(h47)} pass; two-sided Fisher exact on [[{a},{bb}],[{c},{dd}]]")
w(f"  gives p = {fisher(a,bb,c,dd):.5f} (quoted 'p = 0.00016'). As percentages: {100*a/len(h46):.0f}% -> {100*c/len(h47):.0f}% (Discussion quotes '19 percent to 75 percent').")
w(f"- Local dev (criterion 1) first-try failures: {len(h46)-len(cpass(h46,1))}/{len(h46)} (Opus 4.6 High) vs {len(h47)-len(cpass(h47,1))}/{len(h47)} (Opus 4.7 High) (quoted '1 of 26' vs '10 of 24').")
m46 = st.mean(scores(h46)); m47 = st.mean(scores(h47))
w(f"- Family means over all Claude Code runs (Table 1): Opus 4.6 {st.mean(scores([k for k in cc if fam(k)=='Opus 4.6'])):.1f} vs Opus 4.7 {st.mean(scores([k for k in cc if fam(k)=='Opus 4.7'])):.1f} (quoted '40.7 versus 41.3').")
w("- Table 2 rows (first-try perfect / Docker first-try pass / corrective prompts per run = criteria rated 2):")
T2 = [("Opus 4.6, High", sel("opus_4.6", exc=("abridged",), only=is_cc)),
      ("Opus 4.6, High, abridged prompt", sel("opus_4.6_high_abridged")),
      ("Sonnet 4.6, High", s8),
      ("Opus 4.7, High", sel("opus_4.7", exc=("xhigh","abridged"), only=is_cc)),
      ("Opus 4.7, High, abridged prompt", sel("opus_4.7_high_abridged")),
      ("Opus 4.7, xHigh", x47), ("Opus 4.7, xHigh, abridged prompt", xab), ("Qwen, High", qw)]
for label, ks in T2:
    w(f"  - {label}: n={len(ks)}, first-try perfect {len(ftp(ks))}/{len(ks)} ({100*len(ftp(ks))/len(ks):.0f}%), Docker {len(cpass(ks,2))}/{len(ks)}, criteria rated 2 total {n2s(ks)} -> {n2s(ks)}/{len(ks)} = {n2s(ks)/len(ks):.2f}")
w(f"  - Row total = {sum(len(ks) for _, ks in T2)} runs = 90 minus the 5 Antigravity runs minus the 1 Sonnet 4.6 Max run.")
w()

# ---------------- Table 3 ----------------
w("## Criterion-level failure profile (Table 3 and text)")
w()
tot = 0; ones = 0
for cnum in range(1, 15):
    n2 = sum(1 for k in runs if runs[k]["r"][cnum] == 2)
    n1 = sum(1 for k in runs if runs[k]["r"][cnum] == 1)
    tot += n2 + n1; ones += n1
    w(f"- Criterion {cnum} ({CRIT[cnum]}): rated 2 in {n2}, rated 1 in {n1}; first-try failure share = {n2+n1}/90 = {100*(n2+n1)/90:.0f}%")
env = sum(1 for k in runs for cnum in (1,2) if runs[k]["r"][cnum] < 3)
w(f"- Total first-try criterion failures = {tot} (quoted '100'); environment criteria (1+2) = {env}; share = {env}/{tot} = {100*env/tot:.0f}% (quoted '55 of the 100 ... 55 percent').")
w(f"- Docker first-try failures {sum(1 for k in runs if runs[k]['r'][2] < 3)}/90 = {100*sum(1 for k in runs if runs[k]['r'][2] < 3)/90:.0f}% (abstract and text quote '44 percent'); Docker rated 1 in {sum(1 for k in runs if runs[k]['r'][2] == 1)} runs (quoted 'no run left Docker unresolved').")
q1 = sum(1 for k in qw for v in runs[k]["r"].values() if v == 1)
w(f"- Criteria rated 1 in the whole dataset = {ones}; of these, in the two Qwen runs = {q1} (quoted '7 of the 11').")
w()

# ---------------- Opus 4.7 grid cells ----------------
cells = {}
for eff in ("high", "xhigh"):
    for cond, selc in [("base", lambda k: "playwright" not in k and "antigravity" not in k and "abridged" not in k),
                       ("playwright", lambda k: "playwright" in k),
                       ("design", lambda k: "antigravity_prompt" in k),
                       ("abridged", lambda k: "abridged" in k)]:
        cells[(eff, cond)] = sorted(k for k in runs if k.startswith("claude_opus_4.7") and (("xhigh" in k) == (eff == "xhigh")) and selc(k))
for key, ks in cells.items():
    if len(ks) != 6: raise SystemExit(f"Opus 4.7 cell {key} has {len(ks)} runs, expected 6")

# ---------------- Tool section ----------------
w("## Testing tool (Figure 2, Table 4 and text)")
w()
for eff in ("high", "xhigh"):
    cb = costs(cells[(eff,"base")]); cp = costs(cells[(eff,"playwright")]); cd = costs(cells[(eff,"design")]); ca = costs(cells[(eff,"abridged")])
    w(f"- Opus 4.7 {eff}: base costs {fmt_costs(cb)} -> median ${med(cb):.2f}; mean score {st.mean(scores(cells[(eff,'base')])):.1f}")
    w(f"  +Playwright {fmt_costs(cp)} -> median ${med(cp):.2f}; change = ({med(cp):.2f}-{med(cb):.2f})/{med(cb):.2f} = +{100*(med(cp)-med(cb))/med(cb):.0f}%; mean score {st.mean(scores(cells[(eff,'playwright')])):.1f}")
    w(f"  +full design prompt {fmt_costs(cd)} -> median ${med(cd):.2f}; change = +{100*(med(cd)-med(cb))/med(cb):.0f}%")
    w(f"  +abridged prompt {fmt_costs(ca)} -> median ${med(ca):.2f}; change = +{100*(med(ca)-med(cb))/med(cb):.0f}%")
w("  (quoted: tool premium '42 percent at High effort and 68 percent at xHigh').")
b46 = sel("opus_4.6", exc=("abridged","playwright","antigravity_prompt"), only=is_cc)
p46 = sel("opus_4.6_with_playwright")
cb46, cp46 = costs(b46), costs(p46)
w(f"- Opus 4.6 seven-versus-seven: mean scores {sum(scores(b46))}/{len(b46)} = {st.mean(scores(b46)):.1f} vs {sum(scores(p46))}/{len(p46)} = {st.mean(scores(p46)):.1f} (quoted 'the same mean functional score of 40.6');")
w(f"  cost medians ${med(cb46):.2f} vs ${med(cp46):.2f} -> +{100*(med(cp46)-med(cb46))/med(cb46):.0f}% (quoted '27 percent').")
ui = [3,4,5,6,7,8,9,10,11,14]
uf_b = sum(1 for k in b46 if any(runs[k]["r"][c_] < 3 for c_ in ui))
uf_p = sum(1 for k in p46 if any(runs[k]["r"][c_] < 3 for c_ in ui))
w(f"- Runs with at least one interface-visible first-try failure (criteria 3-11 and 14): base {uf_b} of {len(b46)}, +Playwright {uf_p} of {len(p46)} (quoted '1 of 7 ... 3 of 7').")
pb = scores(cells[("high","base")] + cells[("xhigh","base")]); pp = scores(cells[("high","playwright")] + cells[("xhigh","playwright")])
def q(v, p_):
    s = sorted(v); pos = (len(s)-1)*p_; lo = int(pos); hi_ = min(lo+1, len(s)-1); return s[lo] + (s[hi_]-s[lo])*(pos-lo)
w(f"- Figure 2 pooled scores (12 vs 12): base {sorted(pb)} mean {st.mean(pb):.2f}, median {med(pb):.0f}, Q1 {q(pb,.25):.2f}, Q3 {q(pb,.75):.2f};")
w(f"  +Playwright {sorted(pp)} mean {st.mean(pp):.2f}, median {med(pp):.0f}, Q1 {q(pp,.25):.2f}, Q3 {q(pp,.75):.2f}.")
w(f"  Excluding the single base run scoring 39: base mean {st.mean([x for x in pb if x != 39]):.2f}, difference of means {st.mean(pp)-st.mean([x for x in pb if x != 39]):.2f} (quoted '0.02 points').")
w(f"  Pooled cost medians: base ${med(costs(cells[('high','base')]+cells[('xhigh','base')])):.2f}, +Playwright ${med(costs(cells[('high','playwright')]+cells[('xhigh','playwright')])):.2f} (Figure 2, right).")
w("- Table 4 (medians per Opus 4.7 cell; n_tok = runs whose rubric preserves the per-model token line):")
for eff in ("high", "xhigh"):
    for cond in ("base", "playwright", "design", "abridged"):
        ks = cells[(eff, cond)]
        o = [runs[k]["out"] for k in ks if runs[k]["out"]]; cr = [runs[k]["cr"] for k in ks if runs[k]["cr"]]
        ap = [runs[k]["api"] for k in ks if runs[k]["api"]]; ad = [runs[k]["added"] for k in ks if runs[k]["added"]]
        w(f"  - {eff} {cond}: score median {med(scores(ks)):.1f}; output tokens {med(o)/1e3:.0f}k, cache-read {med(cr)/1e6:.1f}M (n_tok={len(o)}); model time {med(ap):.1f} min; lines added {med(ad):.0f}; cost ${med(costs(ks)):.2f}")
w("  (quoted: output 42k vs 46k at High, 51k vs 45k at xHigh; cache-read 2.3M -> 5.3M and 2.3M -> 7.0M; design prompts 55k/60k vs 46k and 72k vs 45k; lines added 'from about 2,200 to between 3,000 and 3,900'.")
w("   Note: claude_opus_4.7_xhigh_run_5 has no per-model token line, so the xHigh base token medians are over five runs.)")
w()

# ---------------- Effort section ----------------
w("## Reasoning effort (Figure 3, Table 5 and text)")
w()
hi = cells[("high","base")] + cells[("high","playwright")] + cells[("high","design")]
xi = cells[("xhigh","base")] + cells[("xhigh","playwright")] + cells[("xhigh","design")]
w(f"- First-try perfect, six sweep cells: High {len(ftp(hi))}/{len(hi)} = {100*len(ftp(hi))/len(hi):.0f}%; xHigh {len(ftp(xi))}/{len(xi)} = {100*len(ftp(xi))/len(xi):.0f}% (quoted '28 percent (5 of 18) to 89 percent (16 of 18)').")
w(f"- Fisher exact on [[{len(ftp(hi))},{len(hi)-len(ftp(hi))}],[{len(ftp(xi))},{len(xi)-len(ftp(xi))}]] = {fisher(len(ftp(hi)),len(hi)-len(ftp(hi)),len(ftp(xi)),len(xi)-len(ftp(xi))):.5f} (quoted 'p = 0.00049').")
w(f"- Pooled means: High {sum(scores(hi))}/{len(hi)} = {st.mean(scores(hi)):.1f}; xHigh {sum(scores(xi))}/{len(xi)} = {st.mean(scores(xi)):.1f} (quoted '41.0 to 41.8').")
w(f"- Corrective prompts (criteria rated 2): High total {n2s(hi)}, xHigh total {n2s(xi)} -> ratio {n2s(hi)}/{n2s(xi)} = {n2s(hi)/max(n2s(xi),1):.1f} (quoted '16 ... 3, about a five fold reduction').")
w(f"- High sweep first-try misses by criterion: " + ", ".join(f"{CRIT[c_]} {n}" for c_, n in sorted(Counter(c_ for k in hi for c_ in misses(k)).items())) + " (quoted 'npm install, Docker build and run, and one case of data loss on restart').")
for cond in ("base","playwright","design"):
    ch, cx = med(costs(cells[("high",cond)])), med(costs(cells[("xhigh",cond)]))
    w(f"- xHigh cost premium, {cond}: ({cx:.2f}-{ch:.2f})/{ch:.2f} = +{100*(cx-ch)/ch:.0f}%")
w("  (quoted 'about 9 percent for base runs, 29 percent with the tool, and 21 percent with the design prompt').")
hia = hi + cells[("high","abridged")]; xia = xi + cells[("xhigh","abridged")]
w(f"- Sensitivity, including the abridged cells: High {len(ftp(hia))}/{len(hia)} vs xHigh {len(ftp(xia))}/{len(xia)}, Fisher p = {fisher(len(ftp(hia)),len(hia)-len(ftp(hia)),len(ftp(xia)),len(xia)-len(ftp(xia))):.5f} (not quoted; reported here for completeness).")
w("- Table 5 rows (mean score / first-try perfect / median cost / aesthetics mean):")
for eff in ("high", "xhigh"):
    for cond in ("base", "playwright", "design", "abridged"):
        ks = cells[(eff, cond)]; av = [AEST[k] for k in ks]
        w(f"  - {eff} {cond}: mean {st.mean(scores(ks)):.1f}, FTP {len(ftp(ks))}/6, median cost ${med(costs(ks)):.2f}, aesthetics {st.mean(av):.1f} (values {sorted(av)})")
w()

# ---------------- Design prompt + ablation ----------------
w("## Design prompt and ablation (Figure 4, Table 6 and text)")
w()
des = {k: v for k, v in AEST.items() if is_cc(k) and "_with_antigravity_prompt" in k}
abr = {k: v for k, v in AEST.items() if "abridged" in k}
nod = {k: v for k, v in AEST.items() if is_cc(k) and "antigravity_prompt" not in k and "abridged" not in k}
agr = {k: v for k, v in AEST.items() if not is_cc(k)}
w(f"- Visual rating, Claude Code runs: no design prompt n={len(nod)}, values {dict(Counter(nod.values()))} (quoted 'every one of the 45 runs with no design prompt was rated 3');")
w(f"  full prompt n={len(des)}, values {dict(Counter(des.values()))}; abridged n={len(abr)}, values {dict(Counter(abr.values()))} (quoted 'every one of the 40 runs ... was rated 4 or 5').")
w(f"  Means, reported only per cell in Tables 5 and 6: full {st.mean(des.values()):.2f}, abridged {st.mean(abr.values()):.2f}, none {st.mean(nod.values()):.2f} (Figure 4 labels).")
w(f"- Antigravity harness runs (all carry that agent's own design prompt): " + ", ".join(f"{k} = {v}" for k, v in sorted(agr.items())) + f"; {sum(1 for v in agr.values() if v <= 3)} of {len(agr)} rated 3 or below.")
d_h = cells[("high","design")]; b_h = cells[("high","base")]
w(f"- Repair burden at High: full design prompt {n2s(d_h)}/{len(d_h)} = {n2s(d_h)/len(d_h):.2f} vs base {n2s(b_h)}/{len(b_h)} = {n2s(b_h)/len(b_h):.2f} (quoted '1.50 ... against 0.67').")
dsg = lambda k: is_cc(k) and ("antigravity_prompt" in k or "abridged" in k)
nodsg = lambda k: is_cc(k) and "antigravity_prompt" not in k and "abridged" not in k
d7d = sum(1 for k in runs if dsg(k) and runs[k]["r"][7] < 3); nd = sum(1 for k in runs if dsg(k))
d7n = sum(1 for k in runs if nodsg(k) and runs[k]["r"][7] < 3); nn = sum(1 for k in runs if nodsg(k))
w(f"- Moving cards (criterion 7) first-try failures: design prompted (full or abridged) {d7d}/{nd} vs no design prompt {d7n}/{nn} (quoted '11 of the 40 ... 5 of the 45');")
w(f"  Fisher exact = {fisher(d7d,nd-d7d,d7n,nn-d7n):.4f} (quoted 'p = 0.093'). The 5 Antigravity harness runs are excluded from both groups.")
imp = [k for k in x47 if not ftp([k])]
w(f"- Opus 4.7 xHigh sweep runs that were not first-try perfect: " + "; ".join(f"{k} missed {[CRIT[c_] for c_ in misses(k)]}" for k in imp))
w("  (both are full-design-prompt runs and both missed Moving cards; note that run_3 also failed Docker first try, which is the single xHigh Docker miss in Table 2).")
ab47 = sel("opus_4.7_high_abridged")
w(f"- Opus 4.7 High abridged: Moving-cards first-try failures {sum(1 for k in ab47 if runs[k]['r'][7] < 3)}/6 (quoted '3 of the 6').")
w(f"- Opus 4.7 xHigh abridged misses: " + "; ".join(f"{k.split('_')[-1] if 'run' in k else 'run_1'}: {[CRIT[c_] for c_ in misses(k)] or 'none'}" for k in xab) + " (quoted 'Docker in three runs and drag and drop in two').")
w(f"- Opus 4.6 abridged first-try perfect {len(ftp(sel('opus_4.6_high_abridged')))}/6 vs Opus 4.6 base {len(ftp(b46))}/{len(b46)} (quoted '3 of 6 against 1 of 7').")
w("- Table 6 cells (aesthetics mean / functional mean / first-try perfect / median cost):")
for label, ks in [("Opus 4.6 High, base", b46), ("Opus 4.6 High, full design prompt", sel("opus_4.6_high_with_antigravity_prompt")),
                  ("Opus 4.6 High, abridged prompt", sel("opus_4.6_high_abridged")),
                  ("Opus 4.7 High, base", cells[("high","base")]), ("Opus 4.7 High, full design prompt", d_h),
                  ("Opus 4.7 High, abridged prompt", ab47),
                  ("Opus 4.7 xHigh, base", cells[("xhigh","base")]), ("Opus 4.7 xHigh, full design prompt", cells[("xhigh","design")]),
                  ("Opus 4.7 xHigh, abridged prompt", xab)]:
    av = [AEST[k] for k in ks]; sc = scores(ks); cs = costs(ks)
    w(f"  - {label}: n={len(ks)}; aesthetics {sum(av)}/{len(av)} = {st.mean(av):.2f}; score {sum(sc)}/{len(sc)} = {st.mean(sc):.2f}; FTP {len(ftp(ks))}/{len(ks)}; costs {fmt_costs(cs)} -> median ${med(cs):.2f}")
w()

# ---------------- Coverage ----------------
w("## Coverage checks")
w()
cov = sum(1 for k in runs if runs[k]["out"])
w(f"- Runs whose rubric preserves the per-model token breakdown: {cov} (quoted 'the 84 runs whose rubrics preserve the per model token breakdown'). Without it: {[k for k in runs if not runs[k]['out']]}.")
tools_total = 0; tools_invoked = 0
for f in glob.glob(os.path.join(REPO, "claude_*playwright*", "EVALUATION_RUBRIC.md")):
    tools_total += 1
    if re.search(r"invoked:\s*Yes", open(f, encoding="utf-8", errors="replace").read()): tools_invoked += 1
w(f"- Tool-enabled Claude Code runs: {tools_total}; recording 'invoked: Yes': {tools_invoked} (quoted 'All 23 tool enabled Claude Code runs did').")
w(f"- One-vendor limitation: runs using Anthropic models = {sum(1 for k in runs if fam(k) in ('Opus 4.7','Opus 4.6','Sonnet 4.6'))}; under the Claude Code harness = {len(cc)}; both = {sum(1 for k in cc if fam(k) in ('Opus 4.7','Opus 4.6','Sonnet 4.6'))} (quoted 'Eighty three of the 90 runs ... 85 using its models and 85 its harness').")
w()

# ---------------- Inferential comparisons (Table S2) ----------------
w("## Inferential comparisons (Table S2)")
w()
w("Every p value and confidence interval that appears in the paper, with the 2x2 counts behind it.")
w("Fisher exact is two-sided (sum of the probabilities of all tables no more probable than the observed one).")
w("Intervals are Newcombe's hybrid-score method for the difference of two independent proportions.")
w()
COMPARISONS = [
    ("Run perfect on first try, by reasoning effort",
     "Opus 4.7 xHigh, six sweep cells", len(ftp(xi)), len(xi),
     "Opus 4.7 High, six sweep cells",  len(ftp(hi)), len(hi)),
    ("Docker criterion passed first try, by model generation",
     "Opus 4.7 High",  len(cpass(h47,2)), len(h47),
     "Opus 4.6 High",  len(cpass(h46,2)), len(h46)),
    ("Drag-and-drop missed first try, by design prompt",
     "design prompted (full or abridged)", d7d, nd,
     "no design prompt",                   d7n, nn),
]
for label, g1, k1, n1, g2, k2, n2 in COMPARISONS:
    pv = fisher(k1, n1-k1, k2, n2-k2)
    d, lo, hi_ci = newcombe(k1, n1, k2, n2)
    w(f"- {label}")
    w(f"    {g1}: {k1}/{n1} = {100*k1/n1:.0f}%;  {g2}: {k2}/{n2} = {100*k2/n2:.0f}%")
    w(f"    Fisher exact (two-sided) p = {pv:.5f}")
    w(f"    risk difference {100*d:.1f} pp, 95% CI {100*lo:.1f} to {100*hi_ci:.1f} pp")
try:
    from scipy.stats import fisher_exact as _sp
    w()
    w("Cross-check against scipy.stats.fisher_exact (two-sided):")
    for label, _, k1, n1, _, k2, n2 in COMPARISONS:
        mine = fisher(k1, n1-k1, k2, n2-k2); ref = _sp([[k1,n1-k1],[k2,n2-k2]])[1]
        w(f"  {label}: this script {mine:.6f} vs scipy {ref:.6f} -> {'match' if abs(mine-ref) < 1e-9 else 'MISMATCH'}")
except ImportError:
    w()
    w("(scipy is not installed, so the cross-check against a reference implementation was skipped;")
    w(" install scipy and re-run to verify the hand-rolled Fisher exact test.)")
w()

open(OUT, "w", encoding="utf-8").write("\n".join(L) + "\n")
print(f"wrote {OUT}; {len(L)} lines; {len(runs)} runs parsed")
