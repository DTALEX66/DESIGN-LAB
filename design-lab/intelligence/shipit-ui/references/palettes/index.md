# Palette Catalog

Six curated starter palettes used by `/palette <mood>`. Each is OKLCH-anchored, ships an 11-step light and dark ramp (50–950 matching Tailwind/Radix step convention), and a `pairs` array of WCAG-AA-checked foreground/background combinations with measured contrast ratios (rounded to one decimal).

When `/palette` is given a mood string, it picks the closest match here, then fine-tunes around the user's seed if one is provided.

## When to pick each

| Palette | Pick when the project is... |
|---|---|
| `warm-editorial` | A magazine, longform reading surface, blog, book site, food/travel content. Cream + terracotta. Friendly and analog. |
| `neon-brutalism` | A bold landing page, dev-tool marketing site, indie product launch, music/event site. High-chroma magenta on near-black; brutalist density. |
| `cool-corporate` | A SaaS dashboard, fintech, B2B admin, enterprise UI. Slate-blue, restrained chroma, neutrals carry the weight. |
| `soft-pastel` | A wellness, lifestyle, journaling, meditation, or gentle consumer app. Muted rose + lavender; never aggressive even in dark mode. |
| `deep-monochrome` | A typography-led portfolio, documentation, archive, or photo-heavy site where color comes from content. Pure grayscale, zero chroma. |
| `vibrant-tech` | An AI product, modern SaaS, dev platform, or gradient-marketing surface. Violet → cyan; dark mode is the hero. |

## Selection heuristics

- **Default for unknown mood**: `cool-corporate` (safest contrast, broadest fit).
- **Mood mentions "warm", "earthy", "cozy", "editorial"**: `warm-editorial`.
- **Mood mentions "bold", "loud", "punk", "brutalist", "neon"**: `neon-brutalism`.
- **Mood mentions "calm", "soft", "gentle", "wellness"**: `soft-pastel`.
- **Mood mentions "minimal", "mono", "stark", "type-led"**: `deep-monochrome`.
- **Mood mentions "ai", "tech", "modern", "futuristic", "gradient"**: `vibrant-tech`.

## Step semantics (every palette)

| Step | Typical use |
|---|---|
| 50  | App background, lightest cards |
| 100 | Subtle surface, hover-only state |
| 200 | Card background, divider on light |
| 300 | Border, disabled foreground |
| 400 | Muted icon, placeholder text |
| 500 | Primary brand fill, accent |
| 600 | Primary button background, link |
| 700 | Primary button hover, headings |
| 800 | Body heading on light |
| 900 | Body text on light |
| 950 | Strongest text, near-black |

Dark-mode steps invert this: `50` is the deepest background, `950` is the brightest text.

## Constitution compliance

Every pair listed has been chosen so that the contrast ratio meets WCAG AA at the size class noted in `use`. When a pair sits below 4.5, the entry explicitly says "AA large only" — never use such a pair for body text.
