---
title: Excalidraw style recipe (spicy hand-drawn)
---

import Giscus from "@giscus/react";

How blog diagrams should look: thin-stroke Excalidraw, regular Virgil weight, **quiet gray / soft pastel hachure fills**, generous whitespace — spicy but **light**, not loud. Canonical stroke/type weight: the three-inventories figure (“One system. Three inventories.”) — keep its thin borders and regular text, but **always** use Excalidraw **hachure** (or cross-hatch) fills, not flat solid washes. Use that figure as **stroke / type weight** inspiration, not a layout to clone, and not as a license to drop hatches.

This is the Excalidraw style guide.

## Target look (lock this)

**Thin strokes + quiet hatches.** Not flat empty fills. Not chunky spicy overload.

| Do | Don’t |
| --- | --- |
| **Thin** single-line borders (hairline–light; ~1–2px feel after export) | Thick marker outlines, double strokes, sloppy fat sketch edges |
| **Regular / light** Virgil (or Virgil-ish) text — titles slightly larger, not bold-heavy | Heavy bold labels that fill the box |
| **Quiet gray or soft pastel hachure / cross-hatch** fills (Excalidraw classic; `fillStyle: hachure`) — **required default** | Flat solid-only washes with no hatch; empty white boxes |
| Soft, muted hatch tint (pale blue / mint / peach / light gray lines) | Dense loud hatch + saturated fill + fat border at once |
| Soft border hues that match the fill family | Neon, loud, or high-chroma fills |
| White canvas, generous whitespace inside and between shapes | Crowded chunky stacked cards with little air |
| Clear hierarchy: one title, optional gray subtitle, short bullets | Walls of micro-text or competing headlines |

**Anti-pattern A (reject on sight):** thick double-stroke borders + bold-heavy Virgil + **dense** hachure + loud coloring. That combo reads “heavy cartoon,” not this blog’s spicy sketch.

**Anti-pattern B (also reject):** thin borders + regular text but **flat solid fills with no hatch**. The thin-style pass must not strip hachure. Quiet hatch is part of the brand.

Prefer cleaner **three-column**, **two-column compare**, **swimlane**, or **flow** compositions over chunky stacked cards when either layout would work.

## Vibe (not a template)

**Style ≠ layout.** The spicy look (thin Virgil strokes, quiet gray/pastel **hachure**) is fixed; the composition is not. A vertical stack of layers is **one** option among many — use it only when the story is literally “things sit on top of each other.”

Prefer variety by default. Pick the layout that matches the argument:

| Layout | When to use |
| --- | --- |
| **Two-column compare** | Same idea on two sides (e.g. DevSecOps vs AI Sec; capability lock vs app CI) with arrows linking matching gates |
| **Three-column / inventory row** | Parallel inventories, lenses, or peers with equal weight (e.g. SBOM / ML-BOM / AIBOM) |
| **Left-to-right flow / pipeline** | Steps, CI stages, request path — optional branch or fork |
| **Hub-and-spoke** | One core (runtime, gateway, policy) with dependents around it |
| **Swimlanes** | Parallel actors / teams / planes over the same sequence |
| **Before / after** | Migration, “old world → new world,” what changed |
| **Stacked layers** | Only when the post is about a substrate / stack / “built on” story |

Match the **feel**, not a fixed box stack:

- Thin, slightly imperfect strokes (hand-drawn, not CAD-clean — but **not** thick marker)
- **Hachure / cross-hatch fills by default** — quiet gray or soft pastel diagonal lines (Excalidraw classic). Airy spacing between hatch lines. Not flat solid. Not dense packed hatch.
- Hand font (Virgil), regular weight
- Clear hierarchy: one title, few focal shapes, short labels
- Optional accent only when the story has a real cut (e.g. a red dashed callout)

Do **not** force every diagram into four equal pastel cards with numbered badges. Do **not** default to a vertical stack just because an older style preview once looked like one.

## Canvas defaults (lock before drawing)

| Setting | Value | Why |
| --- | --- | --- |
| Font | **Virgil** | Handwritten. Skip Helvetica / Cascadia for this style. |
| Font weight | **Regular** (avoid bold for body / most labels) | Bold + thin boxes fights the light look |
| Roughness | **Artist** (1) — Cartoonist (2) only if strokes stay thin | Sketchy corners without fat marker edges |
| Fill | **Hachure** (or cross-hatch) — quiet gray / soft pastel. **Required.** | Flat solid-only = wrong; dense hatch + thick stroke = too heavy |
| Stroke | **Thin**, dark gray/black (`#1e1e1e` or soft mid-gray borders) | Thick strokes dominate after WebP |
| Background | White | Clean export into `static/bgimg/`. |

Set font + **hachure fill** + stroke weight + roughness **first**, then draw so every shape matches.

In Excalidraw: Fill → **Hachure** (not Solid). Pick a pale `backgroundColor`; hatch lines stay quiet. Cross-hatch is fine if it stays airy.

## Pastel palette (pick what fits)

Soft, muted **hatch** tints. Remix freely — you do not need all four. Keep the tint **pale** so the diagonal lines read as light gray / soft pastel, not a solid slab. Borders can be a slightly stronger tint of the same family.

| Hex (hatch tint) | Feel |
| --- | --- |
| `#eef7ff` / `#d0ebff` | Soft blue |
| `#f0faf0` / `#d3f9d8` | Soft mint |
| `#fff7e6` / `#fff3bf` | Soft cream / yellow |
| `#fff4e6` / `#ffd8a8` | Soft peach / orange |
| `#e9ecef` / `#ced4da` | Quiet gray (safe default hatch) |
| `#f5f0ff` / `#e5dbff` | Soft lavender (use sparingly) |
| `#ffe3e3` | Soft red wash when a warning layer needs color |
| `#e03131` | Accent only (cut lines, “stops here” callouts) |

If a fill looks loud next to a thick border, **thin the stroke** and lighten the hatch tint — do not go back to flat solid, and do not pack denser hatch.

## Hierarchy checklist

1. **One title** for the whole figure (~28–36px Virgil, regular). Not a second headline fighting it.
2. **Optional gray subtitle** under the title (smaller, muted).
3. **One job per shape**: title + optional short caption + a few `·` bullets. No essay inside a box.
4. **Align** edges when things are meant to stack or sit in a row. Uneven left edges look accidental, not spicy.
5. **Gaps** uniform (~16–24px between peers). Leave air inside boxes.
6. **Labels left-aligned** inside boxes. Center only badges / single icons.
7. Prefer **fewer, larger** shapes over a dashboard of tiny chips.

## Optional: numbered badges

Use only when order or layering matters.

1. Ellipse ~28–36px, transparent or very light **hachure** fill, **thin** dark stroke, same roughness.
2. Virgil digit centered inside (regular weight).
3. Group badge + digit; park top-left of the shape, title to the right.

## Optional: hard boundary callout

When the diagram’s point is a cut between two regions:

1. Horizontal line across the relevant width.
2. Stroke `#e03131`, **dashed**, thickness 1–2 (still thin).
3. Optional second line ~6–10px below, lighter.
4. Short italic red text on the right (e.g. `stops here` / `controls vs runtime`).

Make that slightly louder than box borders — not a thick red bar. Skip it if there is no semantic boundary.

## Generator checklist (any diagram)

- [ ] Layout chosen for the story (compare / three-column / flow / hub / swimlanes / before-after / stack) — not defaulted to stacked cards
- [ ] Virgil regular + thin stroke + **hachure / cross-hatch fill** set before first shape
- [ ] Quiet gray or soft pastel hatch visible in every filled shape — **not** flat solid-only
- [ ] Pastel / gray muted — not neon / flat corporate blue / dense hatch + fat border
- [ ] No thick double strokes; no bold-heavy labels
- [ ] One clear title; shapes have one job each; whitespace intact
- [ ] Readable after export (thin ≠ invisible; hatch still visible at WebP size; not a wall of micro-text)
- [ ] Accents (red dash, badges) only if the story needs them
- [ ] PNG → `static/bgimg/<kebab-name>.png` → WebP; keep `.excalidraw` editable

## Export for this blog

1. Export image → PNG (prefer 2x / enough padding so light hatches stay visible).
2. Save under `static/bgimg/` with a kebab name tied to the post.
3. Convert / CI WebP: [How to bulk convert images to webp](/docs/converting-images-to-webp), [Automate webp image github action](/docs/automate-webp-blog).
4. Keep source as `static/excalidraw/<same-slug>.excalidraw` (or next to the raster under `static/bgimg/` if that is already the habit for the post).
5. Turn **embed scene** off for blog assets unless you want the scene stuffed into the PNG.
6. Crop empty canvas margin before commit.
7. Covers and inline diagrams must use **different** basenames — see `.cursor/rules/blog-thumbnails.mdc`.

## Related in this repo

- Editable examples: `static/excalidraw/*.excalidraw` (e.g. `you-cannot-deny-every-tool-and-still-ship.excalidraw`)
- Sometimes source sits beside the raster: `static/bgimg/*.excalidraw`
- **Style preview (canonical thin + quiet hatch look):** `static/bgimg/spicy-excalidraw-style-preview.png` — thin borders, regular Virgil, **visible gray/pastel hachure**. Use for **stroke / fill / type weight only** — **not** a layout to copy. Prefer three-column / compare / swimlane layouts over chunky stacks when either fits.
- Layout/type-weight reference (may lack hatch): `static/bgimg/sbom-for-models-three-inventories.png` — borrow thin strokes and regular text; **add hachure** when regenerating peers.
- There is **no** shared four-layer stack product template — draw per post, keep thin strokes + quiet hatches, vary the composition

<br/>
<h2>Comments</h2>
<Giscus
id="comments"
repo="saintmalik/blog.saintmalik.me"
repoId="MDEwOlJlcG9zaXRvcnkzOTE0MzQyOTI="
category="General"
categoryId="DIC_kwDOF1TQNM4CQ8lN"
mapping="title"
term="Comments"
reactionsEnabled="1"
emitMetadata="0"
inputPosition="top"
theme="preferred_color_scheme"
lang="en"
loading="lazy"
crossorigin="anonymous"
/>
