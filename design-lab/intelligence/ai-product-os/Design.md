# Design System Reference

> Single source of truth for any agent or developer working on this project.
> Update this file whenever you add tokens to `T` in `shared.jsx`.

---

## Color Tokens (`T.*`)

| Token | Value | Usage |
|-------|-------|-------|
| `T.brand` | `#6366f1` | Primary interactive accent (links, active states) |
| `T.brand2` | `#818cf8` | Lighter accent tint |
| `T.brand3` | `#c7d2fe` | Subtle background tint for active pills |
| `T.bg` | `#FFFFFF` | Screen backgrounds — **always pure white** |
| `T.bg2` | `#F9FAFB` | Secondary fills — chips, input bg, step cards |
| `T.card` | `#FFFFFF` | Card surfaces |
| `T.fill3` | `rgba(0,0,0,0.03)` | Very subtle layer tint |
| `T.warmBorder` | `rgba(0,0,0,0.08)` | Input / search inset border |
| `T.cardStroke` | `rgba(0,0,0,0.06)` | Card inset border |
| `T.inputStroke` | `#e5e7eb` | Input field explicit borders |
| `T.sep` | `rgba(0,0,0,0.06)` | Dividers, nav borders |
| `T.sepN` | `rgba(0,0,0,0.08)` | Stronger separator |
| `T.accentGrad` | `linear-gradient(135deg, #4f46e5, #312e81)` | Icon button gradient fills |
| `T.label` | `#111827` | Main / primary text |
| `T.label2` | `#4b5563` | Subtext, captions |
| `T.label3` | `#9ca3af` | Placeholders, metadata |
| `T.green` | `#10b981` | Success states, positive values |
| `T.greenTint` | `#ecfdf5` | Success background fills |
| `T.red` | `#ef4444` | Error / destructive text |
| `T.redTint` | `#fef2f2` | Error background fills |
| `T.amberText` | `#d97706` | Warning text |
| `T.amberTint` | `#fffbeb` | Warning background fills |

---

## Typography

| Token | Value | Notes |
|-------|-------|-------|
| `T.font` | `'Geist', -apple-system, system-ui, sans-serif` | Primary UI font |
| `T.mono` | `'Geist Mono', ui-monospace, monospace` | Code / mono |

### Type Scale
| Name | Size | Weight | Usage |
|------|------|--------|-------|
| text-xs | 11px | 400–500 | Tab labels, metadata |
| text-sm | 12–13px | 400–600 | Captions, chips, badges |
| text-base | 14–15px | 400–600 | Body, list items |
| text-lg | 16–18px | 600–700 | Screen titles, section headers |
| text-xl | 20px+ | 700–800 | Card headings, hero text |

---

## Spacing & Radius

| Name | Value | Usage |
|------|-------|-------|
| `SAFE_TOP` | `12px` | Top padding for screen headers |
| `NAV_H` | `84px` | Bottom tab bar height (incl. safe area) |
| Horizontal pad | `16–20px` | Screen content padding |
| Card gap | `12px` | Grid / list gaps |
| `rounded-lg` | `12px` | Small chips / badges |
| `rounded-xl` | `16px` | Card default radius |
| `rounded-2xl` | `20px` | Large cards / sheets |
| `rounded-full` | `9999px` | Pills, chips, buttons, search bar |

---

## Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `T.xs` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle card lift |
| `T.sm` | `0 2px 8px rgba(99,102,241,0.04), 0 1px 2px rgba(0,0,0,0.03)` | Small cards |
| `T.md` | `0 4px 20px rgba(99,102,241,0.08), 0 2px 6px rgba(0,0,0,0.04)` | Modals, sheets |
| `T.lg` | `0 10px 30px rgba(99,102,241,0.12), 0 4px 12px rgba(0,0,0,0.06)` | Bottom nav, large elements |

> Shadows use **indigo-tinted** values — not pure black — for a premium, cohesive look.

---

## Shared Components (`shared.jsx`)

### `TopBar`
```jsx
<TopBar title="Screen Title" onBack={() => api.pop()} right={<node />} center={false} shadow={scrolled} />
```
- Always `T.bg` (`#FFFFFF`) background
- `shadow` prop: pass `scrolled` from `useStickyHeader()`

### `PrimaryBtn`
```jsx
<PrimaryBtn onClick={fn} disabled={false} style={{}}>Label</PrimaryBtn>
```
- Background: `T.accentGrad` (indigo gradient)
- Disabled: `T.bg2` background, `T.label3` text
- Height: `50px`, radius: `25px`

### `OutlineBtn`
```jsx
<OutlineBtn onClick={fn}>Label</OutlineBtn>
```
- Border: `1.5px solid T.brand`, color: `T.brand`

### `Card`
```jsx
<Card pad={16} onClick={fn} style={{}}>…</Card>
```
- Border: `1px solid T.cardStroke`
- Radius: `16px`
- Shadow: `T.xs`

### `useStickyHeader` Hook
```jsx
const { scrolled, onScroll } = useStickyHeader();
// <TopBar shadow={scrolled} />
// <div className="scroll" onScroll={onScroll}>
```

---

## Screen Architecture

```jsx
function MyScreen({ params }) {
  const api = useApp();
  const { scrolled, onScroll } = useStickyHeader();
  return (
    <div className="layer">
      <TopBar title="My Screen" onBack={() => api.pop()} shadow={scrolled} />
      <div className="scroll" style={{ flex: 1, padding: `16px 16px ${NAV_H + 24}px` }} onScroll={onScroll}>
        {/* content */}
      </div>
    </div>
  );
}
Object.assign(window, { MyScreen });
```

All screens: white (`#FFFFFF`) background. Visual hierarchy uses card inset borders and `T.bg2` fills — not background color changes.

---

## Figma Board Token Mapping

| Figma Style | Code Token |
|-------------|------------|
| Primary Brand / Indigo | `T.brand` |
| Background | `T.bg` |
| Secondary Fill | `T.bg2` |
| Text Primary | `T.label` |
| Text Secondary | `T.label2` |
| Text Tertiary | `T.label3` |
| Separator | `T.sep` |
| Success | `T.green` / `T.greenTint` |
| Error | `T.red` / `T.redTint` |
| Warning | `T.amberText` / `T.amberTint` |
| Shadow Small | `T.sm` |
| Shadow Medium | `T.md` |
| Font Primary | `T.font` (Geist) |
| Font Mono | `T.mono` (Geist Mono) |
