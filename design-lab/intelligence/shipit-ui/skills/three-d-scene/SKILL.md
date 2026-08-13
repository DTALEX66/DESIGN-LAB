---
name: three-d-scene
description: Author React Three Fiber scenes — camera setup, drei utilities, instancing, suspense boundaries, and mobile-fallback strategy; auto-activates on `/scene` and R3F files.
type: skill
---

# Three-D Scene

R3F scenes are heavy. Always scoped to a single component, always behind a Suspense boundary, always with a still-image fallback for mobile and reduced-motion users. Adding `three`, `@react-three/fiber`, `@react-three/drei` to deps requires explicit user confirmation (spec 6.8).

## Constitution (verbatim — applies to every artifact)

> 1. Max 300 lines per file. If a generated component would exceed, split before writing.
> 2. No hardcoded design values. Colors, spacing, radii, shadows, durations, easings — all from tokens.
> 3. Every interactive element has hover, active, focus-visible, and disabled states.
> 4. All motion respects `prefers-reduced-motion`.
> 5. Every image / illustration has alt text or `aria-hidden` if decorative.
> 6. Dark mode is never an afterthought — emitted alongside light from the start.
> 7. Stack-respect: never introduce a new framework or styling system; adapt to what's there.

---

## Bundled templates

The four templates in spec 6.8. Pick the closest match before writing custom geometry.

| Template | Use |
|---|---|
| `ambient-particles` | Decorative background; instanced points or sprites drifting |
| `product-showcase` | Single hero object, slow auto-orbit, soft env lighting |
| `hero-gradient-mesh` | Animated noise-driven plane; cheap, looks expensive |
| `scroll-driven-camera` | Camera path tied to scroll Y; storytelling sections |

---

## Canvas setup

```tsx
<Canvas
  camera={{ position: [0, 0, 6], fov: 45 }}
  dpr={[1, 2]}                       // cap retina cost
  gl={{ antialias: true, powerPreference: "high-performance" }}
  frameloop="demand"                 // render only on change; switch to "always" only when truly animating every frame
>
  <Suspense fallback={null}>
    <Scene />
  </Suspense>
</Canvas>
```

Rules:
- `dpr={[1, 2]}` — uncapped DPR on 3× phones is the #1 perf foot-gun.
- `frameloop="demand"` for static scenes; explicit `invalidate()` after state change.
- Always wrap content in `<Suspense>` — drei/textures/gltf throw promises.

---

## Camera

| Scene | Type | fov | Notes |
|---|---|---|---|
| Hero / product | Perspective | 35–45 | Lower fov = less distortion, more cinematic |
| Wide environment | Perspective | 60–75 | Standard |
| UI overlays | Orthographic | — | Pixel-perfect, no perspective drift |

Default position: pull back enough that the subject occupies ~60% of frame. Use `<PerspectiveCamera makeDefault>` from drei when you need to switch cameras at runtime.

---

## drei utilities to prefer

| Utility | Use instead of |
|---|---|
| `OrbitControls` | hand-rolled mouse listeners |
| `Environment` (`preset="city" \| "studio" \| "sunset"`) | manual HDRIs |
| `ContactShadows` | shadow-map setup for a single ground shadow |
| `Float` | custom sin-wave hover |
| `Instances` + `Instance` | manual instanced-mesh wiring |
| `Html` | DOM-in-3D overlays |
| `useGLTF` | hand-rolled loader |
| `Bounds` + `useBounds` | manual fit-to-view |
| `PerformanceMonitor` | manual fps watcher |
| `AdaptiveDpr`, `AdaptiveEvents` | manual dpr scaling |

`Environment preset` is the cheapest way to get good lighting; reach for it before adding lights manually.

---

## Performance pitfalls

### 1. Re-creating geometry/material per frame
Define geometry and materials outside `useFrame`, or memoize.
```tsx
const geom = useMemo(() => new THREE.SphereGeometry(1, 32, 32), []);
```

### 2. Hundreds of meshes vs instanced mesh
Anything > ~50 repeated meshes uses `<Instances>`:
```tsx
<Instances limit={1000}>
  <sphereGeometry args={[0.05, 8, 8]} />
  <meshStandardMaterial color={"var(--color-brand)" /* via uniform; see tokens note */} />
  {points.map((p, i) => <Instance key={i} position={p} />)}
</Instances>
```
(Token integration: pass tokens as JS values resolved at runtime via `getComputedStyle`, or accept a `color` prop and let the wrapper component read the token.)

### 3. Sub-tree state changes triggering re-render
Use `useFrame` for animation, not React state. State only at scene boundaries.

### 4. Loading hero models on the main bundle
Lazy-load the scene component:
```tsx
const Scene = dynamic(() => import("./scene"), { ssr: false, loading: () => <Fallback /> });
```

### 5. Shadow-map cost
`shadow-mapSize` defaults are heavy. Set `[1024, 1024]` for hero, `[512, 512]` for ambient. Or skip dynamic shadows entirely and use `ContactShadows`.

### 6. Antialiasing on high-DPR mobile
On phones, prefer `antialias: false` + `<Postprocessing>`'s SMAA, or just accept aliasing. Test on a real device.

---

## Mobile-fallback strategy

Three layers, applied in order:

1. **Reduced-motion**: if `prefers-reduced-motion`, render a still-image poster (rendered once at build, or `<Canvas frameloop="never">` after first paint).
2. **Small viewport**: below `768px`, swap the `<Canvas>` for the same poster image.
3. **Low-end device**: use `<PerformanceMonitor onDecline={…}>` to drop DPR (`<AdaptiveDpr pixelated />`) and disable post-processing when fps < 40.

```tsx
function HeroScene() {
  const reduced = useReducedMotion();
  const isSmall = useMediaQuery("(max-width: 768px)");
  if (reduced || isSmall) return <HeroPoster />;
  return (
    <Canvas dpr={[1, 2]} frameloop="demand">
      <AdaptiveDpr pixelated />
      <Suspense fallback={<HeroPoster />}>
        <Scene />
      </Suspense>
    </Canvas>
  );
}
```

The poster is an SVG or static PNG generated alongside the scene — never leave a blank box.

---

## Suspense boundaries

One per resource group. Don't gate the whole canvas on a single boundary if some assets can stream in independently.

```tsx
<Canvas>
  <Suspense fallback={null}>
    <Environment preset="studio" />
  </Suspense>
  <Suspense fallback={<PlaceholderBox />}>
    <HeroModel />
  </Suspense>
</Canvas>
```

Outside the canvas, wrap the canvas itself in a Suspense for code-splitting:
```tsx
<Suspense fallback={<HeroPoster />}>
  <HeroScene />
</Suspense>
```

---

## Token integration

Three.js takes raw color values; tokens live in CSS. Bridge at the wrapper:

```tsx
function readToken(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
function HeroScene() {
  const brand = useMemo(() => readToken("--color-brand"), []);
  return <Canvas>…<meshStandardMaterial color={brand} />…</Canvas>;
}
```

Re-read on theme change (subscribe to a `theme` context or `MutationObserver` on `data-theme`). Never paste a hex into the scene file.

---

## Accessibility

A 3D scene is decorative by default. Wrap the `<Canvas>` in a div with:
```tsx
<div role="img" aria-label="Animated hero showing floating product cards">
  <Canvas …>…</Canvas>
</div>
```
Or, if the scene is purely ornamental and the surrounding text covers meaning:
```tsx
<div aria-hidden="true"><Canvas …>…</Canvas></div>
```

Do not put critical content inside `<Canvas>` — screen readers can't see it. Use drei `<Html>` for any text that must be announced.

---

## File layout

- Scene component: `components/scenes/<Slug>.tsx` — ≤ 300 lines.
- Heavy geometry/shaders split into siblings: `<Slug>Mesh.tsx`, `<Slug>Materials.tsx`.
- Posters: `public/scenes/<slug>.poster.svg` (or `.png` if photographic).
- Always lazy-loaded by the consuming page (`dynamic(import …, { ssr: false })`).

---

## Anti-patterns

- `<Canvas>` without Suspense.
- Uncapped DPR on retina (`dpr` omitted).
- Loading `.glb` files > 2 MB without compression (`.glb` → Draco/Meshopt; document the trade).
- Listening to scroll/mouse with React state — use refs and `useFrame`.
- Postprocessing stacks (Bloom + DOF + SSAO) on mobile.
- Animating CSS variables from inside the canvas — bridge in JS, not via DOM thrash.
