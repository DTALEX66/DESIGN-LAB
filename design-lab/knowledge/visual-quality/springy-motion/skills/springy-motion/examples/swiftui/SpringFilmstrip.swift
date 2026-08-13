// Verification harness (macOS): renders the SwiftUI Spring presets as a static
// filmstrip via ImageRenderer — no simulator needed. Self-contained, run with:
//
//   swift SpringFilmstrip.swift     # writes /tmp/springy_filmstrip.png
//
// Each row is a preset; each box is scaled by the spring's value at a sampled
// time. Peak above the final size = overshoot. This is how the presets were
// confirmed to match the web/CSS versions on the native engine. The (duration,
// bounce) values mirror Springs.swift / references/spring-system.md.

import SwiftUI
import AppKit

private struct Preset { let name: String; let duration: Double; let bounce: Double }
private let presets = [
    Preset(name: "Snap", duration: 0.2, bounce: 0),
    Preset(name: "Glide", duration: 0.5, bounce: 0),
    Preset(name: "Pop", duration: 0.4, bounce: 0.4),
    Preset(name: "Lively", duration: 0.45, bounce: 0.5),
    Preset(name: "Track", duration: 0.35, bounce: 0.18),
]
private let frames = 13

private struct Row: View {
    let preset: Preset
    var body: some View {
        let s = Spring(duration: preset.duration, bounce: preset.bounce)
        let settle = max(s.settlingDuration, 0.2)
        return HStack(spacing: 6) {
            Text(preset.name).font(.system(size: 13, weight: .semibold)).frame(width: 64, alignment: .leading)
            ForEach(0..<frames, id: \.self) { i in
                let t = Double(i) / Double(frames - 1) * settle
                let scale = 0.25 + 0.75 * s.value(target: 1.0, time: t)
                ZStack {
                    RoundedRectangle(cornerRadius: 5).fill(Color(white: 0.97)).frame(width: 40, height: 40)
                    RoundedRectangle(cornerRadius: 5).fill(Color(red: 0.15, green: 0.39, blue: 0.92))
                        .frame(width: 22 * scale, height: 22 * scale)
                }
            }
        }
    }
}

private struct Filmstrip: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("SwiftUI Spring presets — scale filmstrip (peak above final = overshoot)")
                .font(.system(size: 13, weight: .semibold)).foregroundStyle(.secondary)
            ForEach(presets.indices, id: \.self) { Row(preset: presets[$0]) }
        }
        .padding(20).frame(width: 760, alignment: .leading).background(Color(white: 0.96))
    }
}

MainActor.assumeIsolated {
    let renderer = ImageRenderer(content: Filmstrip())
    renderer.scale = 2
    guard let cg = renderer.cgImage,
          let data = NSBitmapImageRep(cgImage: cg).representation(using: .png, properties: [:]) else { print("FAIL"); return }
    try? data.write(to: URL(fileURLWithPath: "/tmp/springy_filmstrip.png"))
    print("OK \(cg.width)x\(cg.height)")
}
