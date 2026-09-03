#!/usr/bin/env python3
"""
count_design_markers.py - judge-free measures of the design treatment in each run's shipped source.

Two families of measures are counted from every run's own front-end source (CSS/SCSS files plus
TSX/JSX/TS/JS/HTML, so CSS-in-JS and inline style objects are included; node_modules, dist, build,
coverage, .git and .playwright-mcp are excluded):

  Directive-named markers (what the design directive asks for; both of its forms, the design portion
  of the full third-party prompt and the abridged paraphrase in abridged_design_prompt.md, ask for all four):
    gradient        CSS gradient functions (linear-, radial-, conic-gradient)
    keyframes       @keyframes animation definitions
    google_font     Google Fonts stylesheet/link imports, or a @fontsource dependency
    display_font    named modern display faces (Inter, Outfit, Poppins, Manrope, ...)

  Technique-agnostic investment measures (not named in the directive):
    css_lines       lines in .css/.scss files
    custom_props    distinct CSS custom properties defined (--name:)
    box_shadow, border_radius, transform, letter_spacing, transition   rule counts (CSS or camelCase)
    font_weights    distinct font-weight values
    font_sizes      distinct font-size values
    colors          distinct hex colours
    dark_colors     distinct hex colours with relative luminance < 0.15
    media_q         @media queries
    ui_framework    1 if a UI/styling framework is a package dependency (Tailwind, MUI, Chakra, Ant,
                    Bootstrap, styled-components, Emotion, Radix Themes), else 0

  Also recorded, in the CSV and the supplemental per-run table only:
    backdrop        backdrop-filter rule count (CSS or camelCase). Only the full prompt alludes to this
                    effect, so it is neither a feature both forms of the directive name nor a technique
                    the directive leaves unnamed; the manuscript table therefore omits it.

A run is classed as "design-treated" if it has at least one gradient AND (a Google Font import OR a
@keyframes block). The script also joins the holistic 1-5 visual rating from aesthetic_ratings.csv,
if present, and reports agreement between the rating (<=3 vs >=4) and the design-treated flag.

Usage:  cd analysis && python3 count_design_markers.py           # design_markers.csv + printed summary
        cd analysis && python3 count_design_markers.py --docx    # also the manuscript table (docx) and the
                                                                 # per-run supplemental table (xlsx)
        (REPO=/path/to/retrospective-board-eval overrides the dataset location; OUT the csv path)
Writes: ./design_markers.csv (one row per run) and prints a per-condition summary; with --docx also
        ./design_markers_table.docx (the by-condition summary, formatted like the manuscript's table
        files) and ./design_markers.xlsx (the per-run table, for the supplement).
Requires: Python 3.8+, standard library only; --docx needs python-docx and openpyxl.
"""
import os, re, csv, json, glob, statistics as st
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
def _find_repo():
    for cand in (os.path.join(HERE, ".."), os.path.join(HERE, "..", "retrospective-board-eval")):
        if glob.glob(os.path.join(cand, "claude_*", "EVALUATION_RUBRIC.md")):
            return os.path.abspath(cand)
    return os.path.join(HERE, "..", "retrospective-board-eval")
REPO = os.environ.get("REPO") or _find_repo()
OUT = os.environ.get("OUT", os.path.join(HERE, "design_markers.csv"))
RATINGS_CSV = os.path.join(HERE, "aesthetic_ratings.csv")

EXCL = {"node_modules", "dist", "build", "coverage", ".git", ".playwright-mcp"}
CSS_EXT = (".css", ".scss")
CODE_EXT = (".tsx", ".jsx", ".ts", ".js", ".html", ".vue", ".svelte")
UI_FRAMEWORKS = ("tailwindcss", "@mui/material", "@chakra-ui/react", "antd", "bootstrap",
                 "styled-components", "@emotion/react", "@radix-ui/themes")
DISPLAY_FONTS = r"\b(Inter|Outfit|Poppins|Manrope|Space Grotesk|DM Sans|Plus Jakarta Sans|Sora|Figtree|Geist|Urbanist|Lexend|Nunito|Montserrat|Raleway|Work Sans|Rubik|Sora)\b"

# Patterns accept CSS syntax (kebab-case with colon) and inline style objects (camelCase key).
def rule(kebab, camel):
    return re.compile(r"(?:%s\s*:|\b%s\s*:)" % (re.escape(kebab), camel), re.I)

P = {
    "gradient":       re.compile(r"(linear|radial|conic)-gradient\(", re.I),
    "keyframes":      re.compile(r"@keyframes\b", re.I),
    "google_font":    re.compile(r"fonts\.googleapis\.com|fonts\.gstatic\.com", re.I),
    "display_font":   re.compile(DISPLAY_FONTS),
    "backdrop":       rule("backdrop-filter", "backdropFilter"),
    "box_shadow":     rule("box-shadow", "boxShadow"),
    "border_radius":  rule("border-radius", "borderRadius"),
    "transform":      re.compile(r"(?:\btransform\s*:)", re.I),
    "letter_spacing": rule("letter-spacing", "letterSpacing"),
    "transition":     re.compile(r"\btransition\s*:", re.I),
    "media_q":        re.compile(r"@media\b", re.I),
}
FONT_WEIGHT = re.compile(r"(?:font-weight|fontWeight)\s*:\s*['\"]?(\d{3}|bold|bolder|semibold|lighter)", re.I)
FONT_SIZE   = re.compile(r"(?:font-size|fontSize)\s*:\s*['\"]?([0-9.]+(?:px|rem|em|pt))", re.I)
CUSTOM_PROP = re.compile(r"(--[a-zA-Z][\w-]*)\s*:")
HEX = re.compile(r"#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b")

def luminance(h):
    h = h.lstrip("#"); h = "".join(c * 2 for c in h) if len(h) == 3 else h[:6]
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b

def condition(folder):
    f = folder.lower()
    if f.startswith("antigravity"): return "antigravity harness"
    if "abridged" in f: return "abridged prompt"
    if "antigravity_prompt" in f: return "full prompt"
    return "no design prompt"

def measure(run_dir):
    css_text, code_text, css_lines, deps = [], [], 0, set()
    for dp, dns, fns in os.walk(run_dir):
        dns[:] = [d for d in dns if d not in EXCL]
        for fn in fns:
            p = os.path.join(dp, fn)
            if fn == "package.json":
                try:
                    j = json.load(open(p, encoding="utf-8", errors="ignore"))
                    deps |= set(j.get("dependencies", {})) | set(j.get("devDependencies", {}))
                except Exception:
                    pass
            elif fn.endswith(CSS_EXT):
                t = open(p, encoding="utf-8", errors="ignore").read()
                css_text.append(t); css_lines += t.count("\n") + 1
            elif fn.endswith(CODE_EXT) and not fn.endswith(".min.js") and fn != "package-lock.json":
                code_text.append(open(p, encoding="utf-8", errors="ignore").read())
    allt = "\n".join(css_text + code_text)
    m = {k: len(p.findall(allt)) for k, p in P.items()}
    if any(d.startswith("@fontsource") for d in deps): m["google_font"] += 1
    hexes = {h.lower() for h in HEX.findall(allt)}
    m.update(
        css_lines=css_lines,
        custom_props=len(set(CUSTOM_PROP.findall(allt))),
        font_weights=len(set(w.lower() for w in FONT_WEIGHT.findall(allt))),
        font_sizes=len(set(FONT_SIZE.findall(allt))),
        colors=len(hexes),
        dark_colors=sum(1 for h in hexes if luminance(h) < 0.15),
        ui_framework=int(any(d in deps for d in UI_FRAMEWORKS)),
    )
    m["design_treated"] = int(m["gradient"] > 0 and (m["google_font"] > 0 or m["keyframes"] > 0))
    return m

TABLE_CAPTION = ("Design treatment in the shipped source, by condition. Counted from each run's own CSS, "
    "TSX, JSX, TS, JS and HTML files, excluding dependencies and build output, by the archived script "
    "count_design_markers.py. The first block lists features the design directive names, as the number of "
    "runs containing at least one; a run is classed as design-treated if it contains a gradient and either a "
    "Google Fonts import or a keyframe animation. The second block lists technique-agnostic measures of "
    "styling effort that the directive does not name, as the median [minimum to maximum] per run. The last "
    "rows give the holistic visual rating for comparison. Font sizes and weights count distinct literal "
    "values, and dark colours are distinct hex colours with relative luminance below 0.15. No run in any "
    "condition depends on a UI or styling framework.")

NAMED_LABELS = [("gradient", "CSS gradient"), ("keyframes", "Keyframe animation"), ("google_font", "Google Fonts import"),
                ("display_font", "Named display font"), ("design_treated", "Design-treated (rule above)")]
INVEST_LABELS = [("css_lines", "CSS lines"), ("custom_props", "CSS custom properties (design tokens)"),
                 ("box_shadow", "box-shadow rules"), ("border_radius", "border-radius rules"), ("transform", "transform rules"),
                 ("letter_spacing", "letter-spacing rules"), ("font_weights", "Distinct font weights"),
                 ("font_sizes", "Distinct font sizes"), ("dark_colors", "Distinct dark colours")]
COND_LABELS = [("no design prompt", "No design prompt"), ("full prompt", "Full design prompt"),
               ("abridged prompt", "Abridged prompt"), ("antigravity harness", "Antigravity harness")]

def summary_table(rows):
    """Rows for the by-condition table: (label, [cell per condition])."""
    def R(c): return [r for r in rows if r["condition"] == c]
    out = [("Runs", [str(len(R(c))) for c, _ in COND_LABELS])]
    out.append(("__section__", ["Directive-named features (runs with at least one)"]))
    for k, lab in NAMED_LABELS:
        out.append((lab, [f"{sum(r[k] > 0 for r in R(c))} of {len(R(c))}" for c, _ in COND_LABELS]))
    out.append(("UI or styling framework dependency", [f"{sum(r['ui_framework'] for r in R(c))} of {len(R(c))}" for c, _ in COND_LABELS]))
    out.append(("__section__", ["Styling effort not named by the directive (median [min to max] per run)"]))
    for k, lab in INVEST_LABELS:
        out.append((lab, [f"{st.median(r[k] for r in R(c)):.0f} [{min(r[k] for r in R(c))} to {max(r[k] for r in R(c))}]" for c, _ in COND_LABELS]))
    if all(r.get("holistic_rating") != "" for r in rows):
        out.append(("__section__", ["Holistic visual rating (for comparison)"]))
        out.append(("Rated 4 or 5", [f"{sum(int(r['holistic_rating']) >= 4 for r in R(c))} of {len(R(c))}" for c, _ in COND_LABELS]))
        out.append(("Rated 3 or below", [f"{sum(int(r['holistic_rating']) <= 3 for r in R(c))} of {len(R(c))}" for c, _ in COND_LABELS]))
    return out

def write_docx(rows, path):
    """The by-condition table as a Word file in the style of the manuscript's Table_N.docx files."""
    from docx import Document
    from docx.shared import Pt, Cm, Twips, Emu
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.oxml import OxmlElement
    from docx.oxml.ns import qn
    FONT = "Times New Roman"
    doc = Document()
    zoom = doc.settings.element.find(qn("w:zoom"))
    if zoom is not None and zoom.get(qn("w:percent")) is None: zoom.set(qn("w:percent"), "100")
    stl = doc.styles["Normal"]; stl.font.name = FONT; stl.font.size = Pt(11); stl.element.rPr.rFonts.set(qn("w:eastAsia"), FONT)
    sec = doc.sections[0]; sec.page_width, sec.page_height = Twips(12240), Twips(15840)
    for side in ("left_margin", "right_margin", "top_margin", "bottom_margin"): setattr(sec, side, Cm(2.5))
    usable = sec.page_width - sec.left_margin - sec.right_margin
    def run(p, text, bold=False, size=11):
        r = p.add_run(text); r.bold = bold; r.font.name = FONT; r.font.size = Pt(size); r._element.rPr.rFonts.set(qn("w:eastAsia"), FONT)
    def shade(cell, fill="EFEFEF"):
        shd = OxmlElement("w:shd"); shd.set(qn("w:val"), "clear"); shd.set(qn("w:color"), "auto"); shd.set(qn("w:fill"), fill)
        cell._tc.get_or_add_tcPr().append(shd)
    p = doc.add_paragraph(); p.paragraph_format.space_after = Pt(8)
    run(p, "Table N. ", bold=True); run(p, TABLE_CAPTION)
    head = ["Measure"] + [lab for _, lab in COND_LABELS]
    widths = [3400, 1450, 1450, 1450, 1450]; col_w = [Emu(int(usable * w / sum(widths))) for w in widths]
    tbl = doc.add_table(rows=1, cols=len(head)); tbl.style = "Table Grid"; tbl.autofit = False
    for j, w in enumerate(col_w): tbl.columns[j].width = w
    hdr = tbl.rows[0]
    trPr = hdr._tr.get_or_add_trPr(); h = OxmlElement("w:tblHeader"); h.set(qn("w:val"), "true"); trPr.append(h)
    for j, name in enumerate(head):
        c = hdr.cells[j]; c.width = col_w[j]; shade(c)
        pp = c.paragraphs[0]; pp.alignment = WD_ALIGN_PARAGRAPH.LEFT if j == 0 else WD_ALIGN_PARAGRAPH.CENTER; run(pp, name, bold=True, size=10)
    for label, cells_ in summary_table(rows):
        cells = tbl.add_row().cells
        if label == "__section__":
            merged = cells[0].merge(cells[-1]); merged.width = Emu(sum(int(w) for w in col_w))
            pp = merged.paragraphs[0]; pp.alignment = WD_ALIGN_PARAGRAPH.LEFT; run(pp, cells_[0], bold=True, size=10)
            continue
        for j, v in enumerate([label] + cells_):
            cells[j].width = col_w[j]; pp = cells[j].paragraphs[0]
            pp.alignment = WD_ALIGN_PARAGRAPH.LEFT if j == 0 else WD_ALIGN_PARAGRAPH.CENTER; run(pp, v, size=10)
    seen = set()
    for row in tbl.rows:
        for c in row.cells:
            if id(c._tc) in seen: continue          # merged section rows return the same cell several times
            seen.add(id(c._tc))
            tcPr = c._tc.get_or_add_tcPr(); mar = OxmlElement("w:tcMar")
            for side, w in (("top", 40), ("left", 80), ("bottom", 40), ("right", 80)):
                e = OxmlElement(f"w:{side}"); e.set(qn("w:w"), str(w)); e.set(qn("w:type"), "dxa"); mar.append(e)
            tcPr.append(mar)
            for pp in c.paragraphs: pp.paragraph_format.space_after = Pt(0); pp.paragraph_format.space_before = Pt(0)
    doc.save(path); print("wrote", path)

def write_xlsx(rows, cols, path):
    """Per-run table for the supplement (one row per run, all measures)."""
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment
    from openpyxl.utils import get_column_letter
    wb = Workbook(); ws = wb.active; ws.title = "Design markers"
    ws.append(cols)
    for c in range(1, len(cols) + 1):
        x = ws.cell(1, c); x.fill = PatternFill("solid", fgColor="305496"); x.font = Font(name="Arial", bold=True, color="FFFFFF"); x.alignment = Alignment(horizontal="center")
    for r in rows:
        ws.append([r.get(c, "") for c in cols])
    ws.freeze_panes = "A2"; ws.auto_filter.ref = f"A1:{get_column_letter(len(cols))}{len(rows)+1}"
    ws.column_dimensions["A"].width = 50
    for c in range(2, len(cols) + 1): ws.column_dimensions[get_column_letter(c)].width = 14
    wb.save(path); print("wrote", path)

def main():
    import argparse
    ap = argparse.ArgumentParser(description="Judge-free design-treatment measures per run.")
    ap.add_argument("--docx", action="store_true", help="also write design_markers_table.docx and design_markers.xlsx")
    args = ap.parse_args()
    ratings = {}
    if os.path.exists(RATINGS_CSV):
        for i, row in enumerate(csv.reader(open(RATINGS_CSV, newline=""))):
            if i and row: ratings[row[0].strip()] = int(row[1])
    rows = []
    for f in sorted(glob.glob(os.path.join(REPO, "*", "EVALUATION_RUBRIC.md"))):
        d = os.path.basename(os.path.dirname(f))
        if d == "template_directory": continue
        m = measure(os.path.dirname(f))
        rows.append({"run": d, "condition": condition(d), "holistic_rating": ratings.get(d, ""), **m})
    cols = ["run", "condition", "holistic_rating", "design_treated",
            "gradient", "keyframes", "google_font", "display_font",
            "css_lines", "custom_props", "box_shadow", "border_radius", "transform", "letter_spacing",
            "transition", "backdrop", "font_weights", "font_sizes", "colors", "dark_colors", "media_q", "ui_framework"]
    with open(OUT, "w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=cols); w.writeheader()
        for r in rows: w.writerow({c: r.get(c, "") for c in cols})
    print(f"runs: {len(rows)}  ->  {OUT}\n")

    conds = ["no design prompt", "full prompt", "abridged prompt", "antigravity harness"]
    named = ["gradient", "keyframes", "google_font", "display_font"]
    invest = ["css_lines", "custom_props", "box_shadow", "border_radius", "transform",
              "letter_spacing", "transition", "backdrop", "font_weights", "font_sizes", "dark_colors", "ui_framework"]
    print("Directive-named markers: runs with >= 1 occurrence")
    print(f"{'marker':14s}" + "".join(f"{c:>22s}" for c in conds))
    for k in named + ["design_treated"]:
        line = f"{k:14s}"
        for c in conds:
            R = [r for r in rows if r["condition"] == c]
            line += f"{sum(r[k] > 0 for r in R):>14d} / {len(R):<5d}"
        print(line)
    print("\nInvestment measures: median [min-max]")
    print(f"{'measure':14s}" + "".join(f"{c:>22s}" for c in conds))
    for k in invest:
        line = f"{k:14s}"
        for c in conds:
            v = [r[k] for r in rows if r["condition"] == c]
            line += f"{st.median(v):>10.0f} [{min(v)}-{max(v)}]".rjust(22)
        print(line)
    base = [r for r in rows if r["condition"] == "no design prompt"]
    prompted = [r for r in rows if r["condition"] in ("full prompt", "abridged prompt")]
    print("\nNo overlap between base and prompted Claude Code runs on:",
          [k for k in invest if base and prompted and (min(r[k] for r in prompted) > max(r[k] for r in base))])

    if ratings:
        cc = base + prompted
        agree = sum(1 for r in cc if (r["holistic_rating"] >= 4) == bool(r["design_treated"]))
        print(f"\nHolistic rating (>=4) vs design_treated flag: agree in {agree} of {len(cc)} Claude Code runs")
        for c in ["antigravity harness"]:
            for r in rows:
                if r["condition"] == c:
                    print(f"  {r['run']:38s} rating {r['holistic_rating']}  design_treated {r['design_treated']}")
        p4 = [r for r in prompted if r["holistic_rating"] == 4]; p5 = [r for r in prompted if r["holistic_rating"] == 5]
        print(f"\nWithin prompted runs, rating 4 (n={len(p4)}) vs rating 5 (n={len(p5)}), medians:")
        for k in ["gradient", "keyframes", "css_lines", "custom_props", "box_shadow", "transform", "font_sizes", "dark_colors"]:
            print(f"  {k:14s} {st.median(r[k] for r in p4):8.1f}   {st.median(r[k] for r in p5):8.1f}")

    if args.docx:
        write_docx(rows, os.path.join(HERE, "design_markers_table.docx"))
        write_xlsx(rows, cols, os.path.join(HERE, "design_markers.xlsx"))

if __name__ == "__main__":
    main()
