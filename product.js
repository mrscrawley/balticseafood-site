import { applyI18n, LI, tr, PRODUCT_LIST } from './i18n.js?v=1794926695';
import { setupLiquid } from './liquid.js?v=1794926695';
import { setupHookCursor } from './cursor.js?v=1794926695';
import { setupTransitions } from './transition.js?v=1794926695';

/* =========================================================
   Страница продукта (заглушка): данные из PRODUCT_LIST
   ========================================================= */
const L = LI;
const slug = new URLSearchParams(location.search).get('p') || 'sprats';
const idx = Math.max(0, PRODUCT_LIST.findIndex((p) => p.slug === slug));
const p = PRODUCT_LIST[idx];
const next = PRODUCT_LIST[(idx + 1) % PRODUCT_LIST.length];

applyI18n();

// переключатель языка сохраняет текущий продукт
document.querySelectorAll('.lang a').forEach((a) => { a.href = `product.html?p=${p.slug}&lang=${a.dataset.lang}`; });

document.title = `${p.name[L]} — ${L ? 'Baltic Seafood' : 'Балтийские Морепродукты'}`;
document.querySelector('.pp-type').textContent = p.type[L];
const words = p.name[L].split(' ');
const first = words.shift();
document.querySelector('.pp-title').innerHTML =
  `<span class="mask"><span>${first}</span></span>` + (words.length ? `<span class="mask"><span><em>${words.join(' ')}</em></span></span>` : '');
document.querySelector('.pp-lead').textContent = p.text[L];

const media = document.querySelector('.pp-media');
media.innerHTML = p.img
  ? `<img src="${p.img}" alt="${p.name[L]}">`
  : `<div class="pp-media__soon"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="19"/><path d="M6 23c5-4 9-4 14 0s9 4 14 0M6 17c5-4 9-4 14 0s9 4 14 0"/></svg><span>${tr('pp.photoSoon', 'Фото скоро')}</span></div>`;

const nx = document.querySelector('.pp-next');
nx.href = `product.html?p=${next.slug}`;
nx.querySelector('.pp-next__name').textContent = next.name[L];

/* ---------- скролл и моушен ---------- */
gsap.registerPlugin(ScrollTrigger);
const lenis = new Lenis({ duration: 1.3, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);

const nav = document.querySelector('.nav');
lenis.on('scroll', ({ scroll }) => nav.classList.toggle('is-scrolled', scroll > 40));

setupTransitions();

const tl = gsap.timeline({ delay: 0.35 });
tl.fromTo('.pp-title .mask > span', { y: 0, yPercent: 115, rotate: 3 }, { y: 0, yPercent: 0, rotate: 0, duration: 1.6, ease: 'expo.out', stagger: 0.1 })
  .from('.pp-back, .pp-type, .pp-lead, .pp-cta', { opacity: 0, y: 24, duration: 1.1, ease: 'power3.out', stagger: 0.07 }, 0.2)
  .fromTo('.pp-media', { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ease: 'expo.inOut' }, 0)
  .from('.pp-media > *', { scale: 1.25, duration: 2, ease: 'expo.out' }, 0.2);

gsap.to('.pp-media > *', { yPercent: 10, ease: 'none', scrollTrigger: { trigger: '.pp-hero', start: 'top top', end: 'bottom top', scrub: true } });
gsap.from('.pp-table > div', { opacity: 0, y: 30, duration: 1, ease: 'expo.out', stagger: 0.07, clearProps: 'transform,opacity',
  scrollTrigger: { trigger: '.pp-table', start: 'top 85%' } });
gsap.from('.pp-next__name', { yPercent: 40, opacity: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.pp-next', start: 'top 90%' } });

/* ---------- курсор: крючок на леске ---------- */
setupHookCursor();
setupLiquid({ hover: ['.pp-media'] });
