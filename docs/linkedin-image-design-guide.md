---
title: LinkedIn image design guide (minimal Swiss / brutalist)
---

import Giscus from "@giscus/react";

LinkedIn cover and post images for this blog use a minimal Swiss or brutalist poster look. Use large empty space, two or three colors, clear labeled parts, and one idea. This guide is separate from the spicy Excalidraw recipe for blog diagrams.

Canonical preview: `/bgimg/linkedin-image-style-preview.png` (same look as `linkedin-agent-substrate-minimal.png`).

## When to use this vs Excalidraw

| Surface | Guide | Goal |
| --- | --- | --- |
| LinkedIn cover or post eye-catch | This guide | Stop the scroll. One claim. Scannable labels. |
| Blog post diagram (inline or figure) | [Excalidraw style recipe](/docs/excalidraw-diagram-generator-guide) | Teach a flow or compare. Quiet hachure. Hand-drawn Virgil. |

Do not mix the two. LinkedIn covers do not need Excalidraw hatch overload. Blog diagrams do not need nightclub poster energy.

## Target look (lock this)

Minimal poster. Thin black outlines on a light ground. Large negative space between parts. Labels in small all-caps sans or mono. One short caption under a hairline at the bottom is fine.

| Do | Do not |
| --- | --- |
| 1280×720 landscape (LinkedIn-friendly) | Square meme crops as the only cover |
| 2–3 colors total (ground + ink + one accent at most) | Purple AI gradient, neon glow, sticker rainbow |
| Clear labeled parts (AGENT, SUBSTRATE, EGRESS) | Sticker-bomb of jargon chips |
| Intentional figure (robot, pod, door) that reads in one glance | Vague human blob or mascot with no job |
| One idea per image (example: secret stays at egress, not in the agent) | Wall of competing claims |
| Accent used once, sparingly (example: one terracotta key) | Full cream + terracotta cliché wash across the frame |
| Wide empty center so the eye can travel | Crowded collage edge to edge |

## Composition rules

1. Pick one claim. Write it as a short caption or as the relation between two labeled parts.
2. Place two or three focal parts with space between them. Do not fill the center for decoration.
3. Label each part above or inside it in small caps. Keep sub-labels short (example: `SPIFFE / Vault` inside the egress door).
4. Draw the figure on purpose. An agent is a clear robot or pod, not a soft silhouette.
5. If the story is about secrets, put the secret mark at the egress. Use a broker or vault door. Do not put the secret on the agent body.
6. If the claim needs words, add one thin baseline near the bottom. Put one lowercase caption under it.

## Color

- Ground: light off-white or cool gray. Prefer a cool paper tint over warm cream when you can.
- Ink: near-black thin lines and labels.
- Accent: one hue, one object. Terracotta on a single key worked; do not flood the board with that accent.
- Avoid: purple-to-indigo AI defaults, nightclub neon, dense multi-color fills.

## Anti-patterns (reject on sight)

- Degen graffiti chaos: dense doodles, thick marker, noise hatch everywhere
- Excalidraw hachure overload on a LinkedIn cover
- Crowded jargon walls and pill clusters
- Nightclub mascots, glow stickers, floating badges on the hero plane
- Vague blob people that do not read as the agent

## Export for this blog

1. Export at 1280×720 (or 2x then scale) as PNG.
2. Save under `static/bgimg/` with a kebab name tied to the post or campaign.
3. Keep a WebP sibling if the site pipeline expects it. See [How to bulk convert images to webp](/docs/converting-images-to-webp).
4. If you have an editable source (Figma, SVG, or scene file), keep it next to the raster or under a clear path.
5. Covers and inline blog diagrams must use different basenames. See `.cursor/rules/blog-thumbnails.mdc`.

## Checklist

- [ ] 1280×720 landscape
- [ ] One idea; caption or labeled relation states it
- [ ] 2–3 colors; accent used once or not at all
- [ ] Large negative space; parts labeled and scannable
- [ ] Figure is intentional (robot / pod / door), not a vague blob
- [ ] No graffiti chaos, hatch overload, jargon wall, or nightclub mascot
- [ ] PNG under `static/bgimg/`; style match checked against `linkedin-image-style-preview.png`

## Related in this repo

- Style preview (canonical): `static/bgimg/linkedin-image-style-preview.png`
- Worked example: `static/bgimg/linkedin-agent-substrate-minimal.png`
- Blog diagrams (different style): [Excalidraw style recipe (spicy hand-drawn)](/docs/excalidraw-diagram-generator-guide)

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
