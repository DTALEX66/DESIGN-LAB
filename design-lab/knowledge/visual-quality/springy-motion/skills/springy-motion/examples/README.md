# Examples

Runnable proof that the presets in `../references/spring-system.md` produce beautiful, matched motion on both platforms. These are also where the presets were tuned.

## `gallery/` — web (Vite + React + Motion)

```bash
cd gallery
npm install
npm run dev        # http://localhost:5178
```

Two tabs:
- **Interactions** — live, interactive recipes (press, pop-in, draggable sheet, shared-element morph, text morph, stagger, direction-aware tabs, ticker + success). These are the same components documented in `../references/recipes-web.md`.
- **Springs (verify)** — the deterministic **filmstrip harness**. Each spring is rendered as seeked WAAPI frames, so a single still shows the whole curve (overshoot, settle, timing). This is how `Snap / Glide / Pop / Lively / Track` were calibrated. See `src/genSpring.ts` for the `(duration, bounce)` → `linear()` generator and `src/Filmstrip.tsx` for the harness.

## `swiftui/` — native

- **`Springs.swift`** — drop-in `Animation` presets (`.springyPop`, etc.) matched to the web/CSS system. The artifact you actually copy into an app.
- **`SpringFilmstrip.swift`** — a macOS verification harness. Renders the SwiftUI `Spring` presets as a static filmstrip via `ImageRenderer` (no simulator needed):

```bash
cd swiftui
swift SpringFilmstrip.swift     # writes /tmp/springy_filmstrip.png
```

Compare it to the web "Springs (verify)" tab — the curves match, because both platforms drive the same perceptual `(duration, bounce)`.

## Verification evidence

`../assets/` holds captured stills from these harnesses: `web-spring-presets.png`, `web-gallery.png`, `web-shared-element-morph.png`, `swiftui-spring-presets.png`.
