/* =========================================================
   Плавный переход между страницами: шторка опускается,
   страница меняется, на новой странице шторка уходит вверх.
   ========================================================= */
const KEY = 'bs-arrive';

export function setupTransitions() {
  const curtain = document.querySelector('.curtain');
  if (!curtain || !window.gsap) return;
  const mark = curtain.querySelector('.curtain__mark');

  // пришли по внутренней ссылке — снимаем шторку
  let arriving = false;
  try { arriving = sessionStorage.getItem(KEY) === '1'; sessionStorage.removeItem(KEY); } catch (e) {}
  if (arriving) {
    document.documentElement.classList.add('is-arriving');
    gsap.set(curtain, { clipPath: 'inset(0% 0% 0% 0%)' });
    gsap.set(mark, { opacity: 1 });
    document.documentElement.classList.remove('is-arriving');
    gsap.timeline({ delay: 0.15 })
      .to(mark, { opacity: 0, y: -20, duration: 0.5, ease: 'power2.in' })
      .to(curtain, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.1, ease: 'expo.inOut' }, '-=0.2');
  }

  // уход со страницы: шторка поднимается снизу и закрывает экран
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0 || a.target === '_blank') return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || !/\.html$|\/$/.test(url.pathname)) return;
    if (url.pathname === location.pathname && url.search === location.search) return; // якорь на той же странице
    e.preventDefault();
    try { sessionStorage.setItem(KEY, '1'); } catch (er) {}
    gsap.timeline({ onComplete: () => { location.href = url.href; } })
      .fromTo(curtain, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.8, ease: 'expo.inOut' })
      .fromTo(mark, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, '-=0.3');
  });

  // назад из кэша браузера — шторку убрать
  addEventListener('pageshow', (e) => { if (e.persisted) gsap.set(curtain, { clipPath: 'inset(0% 0% 100% 0%)' }); });
}
