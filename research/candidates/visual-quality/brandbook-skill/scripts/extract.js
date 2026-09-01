// brandbook extraction probe — DO NOT improvise your own extraction code.
// Run this file's contents verbatim in the page context (Chrome DevTools MCP
// evaluate_script, claude-in-chrome javascript_tool, or paste into the browser
// console). Last expression returns a JSON string with everything the analysis
// phase needs. Run it once on the homepage and once on 1-2 subpages.
(() => {
  const cs = (el) => getComputedStyle(el);
  const seen = (el) => el.offsetParent !== null || cs(el).position === 'fixed';

  // 1. body & root
  const body = cs(document.body);
  const rootProps = [];
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        if (rule.selectorText === ':root' || rule.selectorText === 'html' || rule.selectorText === 'body') {
          for (const p of rule.style) if (p.startsWith('--')) rootProps.push(p + ': ' + rule.style.getPropertyValue(p).trim());
        }
      }
    } catch (e) {} // cross-origin sheets
  }

  // 2. headings
  const heads = ['h1', 'h2', 'h3'].map((h) => {
    const el = document.querySelector(h);
    if (!el) return null;
    const s = cs(el);
    return { tag: h, text: (el.innerText || '').trim().slice(0, 40), family: s.fontFamily.split(',').slice(0, 2).join(','), size: s.fontSize, weight: s.fontWeight, letterSpacing: s.letterSpacing, lineHeight: s.lineHeight, color: s.color, transform: s.textTransform };
  }).filter(Boolean);

  // 3. buttons & CTA-ish links (incl. outline-only)
  const btns = [...document.querySelectorAll('button, a, [class*="btn"], [class*="button"]')]
    .filter((el) => { const s = cs(el); return seen(el) && el.innerText.trim().length > 0 && el.innerText.length < 40 && (s.backgroundColor !== 'rgba(0, 0, 0, 0)' || parseFloat(s.borderWidth) > 0); })
    .slice(0, 14)
    .map((el) => { const s = cs(el); return { text: el.innerText.trim().slice(0, 24), bg: s.backgroundColor, color: s.color, radius: s.borderRadius, border: s.borderColor + ' ' + s.borderWidth, weight: s.fontWeight, size: s.fontSize, padding: s.padding, family: s.fontFamily.split(',')[0] }; });

  // 4. every distinct text color + section/card backgrounds (frequency-ranked)
  const textColors = {}, bgs = {}, radii = {};
  document.querySelectorAll('p,span,a,li,h1,h2,h3,h4,td,div').forEach((el) => {
    if (!seen(el)) return;
    const t = el.childNodes[0];
    if (t && t.nodeType === 3 && t.textContent.trim()) { const c = cs(el).color; textColors[c] = (textColors[c] || 0) + 1; }
  });
  document.querySelectorAll('section,div,article,a,span').forEach((el) => {
    if (!seen(el) || el.offsetWidth < 120) return;
    const s = cs(el);
    if (s.backgroundColor !== 'rgba(0, 0, 0, 0)') bgs[s.backgroundColor] = (bgs[s.backgroundColor] || 0) + 1;
    const r = parseFloat(s.borderRadius);
    if (r > 0) radii[s.borderRadius] = (radii[s.borderRadius] || 0) + 1;
  });
  const rank = (o, n) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n);

  // 5. uppercase eyebrow/kicker labels (mono? letterspaced?)
  const eyebrows = [...document.querySelectorAll('span,div,p,h5,h6')]
    .filter((el) => seen(el) && el.children.length === 0 && /^[A-Z0-9\s·•+&®']{5,30}$/.test((el.innerText || '').trim()))
    .slice(0, 4)
    .map((el) => { const s = cs(el); return { text: el.innerText.trim().slice(0, 24), family: s.fontFamily.split(',')[0], size: s.fontSize, letterSpacing: s.letterSpacing, color: s.color }; });

  // 6. fit-check census — spectacle signals
  const textLen = (document.body.innerText || '').length;
  const census = {
    canvases: document.querySelectorAll('canvas').length,
    videos: document.querySelectorAll('video').length,
    images: document.querySelectorAll('img').length,
    svgs: document.querySelectorAll('svg').length,
    textChars: textLen,
    viewportCanvas: [...document.querySelectorAll('canvas')].some((c) => c.offsetWidth > innerWidth * 0.7),
    verdictHint: textLen < 1500 && document.querySelectorAll('canvas,video').length > 0 ? 'likely spectacle-led — run the fit-check verdict before extracting' : 'structured content present'
  };

  return JSON.stringify({
    url: location.href,
    body: { bg: body.backgroundColor, color: body.color, family: body.fontFamily, size: body.fontSize },
    rootProps: rootProps.slice(0, 60),
    heads, btns,
    textColors: rank(textColors, 10),
    backgrounds: rank(bgs, 12),
    borderRadii: rank(radii, 8),
    eyebrows, census
  }, null, 1);
})()
