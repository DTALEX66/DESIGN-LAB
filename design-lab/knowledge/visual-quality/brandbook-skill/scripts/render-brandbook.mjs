#!/usr/bin/env node
// brandbook renderer — deterministic, zero-LLM-token HTML generation.
// Reads design-model.yaml, emits a self-contained brandbook.html.
// Usage: node scripts/render-brandbook.mjs <path/to/design-model.yaml> [-o out.html]
//
// Requires the `yaml` package once: npm i yaml   (anywhere on the resolve path)

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

let parseYaml;
try {
  ({ parse: parseYaml } = await import('yaml'));
} catch {
  console.error('Missing dependency: run `npm i yaml` in the skill folder (or any parent), then retry.');
  process.exit(1);
}

const args = process.argv.slice(2);
const modelPath = args.find((a) => !a.startsWith('-'));
if (!modelPath) {
  console.error('usage: node render-brandbook.mjs <design-model.yaml> [-o brandbook.html]');
  process.exit(1);
}
const outIdx = args.indexOf('-o');
const outPath = outIdx > -1 ? args[outIdx + 1] : join(dirname(resolve(modelPath)), 'brandbook.html');

const m = parseYaml(await readFile(modelPath, 'utf8'));

// ── reference resolution ────────────────────────────────────
// "{tokens.accent}"  → var(--accent)          (mode-aware via CSS custom props)
// "{radii.control}"  → var(--rad-control)
// "{neutral.500}" / "{brand.300}" / "{green.50}" → hex from primitives
const prim = m.primitives?.colors ?? {};
function resolveRef(ref) {
  const path = ref.slice(1, -1); // strip { }
  const [head, ...rest] = path.split('.');
  if (head === 'tokens') return `var(--${rest.join('-').replace(/_/g, '-')})`;
  if (head === 'radii') return `var(--rad-${rest.join('-')})`;
  if (prim[head]) {
    const v = rest.reduce((o, k) => (o == null ? o : o[k]), prim[head]);
    if (v != null) return String(v);
  }
  return ref; // unresolved — leave visible so validation catches it
}
const rx = /\{[a-zA-Z0-9_.\-]+\}/g;
const R = (val) => {
  if (val == null) return '';
  const s = String(val);
  return s.replace(rx, (r) => resolveRef(r));
};
// resolve to literal hex even for {tokens.*} (needed inside gradients where var() is fine, so rarely used)
function literal(ref, mode) {
  const s = String(ref);
  return s.replace(rx, (r) => {
    const path = r.slice(1, -1).split('.');
    if (path[0] === 'tokens') {
      const t = m.tokens?.colors?.[mode]?.[path[1]] ?? m.tokens?.colors?.[path[1]];
      return t ? literal(t, mode) : r;
    }
    return resolveRef(r);
  });
}

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const px = (v) => (typeof v === 'number' ? v + 'px' : String(v ?? ''));

// ── tokens → css custom properties ──────────────────────────
const modes = m.tokens?.colors ?? {};
function modeVars(mode) {
  const t = modes[mode] ?? {};
  return Object.entries(t)
    .filter(([, v]) => typeof v === 'string')
    .map(([k, v]) => `--${k.replace(/_/g, '-')}:${literal(v, mode)};`)
    .join('');
}
const statusVars = ['success', 'warning', 'error']
  .filter((k) => modes[k])
  .map((k) => `--${k}:${literal(modes[k], m.primary_mode || 'light')};`)
  .join('');
const radVars = Object.entries(m.tokens?.radii ?? {})
  .map(([k, v]) => `--rad-${k}:${px(v)};`)
  .join('');

const typo = m.tokens?.typography ?? {};
const fontsQuery = (typo.google_fonts ?? [])
  .map((f) => 'family=' + f.replace(/ /g, '+'))
  .join('&');
const fontLink = fontsQuery
  ? `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?${fontsQuery}&display=swap" rel="stylesheet">`
  : '';
const fam = (role, fb) => (typo[role]?.family ? `'${typo[role].family}',${fb}` : fb);
const displayFont = fam('display', 'serif');
const bodyFont = fam('body', 'sans-serif');
const monoFont = fam('mono', 'monospace');

const primaryMode = m.primary_mode === 'dark' ? 'dark' : 'light';
const otherMode = primaryMode === 'light' ? 'dark' : 'light';

// ── sections ────────────────────────────────────────────────

// Colors: group semantic tokens of the primary mode + show ramps
function colorSection() {
  const ramps = Object.entries(prim)
    .map(([name, ramp]) => {
      if (typeof ramp !== 'object') return '';
      const steps = Object.entries(ramp)
        .map(([step, hex]) => `<div class="ramp-step" style="background:${esc(hex)}" title="${esc(name)}.${esc(step)}"><span>${esc(step)}</span></div>`)
        .join('');
      return `<div class="ramp"><div class="ramp-name">${esc(name)}</div><div class="ramp-row">${steps}</div></div>`;
    })
    .join('');
  const sem = Object.entries(modes[primaryMode] ?? {})
    .filter(([, v]) => typeof v === 'string')
    .map(
      ([k, v]) => `<div class="sw"><div class="chip" style="background:${literal(v, primaryMode)}"></div><div class="meta"><b>--${esc(k.replace(/_/g, '-'))}</b><span>${esc(literal(v, primaryMode))}</span></div></div>`
    )
    .join('');
  return `<section id="colors"><div class="sec-title">Colors</div>
    <h3>Semantic tokens · ${primaryMode}</h3><div class="swatches">${sem}</div>
    <h3 style="margin-top:34px">Primitive ramps</h3>${ramps}</section>`;
}

function typeSection() {
  const scale = typo.scale ?? {};
  const rows = Object.entries(scale)
    .map(([name, t]) => {
      const isLabel = name === 'label';
      const ff = name === 'display' || name === 'heading' ? displayFont : bodyFont;
      const style = `font-family:${ff};font-size:${px(t.size)};font-weight:${t.weight ?? 400};line-height:${t.line_height ?? 1.3};letter-spacing:${t.letter_spacing ?? '0'};${isLabel ? 'text-transform:uppercase;' : ''}`;
      return `<div class="spec"><div class="spec-label"><b>--${esc(name.replace(/_/g, '-'))}</b><span>${px(t.size)} · ${t.weight ?? 400} · lh ${t.line_height ?? '—'}</span></div><div class="spec-sample" style="${style}">${isLabel ? 'Section label' : 'The quick brown fox jumps over'}</div></div>`;
    })
    .join('');
  const whys = ['display', 'body', 'mono']
    .filter((r) => typo[r]?.family)
    .map((r) => `<div class="why"><b>${esc(typo[r].family)}</b><span>${esc(r)}${typo[r].why ? ' — ' + esc(typo[r].why) : ''}</span></div>`)
    .join('');
  return `<section id="type"><div class="sec-title">Typography</div><div class="whys">${whys}</div>${rows}
    <div class="mono-note">mono for code: <b>${m.mono_for_code ? 'yes' : 'no'}</b> · mono for metrics: <b>${m.mono_for_metrics ? 'yes' : 'no'}</b> — sample: <code style="font-family:${monoFont}">const vibe = good()</code></div></section>`;
}

function shapeSection() {
  const rads = Object.entries(m.tokens?.radii ?? {})
    .map(([n, v]) => `<div class="scale-item"><div class="rad-box" style="border-radius:${px(v)}"></div><b>${esc(n)}</b><span>${px(v)}</span></div>`)
    .join('');
  const sp = m.tokens?.spacing ?? {};
  const maxSp = Math.max(...Object.values(sp).map((v) => parseInt(v) || 0), 1);
  const spRows = Object.entries(sp)
    .map(([n, v]) => `<div class="sp-row"><span class="sp-name">${esc(n)}</span><div class="sp-bar" style="width:${Math.max(3, ((parseInt(v) || 0) / maxSp) * 100)}%"></div><span class="sp-val">${px(v)}</span></div>`)
    .join('');
  const el = m.tokens?.elevation ?? {};
  const mo = m.tokens?.motion ?? {};
  return `<section id="shape"><div class="sec-title">Shape · Space · Depth · Motion</div>
    <div class="cols">
      <div><h3>Radius</h3><div class="scales">${rads}</div></div>
      <div><h3>Spacing</h3><div class="sp-rows">${spRows}</div></div>
    </div>
    <div class="kv-row">
      <div class="kv"><b>Elevation</b><span>${esc(el.strategy ?? '—')}${el.shadow ? ` · <code>${esc(el.shadow)}</code>` : ''}</span></div>
      <div class="kv"><b>Motion</b><span>${esc(mo.personality ?? '—')} · ${esc(mo.easing ?? '')} · ${esc(mo.duration ?? '')}</span></div>
    </div></section>`;
}

function logoSection() {
  const l = m.brand?.logo;
  if (!l) return '';
  const misuse = (l.misuse ?? []).map((x) => `<div class="dont-tile"><span class="x">✕</span>${esc(x)}</div>`).join('');
  return `<section id="logo"><div class="sec-title">Logo</div>
    <div class="logo-stage"><div class="logo-mark" style="font-family:${displayFont}">${esc(m.name)}</div></div>
    <div class="kv-row">
      <div class="kv"><b>Treatment</b><span>${esc(l.treatment ?? '—')}</span></div>
      <div class="kv"><b>Clearspace</b><span>${esc(l.clearspace ?? '—')}</span></div>
      <div class="kv"><b>Minimum size</b><span>${esc(l.min_size ?? '—')}</span></div>
    </div>
    ${misuse ? `<h3 style="margin-top:26px">Misuse</h3><div class="dont-grid">${misuse}</div>` : ''}
    <p class="note">Placeholder wordmark set in the display face — swap in the real logo asset before shipping.</p></section>`;
}

function voiceSection() {
  const v = m.brand?.voice;
  if (!v) return '';
  const adj = (v.adjectives ?? []).map((a) => `<span class="badge-accent">${esc(a)}</span>`).join('');
  const prin = (v.principles ?? []).map((p) => `<li>${esc(p)}</li>`).join('');
  const ex = (v.examples ?? [])
    .map(
      (e) => `<div class="vs"><div class="vs-col do"><span class="tag-do">Do</span><p>${esc(e.do)}</p></div><div class="vs-col dont"><span class="tag-dont">Don't</span><p>${esc(e.dont)}</p></div></div>`
    )
    .join('');
  return `<section id="voice"><div class="sec-title">Voice &amp; Tone</div>
    <div class="chips" style="margin-bottom:18px">${adj}</div>
    ${prin ? `<ul class="prin">${prin}</ul>` : ''}${ex}</section>`;
}

const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`;

function imagerySection() {
  const img = m.brand?.imagery;
  if (!img) return '';
  const field = `background:linear-gradient(135deg, var(--surface2) 0%, var(--surface1) 55%, var(--accent-subtle) 100%);`;
  const tiles = (img.treatments ?? [])
    .map((t) => {
      let inner = '';
      let style = field;
      if (t.css === 'duotone') {
        const tint = literal(t.tint ?? '{tokens.accent}', primaryMode);
        const base = literal(t.base ?? '{tokens.surface2}', primaryMode);
        style = `background:linear-gradient(135deg, ${base}, ${tint});`;
        inner = `<div class="tile-overlay" style="background:${tint};opacity:.25;mix-blend-mode:multiply"></div>`;
      } else if (t.css === 'grain') {
        inner = `<div class="tile-overlay" style="background-image:${GRAIN};opacity:.35"></div>`;
      } else if (t.css === 'rounded') {
        style += `border-radius:${R(t.radius ?? '{radii.container}')};`;
      }
      return `<div class="img-tile" style="${style}">${inner}<span class="tile-label">${esc(t.name)}</span></div>`;
    })
    .join('');
  const dos = (img.dos ?? []).map((x) => `<div class="do-tile"><span class="v">✓</span>${esc(x)}</div>`).join('');
  const donts = (img.donts ?? []).map((x) => `<div class="dont-tile"><span class="x">✕</span>${esc(x)}</div>`).join('');
  return `<section id="imagery"><div class="sec-title">Imagery</div>
    <p class="lede">${esc(img.direction ?? '')}</p>
    ${tiles ? `<h3>Treatments <span class="note-inline">(demonstrated on placeholder fields — this section is a spec, not generated photography)</span></h3><div class="img-grid">${tiles}</div>` : ''}
    ${img.aspect_ratios ? `<div class="kv" style="margin-top:18px"><b>Aspect ratios</b><span>${esc((img.aspect_ratios ?? []).join(' · '))}</span></div>` : ''}
    <div class="dd-cols">${dos ? `<div><h3>Do</h3><div class="dd-list">${dos}</div></div>` : ''}${donts ? `<div><h3>Don't</h3><div class="dd-list">${donts}</div></div>` : ''}</div></section>`;
}

function iconSection() {
  const ic = m.brand?.iconography;
  if (!ic) return '';
  const kit = ic.fallback_kit ?? {};
  return `<section id="icons"><div class="sec-title">Iconography</div>
    <div class="kv-row">
      <div class="kv"><b>Observed style</b><span>${esc(ic.observed_style ?? '—')}</span></div>
      <div class="kv"><b>Fallback kit</b><span>${esc(kit.name ?? '—')} ${esc(kit.weight ?? '')}</span></div>
    </div>
    ${kit.match_reasoning ? `<p class="note">${esc(kit.match_reasoning)}</p>` : ''}
    <p class="note">The brand's actual icons are proprietary; the kit above is a best-match fallback, not a claim.</p></section>`;
}

// components: fixed demos for known keys, spec table for all
function componentSection() {
  const comps = m.components ?? {};
  const demoFor = (key, c) => {
    const s = (p) => R(c[p] ?? '');
    switch (key) {
      case 'button_primary':
        return `<button class="demo-btn" style="background:${s('background')};color:${s('color')};padding:${s('padding')};border-radius:${s('radius')};font-weight:${c.font_weight ?? 500};border:none">Primary action</button>`;
      case 'button_secondary':
        return `<button class="demo-btn" style="background:${s('background') || 'transparent'};color:${s('color')};border:${s('border') || 'none'};padding:${s('padding')};border-radius:${s('radius')};font-weight:${c.font_weight ?? 500}">Secondary</button>`;
      case 'input':
        return `<input class="demo-input" placeholder="you@example.com" style="background:${s('background')};border:${s('border')};padding:${s('padding')};border-radius:${s('radius')}"/>`;
      case 'card':
        return `<div class="demo-card" style="background:${s('background')};border:${s('border')};padding:${s('padding')};border-radius:${s('radius')}"><b style="font-size:15px;color:var(--text1)">Card title</b><p style="margin-top:6px;font-size:13px;color:var(--text2)">Supporting copy sits on surface1 with quiet borders.</p></div>`;
      case 'badge':
        return `<span class="demo-badge" style="background:${s('background')};color:${s('color')};padding:${s('padding')};border-radius:${s('radius')};font-size:${px(c.font_size ?? 12)}">Badge</span>`;
      default:
        return '';
    }
  };
  const blocks = Object.entries(comps)
    .map(([key, c]) => {
      const specs = Object.entries(c)
        .filter(([k]) => !['source', 'justification'].includes(k))
        .map(([k, v]) => `<tr><td>${esc(k)}</td><td><code>${esc(String(v))}</code></td></tr>`)
        .join('');
      const demo = demoFor(key, c);
      return `<div class="comp"><div class="comp-head"><b>${esc(key.replace(/_/g, ' '))}</b><span class="src src-${esc(c.source ?? 'derived')}">${esc(c.source ?? 'derived')}</span></div>
        ${demo ? `<div class="comp-canvas">${demo}</div>` : ''}
        <table class="spec-table">${specs}</table>
        ${c.justification ? `<p class="note">Derived: ${esc(c.justification)}</p>` : ''}</div>`;
    })
    .join('');
  return `<section id="components"><div class="sec-title">Components</div><div class="comp-grid">${blocks}</div></section>`;
}

// applications: pure HTML/CSS mockups from content seeds
function applicationSection() {
  const a = m.applications ?? {};
  const social = a.social_card
    ? `<div class="app-item"><div class="social-card"><div class="sc-accent"></div><div class="sc-body"><div class="sc-brand" style="font-family:${displayFont}">${esc(m.name)}</div><h4 style="font-family:${displayFont}">${esc(a.social_card.headline)}</h4><p>${esc(a.social_card.sub ?? '')}</p></div></div><span class="app-label">Social card · 1:1</span></div>`
    : '';
  const slide = a.slide_cover
    ? `<div class="app-item wide"><div class="slide-cover"><span class="slide-kicker">${esc(a.slide_cover.kicker ?? '')}</span><h4 style="font-family:${displayFont}">${esc(a.slide_cover.headline)}</h4><div class="slide-foot"><span>${esc(a.slide_cover.presenter ?? '')}</span><span class="slide-dot"></span></div></div><span class="app-label">Slide cover · 16:9</span></div>`
    : '';
  const email = a.email_header
    ? `<div class="app-item wide"><div class="email-head"><div class="eh-bar"><span class="eh-brand" style="font-family:${displayFont}">${esc(m.name)}</span><span class="eh-pre">${esc(a.email_header.preheader ?? '')}</span></div><h4 style="font-family:${displayFont}">${esc(a.email_header.headline)}</h4></div><span class="app-label">Email masthead · 600px</span></div>`
    : '';
  if (!social && !slide && !email) return '';
  return `<section id="applications"><div class="sec-title">Applications</div><div class="app-grid">${social}${slide}${email}</div>
    <p class="note">Rendered with tokens only — no imagery required. Copy comes from the voice examples in the model.</p></section>`;
}

function antiSection() {
  const list = (m.anti_patterns ?? []).map((x) => `<div class="dont-tile"><span class="x">✕</span>${esc(x)}</div>`).join('');
  if (!list) return '';
  return `<section id="anti"><div class="sec-title">Anti-patterns</div><div class="dd-list cols2">${list}</div></section>`;
}

// ── page ────────────────────────────────────────────────────
const paletteStrip = Object.values(prim.brand ?? {})
  .slice(0, 6)
  .map((h) => `<i style="background:${esc(h)}"></i>`)
  .join('');

const html = `<!doctype html>
<html lang="en" data-theme="${primaryMode}"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${esc(m.name)} — Brand System</title>
${fontLink}
<style>
  [data-theme="light"]{${modeVars('light')}}
  [data-theme="dark"]{${modeVars('dark')}}
  :root{${statusVars}${radVars}--display:${displayFont};--body-font:${bodyFont};--mono:${monoFont};}
  *{box-sizing:border-box;margin:0;padding:0}
  html{-webkit-font-smoothing:antialiased}
  body{font-family:var(--body-font);background:var(--background);color:var(--text2);line-height:1.55;transition:background .25s}
  .wrap{max-width:1040px;margin:0 auto;padding:0 40px}
  h1,h2,h4{color:var(--text1)}
  h3{font-size:12px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--text3);margin-bottom:16px}
  section{padding:56px 0;border-top:1px solid var(--border)}
  .sec-title{font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--text3);margin-bottom:26px}
  code{font-family:var(--mono);font-size:.92em}
  .hero{padding:72px 0 60px}
  .hero .strip{display:flex;gap:0;height:6px;width:180px;border-radius:3px;overflow:hidden;margin-bottom:26px}
  .hero .strip i{flex:1}
  .hero h1{font-family:var(--display);font-size:52px;font-weight:500;letter-spacing:-.02em;line-height:1.05;margin-bottom:16px}
  .hero .phil{font-size:17px;max-width:60ch;color:var(--text2)}
  .hero .meta-line{margin-top:22px;font-family:var(--mono);font-size:12px;color:var(--text3)}
  .lede{font-size:15px;max-width:62ch;margin-bottom:22px;color:var(--text2)}
  .note{font-size:12.5px;color:var(--text3);margin-top:14px;max-width:70ch}
  .note-inline{font-size:11px;font-weight:400;letter-spacing:0;text-transform:none;color:var(--text3)}
  .swatches{display:grid;grid-template-columns:repeat(auto-fill,minmax(148px,1fr));gap:14px}
  .sw{display:flex;flex-direction:column;gap:8px}
  .chip{height:56px;border-radius:var(--rad-control,6px);border:1px solid var(--border)}
  .meta{display:flex;flex-direction:column;line-height:1.4}
  .meta b{font-size:12.5px;color:var(--text1);font-weight:500}
  .meta span{font-family:var(--mono);font-size:11px;color:var(--text3)}
  .ramp{margin-bottom:14px}
  .ramp-name{font-family:var(--mono);font-size:11px;color:var(--text3);margin-bottom:6px}
  .ramp-row{display:flex;border-radius:var(--rad-control,6px);overflow:hidden;border:1px solid var(--border)}
  .ramp-step{flex:1;height:40px;position:relative}
  .ramp-step span{position:absolute;bottom:3px;left:50%;transform:translateX(-50%);font-family:var(--mono);font-size:9px;color:rgba(128,128,128,.9);mix-blend-mode:difference;color:#fff}
  .whys{display:flex;flex-direction:column;gap:6px;margin-bottom:24px}
  .why b{color:var(--text1);font-weight:500;font-size:13.5px}
  .why span{font-size:13px;color:var(--text3);margin-left:8px}
  .spec{display:grid;grid-template-columns:190px 1fr;gap:22px;align-items:baseline;padding:14px 0;border-bottom:1px solid var(--border)}
  .spec:last-of-type{border-bottom:0}
  .spec-label{display:flex;flex-direction:column;gap:3px}
  .spec-label b{font-size:12.5px;color:var(--text1);font-weight:600}
  .spec-label span{font-family:var(--mono);font-size:11px;color:var(--text3)}
  .spec-sample{color:var(--text1);overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
  .mono-note{margin-top:18px;font-size:13px;color:var(--text3)}
  .cols{display:grid;grid-template-columns:1fr 1fr;gap:40px}
  .scales{display:flex;gap:22px;flex-wrap:wrap}
  .scale-item{display:flex;flex-direction:column;align-items:center;gap:6px}
  .rad-box{width:72px;height:72px;background:var(--surface1);border:1px solid var(--border-visible)}
  .scale-item b{font-size:12px;color:var(--text1)}
  .scale-item span{font-family:var(--mono);font-size:11px;color:var(--text3)}
  .sp-rows{display:flex;flex-direction:column;gap:10px}
  .sp-row{display:flex;align-items:center;gap:12px}
  .sp-name{font-size:12px;color:var(--text1);width:36px}
  .sp-bar{height:12px;background:var(--accent);border-radius:3px;opacity:.85}
  .sp-val{font-family:var(--mono);font-size:11px;color:var(--text3)}
  .kv-row{display:flex;gap:36px;flex-wrap:wrap;margin-top:22px}
  .kv b{display:block;font-size:12px;color:var(--text1);font-weight:600;margin-bottom:3px}
  .kv span{font-size:13px;color:var(--text2)}
  .logo-stage{display:flex;align-items:center;justify-content:center;background:var(--surface1);border:1px solid var(--border);border-radius:var(--rad-container,12px);padding:56px}
  .logo-mark{font-size:40px;font-weight:500;letter-spacing:-.02em;color:var(--text1)}
  .chips{display:flex;gap:8px;flex-wrap:wrap}
  .badge-accent{background:var(--accent-subtle);color:var(--accent);font-size:12.5px;font-weight:500;padding:4px 12px;border-radius:var(--rad-pill,999px)}
  .prin{list-style:none;margin-bottom:22px;display:flex;flex-direction:column;gap:8px}
  .prin li{padding-left:18px;position:relative;font-size:14px;color:var(--text2)}
  .prin li::before{content:"";position:absolute;left:0;top:.55em;width:8px;height:2px;background:var(--accent)}
  .vs{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px}
  .vs-col{border:1px solid var(--border);border-radius:var(--rad-component,8px);padding:16px}
  .vs-col p{font-size:13.5px;color:var(--text1);margin-top:8px}
  .tag-do,.tag-dont{font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:2px 8px;border-radius:var(--rad-pill,999px)}
  .tag-do{background:color-mix(in srgb, var(--success) 14%, transparent);color:var(--success)}
  .tag-dont{background:color-mix(in srgb, var(--error) 12%, transparent);color:var(--error)}
  .img-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px}
  .img-tile{position:relative;height:140px;border:1px solid var(--border);border-radius:var(--rad-component,8px);overflow:hidden}
  .tile-overlay{position:absolute;inset:0}
  .tile-label{position:absolute;left:10px;bottom:8px;font-family:var(--mono);font-size:11px;background:var(--background);color:var(--text2);padding:2px 8px;border-radius:4px;border:1px solid var(--border)}
  .dd-cols{display:grid;grid-template-columns:1fr 1fr;gap:36px;margin-top:26px}
  .dd-list{display:flex;flex-direction:column;gap:8px}
  .dd-list.cols2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .do-tile,.dont-tile{display:flex;gap:10px;align-items:baseline;font-size:13.5px;color:var(--text1);border:1px solid var(--border);border-radius:var(--rad-control,6px);padding:10px 14px}
  .do-tile .v{color:var(--success);font-weight:700}
  .dont-tile .x{color:var(--error);font-weight:700}
  .comp-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}
  .comp{border:1px solid var(--border);border-radius:var(--rad-component,8px);padding:20px}
  .comp-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}
  .comp-head b{font-size:13.5px;color:var(--text1);text-transform:capitalize}
  .src{font-family:var(--mono);font-size:10px;padding:2px 8px;border-radius:var(--rad-pill,999px)}
  .src-observed{background:color-mix(in srgb, var(--success) 14%, transparent);color:var(--success)}
  .src-derived{background:color-mix(in srgb, var(--warning) 16%, transparent);color:var(--warning)}
  .comp-canvas{background:var(--surface1);border:1px solid var(--border);border-radius:var(--rad-control,6px);padding:22px;display:flex;align-items:center;justify-content:center;margin-bottom:14px}
  .demo-btn{font-family:var(--body-font);font-size:14px;cursor:pointer}
  .demo-input{font-family:var(--body-font);font-size:14px;width:100%;max-width:260px;color:var(--text1)}
  .demo-card{width:100%;max-width:280px}
  .spec-table{width:100%;border-collapse:collapse}
  .spec-table td{font-size:12px;padding:5px 0;border-top:1px solid var(--border);color:var(--text2)}
  .spec-table td:first-child{color:var(--text3);width:40%}
  .app-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:22px}
  .app-item{display:flex;flex-direction:column;gap:8px}
  .app-item.wide{grid-column:span 2}
  .app-label{font-family:var(--mono);font-size:11px;color:var(--text3)}
  .social-card{aspect-ratio:1;max-width:340px;background:var(--surface1);border:1px solid var(--border);border-radius:var(--rad-container,12px);overflow:hidden;display:flex;flex-direction:column}
  .sc-accent{height:34%;background:linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 55%, var(--background)))}
  .sc-body{padding:22px;display:flex;flex-direction:column;gap:8px;flex:1}
  .sc-brand{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--text3)}
  .sc-body h4{font-size:24px;font-weight:500;line-height:1.15}
  .sc-body p{font-size:13px;color:var(--text2)}
  .slide-cover{aspect-ratio:16/9;background:var(--surface1);border:1px solid var(--border);border-radius:var(--rad-container,12px);padding:36px 40px;display:flex;flex-direction:column;justify-content:space-between}
  .slide-kicker{font-family:var(--mono);font-size:11px;letter-spacing:.1em;color:var(--accent)}
  .slide-cover h4{font-size:34px;font-weight:500;line-height:1.1;max-width:18ch}
  .slide-foot{display:flex;justify-content:space-between;align-items:center;font-size:12.5px;color:var(--text3)}
  .slide-dot{width:10px;height:10px;border-radius:50%;background:var(--accent)}
  .email-head{max-width:600px;background:var(--background);border:1px solid var(--border-visible);border-radius:var(--rad-component,8px);overflow:hidden}
  .eh-bar{display:flex;justify-content:space-between;align-items:center;padding:14px 22px;border-bottom:1px solid var(--border);background:var(--surface1)}
  .eh-brand{font-size:15px;font-weight:500;color:var(--text1)}
  .eh-pre{font-size:11px;color:var(--text3)}
  .email-head h4{font-size:22px;font-weight:500;padding:24px 22px}
  .mode-bar{position:fixed;right:22px;bottom:22px;display:flex;gap:6px;background:var(--surface1);border:1px solid var(--border-visible);border-radius:var(--rad-pill,999px);padding:4px}
  .mode-bar button{font-family:var(--body-font);font-size:12px;border:none;background:transparent;color:var(--text2);padding:5px 14px;border-radius:var(--rad-pill,999px);cursor:pointer}
  .mode-bar button.on{background:var(--accent);color:var(--on-accent,#fff)}
  footer{padding:36px 0 60px;font-size:12px;color:var(--text3);line-height:1.7}
  @media(max-width:760px){.wrap{padding:0 20px}.hero h1{font-size:36px}.cols,.vs,.dd-cols,.comp-grid,.app-grid{grid-template-columns:1fr}.app-item.wide{grid-column:span 1}.spec{grid-template-columns:1fr;gap:6px}}
</style></head>
<body>
  <div class="wrap">
    <header class="hero">
      <div class="strip">${paletteStrip}</div>
      <h1 style="font-family:var(--display)">${esc(m.name)}</h1>
      <p class="phil">${esc(m.philosophy ?? '')}</p>
      <div class="meta-line">brand system · analyzed from ${esc(m.analyzed_from ?? 'n/a')} · ${esc(m.analyzed_on ?? '')} · ${esc(m.brand_type ?? '')}</div>
    </header>
    ${colorSection()}
    ${typeSection()}
    ${shapeSection()}
    ${logoSection()}
    ${voiceSection()}
    ${imagerySection()}
    ${iconSection()}
    ${componentSection()}
    ${applicationSection()}
    ${antiSection()}
    <footer>Generated from design-model.yaml — independent analysis of publicly observable design patterns, for study and internal use. Names and trademarks belong to their respective owners. Icons and photography referenced via fallback kits and placeholders; nothing proprietary is redistributed.</footer>
  </div>
  <div class="mode-bar">
    <button data-mode="light">Light</button>
    <button data-mode="dark">Dark</button>
  </div>
  <script>
    const btns=document.querySelectorAll('.mode-bar button');
    const set=(mo)=>{document.documentElement.dataset.theme=mo;btns.forEach(b=>b.classList.toggle('on',b.dataset.mode===mo));};
    btns.forEach(b=>b.addEventListener('click',()=>set(b.dataset.mode)));
    set('${primaryMode}');
  </script>
</body></html>`;

await writeFile(outPath, html);
console.log(`✓ brandbook → ${outPath} (${(html.length / 1024).toFixed(1)}KB)`);
