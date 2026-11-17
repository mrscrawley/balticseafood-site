/* =========================================================
   «Плывущие» фото: при наведении картинка колышется, как под водой.
   SVG-фильтр (шум + смещение) подключается только на время наведения,
   поэтому в покое ничего не нагружает.
   ========================================================= */
const NS = 'http://www.w3.org/2000/svg';

function makeFilter(id) {
  let defs = document.querySelector('svg.fx');
  if (!defs) {
    defs = document.createElementNS(NS, 'svg');
    defs.setAttribute('class', 'fx');
    defs.setAttribute('aria-hidden', 'true');
    defs.setAttribute('width', '0'); defs.setAttribute('height', '0');
    defs.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    document.body.appendChild(defs);
  }
  defs.insertAdjacentHTML('beforeend', `
    <filter id="${id}" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.009 0.024" numOctaves="2" seed="7" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="0" xChannelSelector="R" yChannelSelector="G"/>
    </filter>`);
  const f = defs.querySelector('#' + id);
  return { turb: f.querySelector('feTurbulence'), disp: f.querySelector('feDisplacementMap') };
}

export function setupLiquid({ hover = [], preview = null } = {}) {
  if (matchMedia('(hover: none), (pointer: coarse), (prefers-reduced-motion: reduce)').matches) return;
  const t0 = performance.now();

  // 1) наведение на фото/видео
  const h = makeFilter('liquid');
  const state = { s: 0, el: null };
  let raf = 0;
  const loop = () => {
    const t = (performance.now() - t0) / 1000;
    h.turb.setAttribute('baseFrequency', `${(0.009 + Math.sin(t * 0.7) * 0.0025).toFixed(5)} ${(0.024 + Math.cos(t * 0.5) * 0.006).toFixed(5)}`);
    h.disp.setAttribute('scale', state.s.toFixed(2));
    raf = state.el || state.s > 0.2 ? requestAnimationFrame(loop) : 0;
  };
  document.querySelectorAll(hover.join(',')).forEach((el) => {
    const media = () => el.querySelector('img, video') || el;
    el.addEventListener('pointerenter', () => {
      if (state.el && state.el !== el) { const pm = state.el.querySelector('img, video') || state.el; pm.style.filter = ''; }
      state.el = el;
      media().style.filter = 'url(#liquid)';
      gsap.to(state, { s: 26, duration: 1.1, ease: 'power2.out', overwrite: true });
      if (!raf) raf = requestAnimationFrame(loop);
    });
    el.addEventListener('pointerleave', () => {
      const m = media();
      gsap.to(state, { s: 0, duration: 0.9, ease: 'power2.inOut', overwrite: true,
        onComplete: () => { if (state.el === el) { m.style.filter = ''; state.el = null; } } });
    });
  });

  // 2) превью в каталоге: рябь зависит от скорости мыши
  if (preview) {
    const p = makeFilter('liquid-preview');
    preview.style.filter = 'url(#liquid-preview)';
    let lx = 0, ly = 0, v = 0, s = 0;
    addEventListener('pointermove', (e) => {
      v = Math.min(60, v + Math.hypot(e.clientX - lx, e.clientY - ly) * 0.35);
      lx = e.clientX; ly = e.clientY;
    });
    const tick = () => {
      const t = (performance.now() - t0) / 1000;
      v *= 0.9;
      s += (Math.min(34, 5 + v) - s) * 0.12;
      p.turb.setAttribute('baseFrequency', `${(0.01 + Math.sin(t * 0.9) * 0.003).toFixed(5)} ${(0.03 + Math.cos(t * 0.6) * 0.008).toFixed(5)}`);
      p.disp.setAttribute('scale', s.toFixed(2));
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}
