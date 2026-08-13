#!/usr/bin/env node
// brandbook validation gate — run before declaring any generation done:
//   node scripts/validate.mjs <folder>     (folder containing design-model.yaml + *.html)
// Exit 1 on any ERROR. WARNs are prompts to justify, not failures.
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

let parseYaml;
try { ({ parse: parseYaml } = await import('yaml')); }
catch { console.error('Missing dependency: npm i yaml'); process.exit(1); }

const folder = process.argv[2];
if (!folder) { console.error('usage: node validate.mjs <skill-output-folder>'); process.exit(1); }

let errors = 0, warns = 0;
const err = (m) => { errors++; console.log('  ERROR ' + m); };
const warn = (m) => { warns++; console.log('  WARN  ' + m); };
const ok = (m) => console.log('  ok    ' + m);

// ── 1. design-model.yaml ────────────────────────────────────
let m;
try { m = parseYaml(await readFile(join(folder, 'design-model.yaml'), 'utf8')); ok('YAML parses'); }
catch (e) { err('design-model.yaml: ' + String(e.message).split('\n')[0]); process.exit(1); }

for (const f of ['name', 'philosophy', 'primary_mode', 'brand_type', 'ownership']) if (m[f] == null) err(`missing field: ${f}`);
if (!['ui-rich', 'content-rich', 'spectacle-led'].includes(m.brand_type)) warn(`brand_type "${m.brand_type}" not a known value`);
if (!['own', 'third-party'].includes(m.ownership)) err(`ownership must be own|third-party, got "${m.ownership}"`);
if (!m.primitives?.colors?.neutral) err('missing primitives.colors.neutral ramp');
if (!m.brand?.voice?.examples?.length) err('brand.voice.examples empty — voice needs do/don\'t pairs');
if (!m.brand?.logo) warn('no brand.logo block');
if (!m.brand?.imagery) warn('no brand.imagery block');
if ((m.anti_patterns ?? []).length < 6) warn(`only ${(m.anti_patterns ?? []).length} anti-patterns — aim for 6-10`);
const scaleKeys = ['display', 'heading', 'subheading', 'body', 'body_sm', 'caption', 'label'];
const scale = m.tokens?.typography?.scale ?? {};
for (const k of scaleKeys) if (!scale[k]) err(`type scale missing canonical token: ${k}`);
for (const [k, c] of Object.entries(m.components ?? {})) {
  if (!['observed', 'derived'].includes(c?.source)) err(`component ${k}: source must be observed|derived`);
  if (c?.source === 'derived' && !c.justification) err(`component ${k}: derived without justification`);
}

// token reference resolution
const prim = m.primitives?.colors ?? {};
const modes = m.tokens?.colors ?? {};
function resolvable(ref) {
  const [head, ...rest] = ref.slice(1, -1).split('.');
  if (head === 'tokens') return Object.values(modes).some((mode) => typeof mode === 'object' && mode?.[rest[0]] != null) || modes[rest[0]] != null;
  if (head === 'radii') return m.tokens?.radii?.[rest[0]] != null;
  if (prim[head]) return rest.reduce((o, k) => (o == null ? o : o[k]), prim[head]) != null;
  return false;
}
const rx = /\{[a-zA-Z0-9_.\-]+\}/g;
let badRefs = 0;
(function walk(node, path) {
  if (typeof node === 'string') { for (const r of node.match(rx) ?? []) if (!resolvable(r)) { err(`unresolvable ref ${r} at ${path}`); badRefs++; } }
  else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) walk(v, path + '.' + k);
})({ tokens: m.tokens, components: m.components, brand: m.brand }, 'model');
if (!badRefs) ok('all token references resolve');

// contrast (text1 vs background per mode)
const lum = (hex) => {
  const h = hex.replace('#', ''); if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  const [r, g, b] = [0, 2, 4].map((i) => { let c = parseInt(h.slice(i, i + 2), 16) / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const toHex = (v) => { const s = String(v ?? ''); const r = s.match(rx); if (!r) return s; const [head, ...rest] = r[0].slice(1, -1).split('.'); const val = prim[head] && rest.reduce((o, k) => (o == null ? o : o[k]), prim[head]); return val ?? s; };
for (const mode of ['light', 'dark']) {
  const t = modes[mode]; if (!t) continue;
  const l1 = lum(toHex(t.text1)), l2 = lum(toHex(t.background));
  if (l1 == null || l2 == null) continue;
  const cr = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  if (cr < 3) err(`${mode} text1/background contrast ${cr.toFixed(1)}:1 — below 3:1`);
  else if (cr < 4.5) warn(`${mode} text1/background contrast ${cr.toFixed(1)}:1 — below 4.5:1 body-text target`);
  else ok(`${mode} contrast ${cr.toFixed(1)}:1`);
}

// AI-default display fonts (WARN — observed reality may justify)
const banned = ['Space Grotesk', 'Playfair Display', 'Fraunces', 'Instrument Serif', 'DM Serif'];
const disp = m.tokens?.typography?.display?.family ?? '';
if (banned.some((b) => disp.includes(b)) || disp === 'Inter') warn(`display font "${disp}" is an AI-default — justify from observation or change`);

// ── 2. HTML artifacts ───────────────────────────────────────
const files = (await readdir(folder)).filter((f) => f.endsWith('.html'));
for (const f of files) {
  console.log(`\n${f}:`);
  const html = await readFile(join(folder, f), 'utf8');
  const css = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((x) => x[1]).join('\n');

  // orphan class selectors (classes added by inline JS count as used)
  const sels = [...new Set([...css.matchAll(/\.([a-z][a-zA-Z0-9-]*)/g)].map(($) => $[1]))];
  const used = new Set([...html.matchAll(/class="([^"]+)"/g)].flatMap(($) => $[1].split(/\s+/)));
  [...html.matchAll(/classList\.(?:add|toggle)\(\s*'([^']+)'/g)].forEach(($) => used.add($[1]));
  const orphans = sels.filter((c) => !used.has(c));
  orphans.length ? err(`orphan CSS selectors: ${orphans.join(', ')}`) : ok('no orphan selectors');

  // undefined custom properties
  const usedVars = [...new Set([...html.matchAll(/var\((--[a-zA-Z0-9-]+)/g)].map(($) => $[1]))];
  const defined = new Set([...css.matchAll(/(--[a-zA-Z0-9-]+)\s*:/g)].map(($) => $[1]));
  const undef = usedVars.filter((v) => !defined.has(v));
  undef.length ? err(`undefined vars: ${undef.join(', ')}`) : ok('all custom properties defined');

  // leftovers
  if (/lorem/i.test(html)) err('lorem ipsum found');
  if (/TODO|FIXME|\{\{/.test(html)) err('leftover TODO/FIXME/{{placeholder}}');
  for (const st of html.matchAll(/style="([^"]*)"/g)) if (rx.test(st[1])) { err(`unresolved {ref} in style attribute: ${st[1].slice(0, 60)}`); break; }
  const visible = html.replace(/<!--[\s\S]*?-->/g, ''); // notices in comments don't count — must be user-visible
  if (f.includes('landing') && m.ownership === 'third-party' && !/study reproduction/i.test(visible)) err('third-party brand: landing page missing visible "study reproduction" notice');
  if (f.includes('landing') && (css.match(/linear-gradient|radial-gradient/g) ?? []).length > 2) warn('3+ gradients in landing CSS — check against the gradient red line');
}

console.log(`\n${errors} error(s), ${warns} warn(s)`);
process.exit(errors ? 1 : 0);
