# Image-to-Palette Extraction

Extracting a palette from an image is a noisy, opinionated process. The goal is not "the dominant colors" but "a coherent design palette suggested by this image." Those are different problems.

## When extraction is appropriate

- The user has a brand asset (logo, hero photograph, illustration) and wants tokens that match.
- Mood-board work where visual identity is being defined alongside the system.

## When to refuse / warn

- **Source has too few unique colors** (< 8 distinct clusters). Likely a stylized icon — extract one anchor and recommend `harmonies.md` for the rest.
- **Source is a screenshot of an existing UI.** Color management can shift the source by 5–10ΔE. Ask for the original asset.
- **Source is heavily JPEG-compressed.** Block artifacts produce phantom colors at edges. Warn and downsample first.
- **Source has dominant whites/blacks from background.** These may not represent the brand color but the photo studio.

When uncertain, surface the warning to the user before proceeding.

## Algorithm

### Step 1 — Decode

Decode to raw RGB. Strip alpha (premultiply or skip transparent pixels — premultiply is safer for icons with anti-aliased edges).

### Step 2 — Downsample

Resize to a max edge of ~256px. Reduces noise and speeds clustering.

### Step 3 — Convert to perceptual space

**Cluster in OKLab, not sRGB.** Naive sRGB clustering produces clusters that are mathematically tight but perceptually mixed. OKLab clusters group what looks similar.

### Step 4 — Cluster

Two strong options:

#### K-means in OKLab
- Choose k = 8 to 12.
- Initialize with k-means++.
- Run 20–50 iterations.
- Output: k centroids + cluster sizes.
- Pros: produces well-separated colors.
- Cons: sensitive to k; can split a single perceptual color across two clusters.

#### Median cut
- Recursively split the OKLab color box along its longest axis.
- Output: 2^n leaf colors (typically 8 or 16).
- Pros: fast, deterministic.
- Cons: can produce clusters with low population (visually unimportant colors).

Recommendation: k-means in OKLab with k=10. Median cut is a fine fallback for very large images where speed matters.

### Step 5 — Prune

Remove:
- Clusters with fewer than ~1% of total pixels (visual noise).
- Near-duplicate clusters (ΔE in OKLab < 6) — collapse to the larger.
- Clusters very close to pure white or black (`L > 95` or `L < 8`) unless the image is predominantly that — usually background, not brand.

After pruning, you typically have 4–8 meaningful colors.

### Step 6 — Pick semantic anchors

You usually want one primary, one accent, and a neutral.

Heuristics:
- **Primary:** highest-population cluster with chroma `C > 0.06` (skip neutral grays). Often the brand color.
- **Accent:** second-highest cluster with hue ≥ 60° away from primary in OKLCH. This avoids picking a near-relative.
- **Neutral:** the largest low-chroma cluster (`C < 0.04`).
- **Backgrounds:** if there's a near-white or near-black cluster, surface those as `--color-surface` candidates.

If no accent candidate exists ≥ 60° from primary, fall back: pick the highest-chroma cluster regardless of hue distance, and warn the user that the image contained a single hue family.

### Step 7 — Build ramps

Treat each chosen anchor as a 500-step (or close to it) and run the ramp generator (`ramps.md`).

### Step 8 — Verify

Run the accessibility checks (`accessibility.md`). If a brand anchor at L=58 fails contrast against intended surfaces, **either** push the ramp's 500 darker, **or** flag the brand color as decorative-only and pick a darker step (700) for text usage.

## Library choices (verify at build time per spec §11)

Pure-extraction libraries:

### `node-vibrant`
- Wraps Vibrant.js; popular in web projects.
- Returns predefined swatches (Vibrant, Muted, DarkVibrant, etc.) — opinionated.
- Pros: easy; image decode included.
- Cons: clusters in HSL-adjacent space; results are "fine" not "great"; abandoned-ish maintenance.
- Selection criteria: prototyping and quick demos.

### `quantize` + custom OKLab pipeline
- Hand-roll: decode with `sharp` or `@napi-rs/canvas`, convert to OKLab via `culori`, cluster manually.
- Pros: full control; perceptual correctness.
- Cons: more code.
- Selection criteria: production use; care about quality.

### `colorthief`
- Median-cut implementation. Long lineage.
- Pros: small, deterministic.
- Cons: clusters in sRGB; results worse than OKLab on colorful images.
- Selection criteria: minimum-dependency contexts.

**Do not hard-pick.** Verify maintenance and alternatives at the moment `/palette` is implemented.

## Common mistakes specific to extraction

- **Trusting the first run.** K-means with random init can produce different clusters per run. Either k-means++ (deterministic enough) or run 5x and pick the lowest-distortion result.
- **Including transparent pixels at face value.** Pre-multiply or skip them — anti-aliased edges contribute phantom intermediate colors.
- **Treating the largest cluster as "the brand color."** Backgrounds are usually largest. Filter by chroma first.
- **Ignoring image gamma.** A photo taken with sRGB gamma vs Rec.2020 gamma will yield different OKLab clusters. If the image carries an ICC profile, honor it.
- **Extracting from a screenshot of a website.** The screenshot has been gamma-corrected, often re-encoded by the OS; the result is several ΔE off from the source. Always prefer the source asset.
- **Picking 5 anchors and calling it a palette.** Anchors are inputs to the ramp builder, not finished tokens.

## Output format

Return a structured result, not a list of hexes:

```yaml
source: brand.png
clusters:
  - hex: "#4f46e5"
    oklch: [0.54, 0.21, 274]
    population: 0.34
    role_suggested: primary
  - hex: "#f59e0b"
    oklch: [0.78, 0.18,  68]
    population: 0.18
    role_suggested: accent
  - hex: "#1e293b"
    oklch: [0.27, 0.04, 257]
    population: 0.22
    role_suggested: fg
warnings: []
```

This makes the extraction auditable. The user can override role assignments without re-running.

## Minimum quality bar to ship

- ≥ 4 clusters survive pruning.
- A primary candidate exists with `C > 0.06`.
- Background candidates exist (one near-white or near-black).
- No ΔE < 6 collisions among final anchors.

If any of these fails, surface the failure with a recommended remediation (different image, supplement with a brand-strategy session, fall back to harmonies-from-anchor).
