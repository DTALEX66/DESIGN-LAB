// SPDX-License-Identifier: MIT
// Enhanced motion layer. Owner directive 2026-10-25: the Stitch pack describes static screens
// (「STITCH 更多是静态页面」), so after the 1:1 static reproduction the interaction layer gets
// real motion of its own. It stays OFF unless `?motion=enhanced` is in the URL, because the
// static reproduction is what the pack and every geometry gate were measured against; the
// primitives below only write `transform`, so an element's own ink and backdrop move together
// and no WCAG ratio changes -- interpolating colour is what put an undeclared grey on screen
// in section 5.55, and this file must never do that again.

export type MotionMode = 'static' | 'enhanced';

const BAND_MS = 150;
const MAGNET_PX = 3;
const TILT_DEG = 4;
const COUNT_MS = 700;

export function motionMode(): MotionMode {
  if (typeof window === 'undefined' || typeof document === 'undefined') return 'static';
  let requested = false;
  try {
    requested = new URLSearchParams(window.location.search).get('motion') === 'enhanced';
  } catch {
    requested = false;
  }
  if (!requested) return 'static';
  // The OS signal wins over the URL: `enhanced` may ask for motion, it may not override a
  // request for none. style.css does the same job for CSS transitions and @keyframes.
  try {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return 'static';
    }
  } catch {
    return 'static';
  }
  return 'enhanced';
}

function reducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return true;
  }
}

function move(el: HTMLElement, x: number, y: number, extra: string): void {
  el.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0)${extra}`;
}

/** Pointer-following offset on a control. Coalesced to one write per frame. */
export function magnetic(el: HTMLElement): () => void {
  let wanted: [number, number] | null = null;
  let queued = false;
  let idle = true;
  const paint = () => {
    queued = false;
    if (!wanted) return;
    move(el, wanted[0], wanted[1], '');
  };
  const onEnter = () => {
    idle = false;
    el.style.willChange = 'transform';
  };
  const onMove = (event: Event) => {
    const pointer = event as PointerEvent;
    if (typeof pointer.clientX !== 'number') return;
    const box = el.getBoundingClientRect();
    if (!box.width || !box.height) return;
    wanted = [(pointer.clientX - box.left - box.width / 2) / box.width * MAGNET_PX,
      (pointer.clientY - box.top - box.height / 2) / box.height * MAGNET_PX];
    if (!queued) {
      queued = true;
      requestAnimationFrame(paint);
    }
  };
  const onLeave = () => {
    wanted = null;
    move(el, 0, 0, '');
    idle = true;
    el.style.willChange = '';
  };
  el.addEventListener('pointerenter', onEnter);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerleave', onLeave);
  el.addEventListener('blur', () => {
    if (!idle) onLeave();
  });
  return () => {
    el.removeEventListener('pointerenter', onEnter);
    el.removeEventListener('pointermove', onMove);
    el.removeEventListener('pointerleave', onLeave);
  };
}

/** Two-axis tilt on a card. Same rule as magnetic: the card and its text tilt together. */
export function tilt(el: HTMLElement): () => void {
  let queued = false;
  let wanted: [number, number] | null = null;
  const paint = () => {
    queued = false;
    if (!wanted) return;
    el.style.transform = `perspective(900px) rotateX(${wanted[0].toFixed(2)}deg) `
      + `rotateY(${wanted[1].toFixed(2)}deg)`;
  };
  const onMove = (event: Event) => {
    const pointer = event as PointerEvent;
    if (typeof pointer.clientX !== 'number') return;
    const box = el.getBoundingClientRect();
    if (!box.width || !box.height) return;
    wanted = [-(pointer.clientY - box.top - box.height / 2) / box.height * TILT_DEG,
      (pointer.clientX - box.left - box.width / 2) / box.width * TILT_DEG];
    if (!queued) {
      queued = true;
      requestAnimationFrame(paint);
    }
  };
  const onEnter = () => {
    el.style.willChange = 'transform';
  };
  const onLeave = () => {
    wanted = null;
    el.style.transform = '';
    el.style.willChange = '';
  };
  el.addEventListener('pointerenter', onEnter);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerleave', onLeave);
  return () => {
    el.removeEventListener('pointerenter', onEnter);
    el.removeEventListener('pointermove', onMove);
    el.removeEventListener('pointerleave', onLeave);
  };
}

/** Entrance slide. transform only -- fading a text-bearing node with opacity walks the glyph
 *  through every alpha between 0 and its resting value, which is the same class of bug as
 *  interpolating its colour. */
export function slideReveal(el: HTMLElement): void {
  el.style.transform = 'translate3d(0,10px,0)';
  requestAnimationFrame(() => {
    el.style.transition = `transform ${BAND_MS}ms cubic-bezier(.2,0,0,1)`;
    el.style.transform = '';
    // Hand the element back once it has landed: `.row-card` is a tilt host too, and a
    // permanent inline `transition` would make every later pointer write interpolate.
    setTimeout(() => {
      el.style.transition = '';
    }, BAND_MS + 40);
  });
}

/** Digits roll up to the value the element already carries. It never rewrites a number the
 *  page did not publish, and it lands on the published value byte-for-byte. */
export function countUp(el: HTMLElement): void {
  const written = (el.textContent || '').trim();
  const match = /^([^\d-]*)(-?\d+(?:[.,]\d+)?)(.*)$/.exec(written);
  if (!match) return;
  const [, prefix, digits, suffix] = match;
  const target = Number(digits.replace(',', '.'));
  if (!Number.isFinite(target)) return;
  const decimals = digits.includes('.') || digits.includes(',') ? digits.split(/[.,]/)[1].length : 0;
  const separator = digits.includes(',') ? ',' : '.';
  const startedAt = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - startedAt) / COUNT_MS);
    const eased = 1 - Math.pow(1 - t, 3);
    const shown = (target * eased).toFixed(decimals).replace('.', separator);
    el.textContent = prefix + shown + suffix;
    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      el.textContent = written;
    }
  };
  requestAnimationFrame(step);
}

export interface MotionWiring {
  mode: MotionMode;
  magnetic: number;
  tilt: number;
  revealed: number;
  counted: number;
}

const MAGNETIC_SELECTOR = '.ghost-btn,.soft-btn,.primary-btn,.danger-btn,.seg button,'
  + '.stage-nav-btn,.nav button';
const TILT_SELECTOR = '.row-card,.review-card,.capability-card,.panel';
const REVEAL_SELECTOR = '#tp-verdicts>*,.list-item,.row-card,.grid-stack>*';
const COUNT_SELECTOR = '[data-motion="count"]';

/** One delegated handler per behaviour. The shell re-renders route views, so per-element
 *  listeners wired at boot would silently detach on the next navigation; delegation survives
 *  every re-render and costs two listeners for the whole application. */
function delegate(root: Document, selector: string,
  onTarget: (el: HTMLElement, event: PointerEvent, box: DOMRect) => void,
  onLeave?: (el: HTMLElement) => void): void {
  let current: HTMLElement | null = null;
  let queued = false;
  let pending: [HTMLElement, PointerEvent, DOMRect] | null = null;
  const paint = () => {
    queued = false;
    if (!pending) return;
    onTarget(pending[0], pending[1], pending[2]);
  };
  root.addEventListener('pointermove', (event: PointerEvent) => {
    const target = (event.target as Element | null)
      && (event.target as Element).closest ? (event.target as Element).closest(selector) : null;
    const host = target as HTMLElement | null;
    if (!host) {
      if (current && onLeave) onLeave(current);
      current = null;
      pending = null;
      return;
    }
    if (current !== host) {
      if (current && onLeave) onLeave(current);
      current = host;
      host.style.willChange = 'transform';
    }
    const box = host.getBoundingClientRect();
    if (!box.width || !box.height) return;
    pending = [host, event, box];
    if (!queued) {
      queued = true;
      requestAnimationFrame(paint);
    }
  }, {passive: true});
  root.addEventListener('pointerleave', () => {
    if (current && onLeave) onLeave(current);
    current = null;
    pending = null;
  }, {passive: true});
}

export function mountEnhancedMotion(root: Document | HTMLElement): MotionWiring {
  const scope = (root as Document).body ? (root as Document) : (root as HTMLElement);
  const count = (selector: string): number => {
    try {
      return (scope as ParentNode).querySelectorAll(selector).length;
    } catch {
      return 0;
    }
  };
  const mode = motionMode();
  if (mode !== 'enhanced' || reducedMotion()) {
    return {mode: 'static', magnetic: 0, tilt: 0, revealed: 0, counted: 0};
  }
  const doc = scope as Document;
  // style.css keys the opt-in ambient loop off this attribute, so the static screens keep the
  // pack's 「无持续循环」 rule and only this mode gets the float.
  try {
    doc.documentElement.dataset.motion = 'enhanced';
  } catch {
    /* vm harness */
  }
  delegate(doc, MAGNETIC_SELECTOR, (el, event, box) => {
    move(el, (event.clientX - box.left - box.width / 2) / box.width * MAGNET_PX,
      (event.clientY - box.top - box.height / 2) / box.height * MAGNET_PX, '');
  }, (el) => {
    move(el, 0, 0, '');
    el.style.willChange = '';
  });
  delegate(doc, TILT_SELECTOR, (el, event, box) => {
    el.style.transform = `perspective(900px) rotateX(${
      (-(event.clientY - box.top - box.height / 2) / box.height * TILT_DEG).toFixed(2)}deg) `
      + `rotateY(${
        ((event.clientX - box.left - box.width / 2) / box.width * TILT_DEG).toFixed(2)}deg)`;
  }, (el) => {
    el.style.transform = '';
    el.style.willChange = '';
  });
  const revealed = count(REVEAL_SELECTOR);
  Array.from((scope as ParentNode).querySelectorAll<HTMLElement>(REVEAL_SELECTOR))
    .forEach(slideReveal);
  const counted = Array.from((scope as ParentNode).querySelectorAll<HTMLElement>(COUNT_SELECTOR));
  counted.forEach(countUp);
  return {
    mode,
    magnetic: count(MAGNETIC_SELECTOR),
    tilt: count(TILT_SELECTOR),
    revealed,
    counted: counted.length,
  };
}
