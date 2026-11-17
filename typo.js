/* =========================================================
   Типографика: неразрывные пробелы, чтобы короткие слова,
   числа с единицами и тире не отрывались от соседей.
   Работает по текстовым узлам страницы для ru / en / de.
   ========================================================= */
const NB = ' ';

const SHORT = {
  ru: 'а|в|во|и|к|ко|о|об|от|с|со|у|на|по|за|из|до|не|ни|но|же|ли|бы|для|при|без|под|над|про|или|их|его|её|мы|вы|он|она|это|что|как',
  en: 'a|an|the|of|in|on|at|to|by|for|and|or|as|is|it|we|our|no|from|with',
  de: 'a|an|in|im|am|um|zu|zum|zur|und|der|die|das|den|dem|des|ein|eine|mit|von|vom|bei|aus|auf|für|ist|es|wir',
};

function rules(lang) {
  const short = new RegExp(`(^|[\\s(«„"—–-])(${SHORT[lang] || SHORT.ru}) (?=\\S)`, 'giu');
  return [
    [short, `$1$2${NB}`],
    // число + единица/слово: «459 м», «2005 года», «30 дней», «68N»
    [/(\d) (?=(м|км|кг|г|т|%|мм|см|года|год|лет|дней|шт|m|kg|km|years|Jahre|Jahr)\b)/gu, `$1${NB}`],
    // телефонные группы не рвём
    [/(\+7) (?=\()/g, `$1${NB}`],
    [/(\)) (?=\d)/g, `$1${NB}`],
    // тире не начинает строку
    [/ (—|–) /g, `${NB}$1 `],
    // «№ 68N», «пос. Волочаевское», «г. Светлый», «ул. Центральная»
    [/(№|пос\.|г\.|ул\.|пом\.|д\.|Str\.) /gu, `$1${NB}`],
  ];
}

export function typograf(root = document.body, lang = 'ru') {
  const list = rules(lang);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.parentElement && n.parentElement.closest('script, style, textarea, input, code')) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const n of nodes) {
    let t = n.nodeValue;
    if (!t || !t.trim()) continue;
    // дважды — чтобы цепочки «и в» тоже склеились
    for (let k = 0; k < 2; k++) for (const [re, to] of list) t = t.replace(re, to);
    if (t !== n.nodeValue) n.nodeValue = t;
  }
}
