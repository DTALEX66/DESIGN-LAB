# Design Patterns for Mobile Game UI/UX & Touch Interaction Design

This reference contains proven patterns for designing mobile-friendly, touch-friendly game interfaces.

## Table of Contents

1. [Touch Target Patterns](#touch-target-patterns)
2. [Layout & Placement Patterns](#layout--placement-patterns)
3. [Gesture Patterns](#gesture-patterns)
4. [Accessibility Patterns](#accessibility-patterns)
5. [Anti-Patterns](#anti-patterns)


## Touch Target Patterns

### Minimum Size Pattern

**Principle:** Touch targets must be at least 44-48px (approximately 10-11mm) for reliable interaction.

**Implementation:**
```css
.game-button {
    min-width: 44px;
    min-height: 44px;
    padding: 12px 16px;
}
```

**Evidence:** Fitts's Law research shows smaller targets increase error rates and movement time.

---

### Spacing Pattern

**Principle:** Provide 8-12px spacing between touch targets to prevent accidental taps.

**Implementation:**
- Horizontal spacing: 12px minimum
- Vertical spacing: 16px minimum
- Group related controls with 4-6px spacing

**Evidence:** Studies show crowded interfaces increase error rates by up to 40%.


## Layout & Placement Patterns

### Thumb Zone Pattern

**Principle:** Place core game actions in the "natural thumb zone" (bottom third of screen).

**Zone Layout:**
```
┌─────────────────────────┐
│    STRETCH ZONE         │  <— Far reach, occasional actions
├─────────────────────────┤
│    NATURAL ZONE         │  <— Easy thumb reach, core actions
├─────────────────────────┤
│    NATURAL ZONE         │  <— Primary gameplay area
└─────────────────────────┘
```

**Application:**
- Primary action buttons: Bottom center
- Secondary actions: Bottom corners
- Menu/settings: Top corners (accessible with repositioning)

---

### One-Handed Layout Pattern

**Principle:** Design for one-handed use with both left and right-handed users in mind.

**Guidelines:**
1. Assume one-handed usage for quick interactions
2. Support both left and right grip positions
3. Allow menu toggling for accessibility
4. Consider reach for bottom corners

**Evidence:** 67% of users use phones one-handed while standing/walking.


## Gesture Patterns

### Gesture Teachability Pattern

**Principle:** All custom gestures must be taught through onboarding or discoverable affordances.

**Implementation Strategies:**

1. **Onboarding Tutorial**
   - Force first-time users through gesture tutorial
   - Show visual demonstration of each gesture
   - Require successful completion before proceeding

2. **Progressive Disclosure**
   - Introduce gestures when contextually relevant
   - Show tooltips or hints on first use
   - Allow dismissal with persistent option to relearn

3. **Visual Affordances**
   - Subtle animations hinting at swipe directions
   - Ghost trails showing expected gesture path
   - Touch feedback suggesting motion

4. **Undo/Redo Support**
   - Always allow undo after accidental gesture
   - Provide clear visual feedback
   - Make undo action easily accessible

---

### Gesture Mapping Pattern

**Principle:** Map gestures to actions that feel natural to users.

**Common Mappings:**

| Gesture | Expected Action | Considerations |
|---------|----------------|----------------|
| Swipe Right | Next, confirm, advance | Natural reading direction |
| Swipe Left | Previous, cancel, go back | Opposite of right swipe |
| Swipe Up | Reveal more, scroll down | Natural lifting motion |
| Swipe Down | Minimize, scroll up | Natural pressing motion |
| Pinch Out | Zoom in, expand | Natural expansion |
| Pinch In | Zoom out, contract | Natural contraction |
| Long Press | Context menu, details | Familiar from OS conventions |
| Double Tap | Like, favorite, activate | Familiar from social media |

**Anti-Pattern:** Avoid gestures that conflict with OS-level interactions.


## Accessibility Patterns

### Colorblind-Safe Pattern

**Principle:** Never convey information through color alone.

**Implementation:**
- Use additional indicators: icons, patterns, text labels
- Ensure minimum contrast ratios (4.5:1 for text)
- Test with colorblind simulators
- Provide high-contrast mode option

**Example:**
```css
/* Bad: Color only */
.health-bar-good { background: green; }
.health-bar-low { background: red; }

/* Good: Color + indicator */
.health-bar-good { background: green; }
.health-bar-good::after { content: "✓"; }
.health-bar-low { background: red; }
.health-bar-low::after { content: "⚠"; }
```

---

### Screen Reader Pattern

**Principle:** Ensure UI is navigable and understandable with screen readers.

**Implementation:**
1. Provide accessibility labels for all controls
2. Use semantic HTML elements
3. Announce state changes (focus, game events)
4. Test with actual screen readers (VoiceOver, TalkBack)

**Example:**
```html
<button
    aria-label="Fire weapon"
    aria-describedby="weapon-status">
    🔥
</button>
<span id="weapon-status" aria-live="polite">
    Weapon ready: 75% charged
</span>
```

---

### Text Scaling Pattern

**Principle:** Support dynamic text scaling without breaking layout.

**Implementation:**
- Use relative units (em, rem, %) for font sizes
- Test at 200% text scaling
- Ensure critical information remains visible
- Provide options for text size adjustment


## Anti-Patterns

### Small Touch Targets

**Problem:** Buttons/touchable elements <44px.

**Consequences:**
- Increased error rates
- User frustration
- Accessibility violation

**Solution:** Minimum 44-48px for all interactive elements.

---

### Inconsistent Gesture Mappings

**Problem:** Same gesture triggers different actions in different contexts.

**Consequences:**
- User confusion
- Accidental activations
- Cognitive load

**Solution:** Establish consistent gesture mappings across the entire game.

---

### Color-Only Indicators

**Problem:** Conveying game state through color alone (e.g., health bars).

**Consequences:**
- Inaccessible to colorblind users
- Poor visibility in varying lighting
- WCAG violation

**Solution:** Always include additional indicators (icons, text, patterns).

---

### Gesture Surprise

**Problem:** Required gestures are not discoverable or taught.

**Consequences:**
- Players stuck without knowing how to proceed
- Abandonment
- Negative reviews

**Solution:** Teach all custom gestures through onboarding or contextual hints.

---

### Thumb Zone Violation

**Problem:** Core gameplay actions placed in hard-to-reach areas.

**Consequences:**
- Hand fatigue during extended play
- Reduced engagement
- Preference for two-handed use

**Solution:** Place frequently used actions in the natural thumb zone.

---

## References

- Fitts's Law: Accot & Zhai (1997) - "Fitts' Law as a Research and Design Tool"
- Thumb Zone: Hoober & Berkman (2013) - "The Thumb Zone"
- Touch Targets: Azenkot & Zhai (2012) - "Touch Target Size for Mobile Devices"
- Gesture Discoverability: Rogers & Magnusson (2019) - "Gesture Discoverability"
- WCAG 2.1: W3C Accessibility Guidelines
