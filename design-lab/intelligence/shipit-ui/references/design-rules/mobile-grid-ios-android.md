# Design Rule: Mobile Grid — iOS and Android

Authoritative grid guidelines for iOS and Android app surfaces produced by `shipit-ui-design`. Sourced from a user-supplied "Grid Guidelines for iOS and Android" reference and translated into the plugin's token system.

This rule applies to **mobile app UI** (React Native, Flutter, Swift/Kotlin native, mobile-web simulating an app). It does not apply to responsive web — those rules live in `references/responsive-grids/`.

## Reference screen sizes

| Platform | Reference width × height | Notes |
|---|---|---|
| iOS | 393 × 852 px (iPhone 14/15 standard) | iPhone Mini drops to 375; iPhone Pro Max widens to 430. Layouts must reflow. |
| Android | 360 × 640 dp (baseline) | Most modern phones range 360–412 dp wide. Use `dp`, not `px`, for component sizing. |

## Shared rules (apply to both platforms)

| Rule | Value | Token |
|---|---|---|
| Type | Stretch | — |
| Column | Stretch | — |
| Margin (page edge → content) | 16 px / 16 dp | `--space-4` |
| Gutter (between columns) | 16 px / 16 dp | `--space-4` |
| Default column count | 4 | — |
| Touch target minimum | 44 × 44 pt (iOS) / 48 × 48 dp (Android) | platform-specific |

The 16px margin + 16px gutter is the single most important rule. Most "off"-looking mobile screens are spaced at 8 or 24 instead, breaking the platform rhythm.

## iOS — chrome and safe areas

| Region | Height | Token / source |
|---|---|---|
| Status bar | 54 px | platform constant |
| Navigation bar (top) | 42 px (so 96 px total from screen top) | platform constant |
| Tab bar (bottom) | 56 px | `--space-14` |
| Home indicator (gesture area) | 34 px | platform constant |
| Side margin | 16 px | `--space-4` |

Total non-content vertical chrome on iPhone 14: 54 + 42 + 56 + 34 = **186 px**. Effective content area ≈ 393 × 666 px.

Use SwiftUI `safeAreaInsets` / React Native `useSafeAreaInsets()` rather than hardcoding these. The values above are for layout planning, not runtime.

## Android — chrome and safe areas

| Region | Height | Token / source |
|---|---|---|
| Status bar | 24 dp | platform constant |
| App bar (top) | 56 dp | `--space-14` |
| Bottom nav bar | 56 dp | `--space-14` |
| Android system gesture / nav area | 48 dp | platform constant |
| Side margin | 16 dp | `--space-4` |

Total chrome: 24 + 56 + 56 + 48 = **184 dp**. Effective content area ≈ 360 × 456 dp at the baseline reference.

Use Material `WindowInsets` / Jetpack Compose `WindowInsets.systemBars` rather than hardcoding.

## Cross-platform when shipping React Native / Flutter

- Pick the **larger** chrome value when supporting both. Status bar: assume 54 px; tab/bottom nav: assume 56 px; bottom safe area: assume 34 px.
- Always use safe-area APIs at runtime — never literal pixel offsets in layout code.
- Touch targets: meet **48 dp** (the larger of the two minimums).
- App bar height: prefer the platform-native chrome rather than rolling your own. Use `react-native-screens` / `expo-router` or the Flutter `AppBar` widget.

## Vertical rhythm inside the content area

Apply the same vertical rhythm rules as the desktop sidebar (see `references/spacing-cheat-sheets/desktop-sidebar.md`), but scaled for thumb reach:

| From → To | Mobile gap | Token |
|---|---|---|
| Section heading → body | 12 px | `--space-3` |
| List item → list item | 1 px hairline + 16 px padding | mixed |
| Card → card (vertical stack) | 12 px | `--space-3` |
| Section → section | 24 px | `--space-6` |
| Bottom-most content → tab bar | 24 px | `--space-6` |

## Typography on mobile

| Role | iOS (pt) | Android (sp) | Notes |
|---|---|---|---|
| Display / title | 28–34 | 24–28 | Use larger end for landing screens; smaller for in-app |
| Headline | 22 | 20 | Section header inside a screen |
| Body | 17 | 16 | Default reading size |
| Footnote / caption | 13 | 12 | Metadata, timestamps |

Use platform system fonts: SF Pro on iOS, Roboto on Android. Do not ship a custom display font without a strong reason — system fonts ship optimized for each device's rendering pipeline.

## Touch target rules

- Minimum: 44 × 44 pt (iOS HIG) / 48 × 48 dp (Material).
- Visual size of the icon may be smaller; the **hit area** must meet the minimum. Use `padding`, not `margin`, to extend the hit area.
- Adjacent tap targets: keep at least 8 px / 8 dp clear between hit areas. Below that, mis-taps spike.

## Bottom sheets, modals, drawers

| Pattern | iOS convention | Android convention |
|---|---|---|
| Bottom sheet handle | 36 × 5 px pill | 32 × 4 dp pill |
| Bottom sheet top corner radius | 12 px | 28 dp (M3) |
| Modal scrim opacity | 0.4 black | 0.32 (M3 scrim token) |
| Sheet detent positions | small / medium / large | hidden / collapsed / half / expanded |

When in doubt, follow the platform native pattern. Custom sheet behavior is the most common source of "this app feels off" reviews.

## When to break the rules

- **Custom-branded experiences** (games, immersive media, first-run onboarding): break the safe-area chrome conventions deliberately, and re-establish them once the user enters the app proper.
- **Cross-platform consistency over native feel:** some teams pick consistency (same UI on iOS and Android) over native feel (each platform's conventions). Document the choice; do not let it drift.

## How `shipit-ui-design` applies the rule

- `/component` checks the project context — if React Native / Flutter / Expo / native is detected, components default to the mobile rules above.
- `/design init` emits mobile-specific tokens (touch target min, app bar height, tab bar height) under `--mobile-*` aliases when a mobile stack is detected.
- `/refine` running on mobile contexts uses mobile viewports (iPhone 14: 393×852; Pixel 7a: 412×915) instead of the desktop default.

## Cross-references

- Tokens recipe → `references/color-tools/tokens-recipe.md`
- Desktop spacing cheat sheet (sibling) → `references/spacing-cheat-sheets/desktop-sidebar.md`
- Responsive web grid (different rule set) → `references/responsive-grids/`
