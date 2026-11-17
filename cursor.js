/* =========================================================
   Курсор: рыболовный крючок на леске.
   Крючок догоняет мышь на пружине и раскачивается от скорости,
   леска свисает от верхнего края экрана и чуть провисает.
   Над ссылками крючок «клюёт»: золотится и подёргивается.
   ========================================================= */
export function setupHookCursor() {
  if (matchMedia('(hover: none), (pointer: coarse), (prefers-reduced-motion: reduce)').matches) return;
  const root = document.querySelector('.cursor');
  if (!root) return;

  const NS = 'http://www.w3.org/2000/svg';
  root.innerHTML = `
    <svg class="cursor__svg" aria-hidden="true">
      <path class="cursor__line" />
      <g class="cursor__hook">
        <circle cx="0" cy="0" r="3.2" class="cursor__eye"/>
        <path d="M0 3.2 L0 24 Q0 37 9.5 36.5 Q16.5 35.8 15.5 25" class="cursor__bend"/>
        <path d="M15.5 25 L11.4 29.6" class="cursor__barb"/>
        <circle cx="0" cy="12" r="0" class="cursor__hit"/>
      </g>
    </svg>
    <span class="cursor__label"></span>`;
  const svg = root.querySelector('svg');
  const line = root.querySelector('.cursor__line');
  const hook = root.querySelector('.cursor__hook');
  const label = root.querySelector('.cursor__label');

  // точка, которой «цепляем» — низ изгиба крючка
  const TIP = { x: 8, y: 36.5 };
  const m = { x: innerWidth / 2, y: innerHeight / 2 };
  const p = { x: m.x, y: m.y, vx: 0, vy: 0 };     // кончик крючка, пружина
  let ax = m.x;                                     // точка крепления лески сверху
  let ang = 0, angV = 0;                            // качание крючка
  let hover = 0, hoverT = 0, bite = 0, visible = false;

  addEventListener('pointermove', (e) => {
    m.x = e.clientX; m.y = e.clientY;
    if (!visible) { visible = true; p.x = m.x; p.y = m.y; ax = m.x; root.classList.add('is-on'); }
  });
  document.addEventListener('pointerleave', () => { visible = false; root.classList.remove('is-on'); });

  const targets = 'a, button, [data-cursor], input, select, textarea, .row';
  document.addEventListener('pointerover', (e) => {
    const t = e.target.closest(targets);
    hoverT = t ? 1 : 0;
    const txt = t && t.dataset && t.dataset.cursor;
    label.textContent = txt || '';
    root.classList.toggle('has-label', !!txt);
    root.classList.toggle('is-hover', !!t);
    if (t) bite = 1;
  });
  addEventListener('pointerdown', () => { bite = 1.6; });

  let last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05); last = now;

    // пружина: крючок догоняет мышь с лёгкой инерцией
    const k = 170, d = 20;
    p.vx += ((m.x - p.x) * k - p.vx * d) * dt;
    p.vy += ((m.y - p.y) * k - p.vy * d) * dt;
    p.x += p.vx * dt; p.y += p.vy * dt;

    // крепление лески сверху догоняет медленнее — леска наклоняется
    ax += (p.x - ax) * Math.min(1, dt * 2.2);

    // маятник: крючок отклоняется против движения и качается
    const target = Math.max(-38, Math.min(38, -p.vx * 0.045 + (ax - p.x) * 0.05));
    angV += ((target - ang) * 60 - angV * 7) * dt;
    ang += angV * dt;

    hover += (hoverT - hover) * Math.min(1, dt * 10);
    bite = Math.max(0, bite - dt * 2.5);
    const jerk = Math.sin(now * 0.045) * bite * 5;   // «поклёвка»

    const s = 1 + hover * 0.25;
    const rad = (ang + jerk) * Math.PI / 180;
    // глазок крючка: от кончика вверх по повёрнутой оси
    const ex = p.x - (TIP.x * Math.cos(rad) - TIP.y * Math.sin(rad)) * s;
    const ey = p.y - (TIP.x * Math.sin(rad) + TIP.y * Math.cos(rad)) * s - jerk * 0.6;
    hook.setAttribute('transform', `translate(${ex.toFixed(1)} ${ey.toFixed(1)}) rotate(${(ang + jerk).toFixed(2)}) scale(${s.toFixed(3)})`);

    // леска: от верха экрана к глазку, лёгкое провисание от скорости
    const sag = Math.min(60, Math.abs(p.vx) * 0.04 + 6);
    const cx = (ax + ex) / 2 + (ax - ex) * 0.15;
    const cy = ey * 0.55 + sag;
    line.setAttribute('d', `M${ax.toFixed(1)} -4 Q${cx.toFixed(1)} ${cy.toFixed(1)} ${ex.toFixed(1)} ${(ey - 3.2).toFixed(1)}`);

    label.style.transform = `translate(${(p.x + 26).toFixed(1)}px, ${(p.y - 8).toFixed(1)}px)`;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  addEventListener('resize', () => svg.setAttribute('viewBox', `0 0 ${innerWidth} ${innerHeight}`));
  svg.setAttribute('viewBox', `0 0 ${innerWidth} ${innerHeight}`);
}
