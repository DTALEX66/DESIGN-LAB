import SwiftUI

/// springy-motion presets for SwiftUI.
///
/// One perceptual `(duration, bounce)` intent, matched to the web (Motion) and
/// CSS `linear()` presets in `references/spring-system.md`. Drop this file in and
/// write `withAnimation(.springyPop) { … }`.
///
/// Derived physics (mass 1): stiffness = (2π/duration)², damping = 4π(1−bounce)/duration.
public extension Animation {
    /// Instant, crisp, zero overshoot. Press, toggle, selection, high-frequency / keyboard.
    static let springySnap = Animation.spring(duration: 0.2, bounce: 0)
    /// Smooth, calm, no overshoot. Sheets, routes, modals — the default A→B.
    static let springyGlide = Animation.spring(duration: 0.5, bounce: 0)
    /// Snappy with a satisfying overshoot (~9%). Pop-in, success, confirm — default delight.
    static let springyPop = Animation.spring(duration: 0.4, bounce: 0.4)
    /// Playful bounce (~16%). Confetti, FAB, onboarding — the rare delight peak.
    static let springyLively = Animation.spring(duration: 0.45, bounce: 0.5)
    /// Finger-tight settle (~1%). Release-settle for drags, swipes, sheets.
    static let springyTrack = Animation.spring(duration: 0.35, bounce: 0.18)

    /// While a gesture is active, track the finger 1:1 with this; hand off to `.springyTrack` on release.
    static let springyInteractive = Animation.interactiveSpring(response: 0.15, dampingFraction: 0.86)
}

/// The `Spring` values, if you need the raw physics (e.g. to seed a custom animator).
public enum SpringyPreset: CaseIterable {
    case snap, glide, pop, lively, track

    public var spring: Spring {
        switch self {
        case .snap: Spring(duration: 0.2, bounce: 0)
        case .glide: Spring(duration: 0.5, bounce: 0)
        case .pop: Spring(duration: 0.4, bounce: 0.4)
        case .lively: Spring(duration: 0.45, bounce: 0.5)
        case .track: Spring(duration: 0.35, bounce: 0.18)
        }
    }

    public var animation: Animation {
        switch self {
        case .snap: .springySnap
        case .glide: .springyGlide
        case .pop: .springyPop
        case .lively: .springyLively
        case .track: .springyTrack
        }
    }
}

// Usage:
//   @Environment(\.accessibilityReduceMotion) private var reduceMotion
//   withAnimation(reduceMotion ? .smooth(duration: 0.2) : .springyPop) { shown.toggle() }
