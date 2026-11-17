/* =========================================================
   Переводы. Русский текст живёт прямо в HTML,
   английский и немецкий подставляются по ключам data-i18n.
   Язык: ?lang=ru|en|de → сохранённый выбор → русский.
   ========================================================= */

export const LANG = (() => {
  const q = new URLSearchParams(location.search).get('lang');
  const ok = (v) => v === 'ru' || v === 'en' || v === 'de';
  if (ok(q)) { try { localStorage.setItem('bs-lang', q); } catch (e) {} return q; }
  try { const s = localStorage.getItem('bs-lang'); if (ok(s)) return s; } catch (e) {}
  return 'ru';
})();

const EN = {
  'meta.title': 'Baltic Seafood — Baltic Sea fish since 2005',
  'nav.home': 'Baltic<br>Seafood',
  'nav.about': 'Company', 'nav.process': 'Production', 'nav.products': 'Products', 'nav.export': 'Export', 'nav.buyers': 'For buyers',
  'nav.cta': 'Contact us', 'nav.sound': 'Sound',
  'depth.label': 'Depth', 'depth.unit': 'm',

  'hero.eyebrow1': 'Kaliningrad region', 'hero.eyebrow2': 'Since 2005',
  'hero.l1': 'Cold', 'hero.l2': '<em>sea.</em>', 'hero.l3': 'Honest fish.',
  'hero.lead': 'We catch, fillet and can Baltic Sea fish. Our fillets are supplied to Germany, Denmark, France and other EU countries.',
  'hero.hint': 'Scroll to dive in',

  'about.label': 'Company',
  'about.text': 'For twenty years we have worked with one sea. Our raw fish comes from the Baltic and its bays, which is why most of our products are chilled or frozen only once.',
  'stats.1': 'year the company was founded', 'stats.2': 'EU approval number for exports', 'stats.3': 'unified European safety control system', 'stats.4': 'types of packaging in the cannery: glass and tin',

  'film.kicker': 'The Baltic Sea · every day since 2005', 'film.l1': 'Freshness', 'film.l2': '<em>begins at sea</em>',

  'process.label': 'Production', 'process.l1': 'From net', 'process.l2': 'to <em>tin</em>',
  'process.lead': 'The whole journey in one place: Svetly urban district, Volochaevskoye.',
  'step1.h': 'Catch', 'step1.p': 'Commercial fishing in the Baltic Sea and its bays: cod, flounder, Baltic herring, sprat.',
  'step2.h': 'Filleting', 'step2.p': 'Cod, pike-perch and perch fillets on modern equipment. Fillets from frozen raw fish on request.',
  'step3.h': 'Cold', 'step3.p': 'Our own cold stores for raw fish and finished products. Freshness kept from the pier to the customer.',
  'step4.h': 'Canning', 'step4.p': 'Our own cannery: sprats in oil, fried sprat in tomato sauce and cod liver, in glass and tin.',

  'products.label': 'Canned fish',
  'p1.l1': 'Sprats', 'p1.l2': '<em>in oil</em>', 'p1.text': 'A Baltic classic. Sprat from our sea, canned in our own cannery.',
  'p2.l1': 'Sprat', 'p2.l2': '<em>in tomato</em>', 'p2.text': 'Fried sprat in tomato sauce. A simple recipe that relies on the quality of the fish.',
  'p3.l1': 'Cod', 'p3.l2': '<em>liver</em>', 'p3.text': 'Natural cod liver. A delicacy of the northern seas with nothing extra added.',
  'products.more': 'Learn more',
  'pi.1': 'Sprats in oil', 'pi.2': 'Fried sprat in tomato sauce', 'pi.3': 'Natural cod liver',

  'catalog.label': 'Fish and fillets', 'catalog.l1': 'From the Baltic', 'catalog.l2': '<em>sea and its bays</em>',
  'row.1': 'Cod fillet', 'row.2': 'Pike-perch fillet', 'row.3': 'Perch fillet', 'row.4': 'Cod', 'row.5': 'Flounder', 'row.6': 'Baltic herring', 'row.7': 'Sprat',
  'row.chilled': 'chilled / frozen', 'row.frozen': 'fresh frozen',

  'coast.l1': 'Our sea', 'coast.l2': '<em>next to the plant</em>',
  'coast.caption': 'Our raw fish comes from the Baltic Sea and its bays, which is why most of our products are chilled or frozen only once.',

  'export.label': 'Export', 'export.l1': 'The Baltic', 'export.l2': 'on the tables', 'export.l3': '<em>of Europe</em>',
  'export.lead': 'EU approval number 68N and the HACCP system open the European market to us. Our fillets go to Germany, Denmark, France and other EU countries, as well as across Russia.',
  'map.home': 'Kaliningrad', 'map.de': 'Germany', 'map.dk': 'Denmark', 'map.fr': 'France', 'map.ru': 'Russia',

  'buyers.label': 'For buyers', 'buyers.l1': 'Partners', 'buyers.l2': '<em>and buyers</em>',
  'buyers.lead': 'Specifications, certificates and supply terms will be published here. The section is in progress — for now, request documents by phone or through the form.',
  'b1.h': 'Specifications', 'b1.p': 'Formats, packing, net weight and packaging for every item.',
  'b2.h': 'Certificates', 'b2.p': 'EU number 68N, HACCP and declarations of conformity.',
  'b3.h': 'Storage and shelf life', 'b3.p': 'Storage conditions and shelf life for chilled and frozen products and canned fish.',
  'b4.h': 'Price list', 'b4.p': 'Current terms for wholesale buyers — on request.',
  'badge.soon': 'PDF · soon', 'badge.request': 'On request', 'badge.soon2': 'Soon',
  'form.title': 'Request an offer',
  'form.company': 'Company', 'form.country': 'Country', 'form.product': 'Products of interest',
  'form.opt0': 'Choose an item', 'form.optMany': 'Several items',
  'form.volume': 'Volume per month', 'form.contact': 'Phone or email', 'form.comment': 'Comment',
  'form.submit': 'Send request',
  'form.note': 'Demo mode: requests are not sent yet. Call us: +7 (4012) 311-576',
  'form.done': 'Thank you! The form is in demo mode and the request has not been sent. Please call +7 (4012) 311-576.',

  'contact.label': 'Contacts', 'contact.l1': 'Let’s talk', 'contact.l2': '<em>supplies</em>',
  'contact.phone': 'Phone', 'contact.plant': 'Production',
  'contact.plantAddr': 'Kaliningrad region,<br>Svetly urban district, Volochaevskoye',
  'contact.legal': 'Legal address',
  'contact.legalAddr': '238340, Kaliningrad region, Svetly, Volochaevskoye, Tsentralnaya st. 34, premises II of “D”',
  'cursor.call': 'Call',
  'footer.copy': '© 2005–2026 Baltic Seafood LLC', 'footer.top': 'Back to top ↑',

  // страница продукта
  'pp.back': '← All products', 'pp.specs': 'Specifications', 'pp.tbd': 'to be confirmed',
  'pp.packing': 'Packing', 'pp.weight': 'Net weight', 'pp.storage': 'Storage', 'pp.shelf': 'Shelf life', 'pp.origin': 'Origin',
  'pp.originVal': 'Baltic Sea and its bays',
  'pp.note': 'This page is a draft: exact specifications will be added after approval with the production team.',
  'pp.cta': 'Request an offer', 'pp.next': 'Next', 'pp.photoSoon': 'Photo coming soon',
  'pp.canned': 'Canned fish', 'pp.fillet': 'Fillet', 'pp.whole': 'Whole fish',

  // 404
  'nf.title': 'Page not found — Baltic Seafood',
  'nf.kicker': 'Error 404 · depth unknown',
  'nf.l1': 'This page', 'nf.l2': '<em>has gone deep</em>',
  'nf.text': 'We cast the line, but nothing bit. The link may be outdated or the page has drifted off with the current.',
  'nf.home': 'Back to the surface', 'nf.catalog': 'Products',
  'skip': 'Skip to content',
};

const DE = {
  'meta.title': 'Baltic Seafood — Fisch aus der Ostsee seit 2005',
  'nav.home': 'Baltic<br>Seafood',
  'nav.about': 'Unternehmen', 'nav.process': 'Produktion', 'nav.products': 'Produkte', 'nav.export': 'Export', 'nav.buyers': 'Für Einkäufer',
  'nav.cta': 'Kontakt', 'nav.sound': 'Ton',
  'depth.label': 'Tiefe', 'depth.unit': 'm',

  'hero.eyebrow1': 'Region Kaliningrad', 'hero.eyebrow2': 'Seit 2005',
  'hero.l1': 'Kaltes', 'hero.l2': '<em>Meer.</em>', 'hero.l3': 'Ehrlicher Fisch.',
  'hero.lead': 'Wir fangen, filetieren und konservieren Fisch aus der Ostsee. Unsere Filets liefern wir nach Deutschland, Dänemark, Frankreich und in weitere EU-Länder.',
  'hero.hint': 'Scrollen, um abzutauchen',

  'about.label': 'Unternehmen',
  'about.text': 'Seit zwanzig Jahren arbeiten wir mit einem Meer. Unser Rohfisch stammt aus der Ostsee und ihren Buchten – deshalb sind unsere Produkte überwiegend frisch gekühlt oder nur einmal gefroren.',
  'stats.1': 'Gründungsjahr des Unternehmens', 'stats.2': 'EU-Zulassungsnummer für Lieferungen in die EU', 'stats.3': 'einheitliches europäisches Kontrollsystem', 'stats.4': 'Verpackungsarten in der Konservenfabrik: Glas und Dose',

  'film.kicker': 'Die Ostsee · jeden Tag seit 2005', 'film.l1': 'Frische', 'film.l2': '<em>beginnt auf See</em>',

  'process.label': 'Produktion', 'process.l1': 'Vom Netz', 'process.l2': 'in die <em>Dose</em>',
  'process.lead': 'Der gesamte Weg aus einer Hand: Stadtkreis Swetly, Siedlung Wolotschajewskoje.',
  'step1.h': 'Fang', 'step1.p': 'Industrielle Fischerei in der Ostsee und ihren Buchten: Dorsch, Flunder, Ostseehering, Sprotte.',
  'step2.h': 'Filetieren', 'step2.p': 'Filets von Dorsch, Zander und Barsch auf modernen Anlagen. Auf Wunsch auch Filets aus gefrorener Rohware.',
  'step3.h': 'Kühlung', 'step3.p': 'Eigene Kühlhäuser für Rohware und Fertigprodukte. Die Frische bleibt vom Pier bis zum Kunden erhalten.',
  'step4.h': 'Konserven', 'step4.p': 'Eigene Konservenfabrik: Sprotten in Öl, gebratene Sprotten in Tomatensauce und Dorschleber – in Glas und Dose.',

  'products.label': 'Fischkonserven',
  'p1.l1': 'Sprotten', 'p1.l2': '<em>in Öl</em>', 'p1.text': 'Ein Klassiker der Ostsee. Sprotten aus unserem Meer, konserviert in der eigenen Fabrik.',
  'p2.l1': 'Sprotten', 'p2.l2': '<em>in Tomate</em>', 'p2.text': 'Gebratene Sprotten in Tomatensauce. Ein einfaches Rezept, das von der Qualität des Fisches lebt.',
  'p3.l1': 'Dorschleber', 'p3.l2': '<em>natur</em>', 'p3.text': 'Natürliche Dorschleber. Eine Delikatesse der nördlichen Meere ohne überflüssige Zusätze.',
  'products.more': 'Mehr erfahren',
  'pi.1': 'Sprotten in Öl', 'pi.2': 'Gebratene Sprotten in Tomatensauce', 'pi.3': 'Dorschleber natur',

  'catalog.label': 'Fisch und Filets', 'catalog.l1': 'Aus der Ostsee', 'catalog.l2': '<em>und ihren Buchten</em>',
  'row.1': 'Dorschfilet', 'row.2': 'Zanderfilet', 'row.3': 'Barschfilet', 'row.4': 'Dorsch', 'row.5': 'Flunder', 'row.6': 'Ostseehering', 'row.7': 'Sprotte',
  'row.chilled': 'gekühlt / gefroren', 'row.frozen': 'frisch gefroren',

  'coast.l1': 'Unser Meer', 'coast.l2': '<em>gleich neben dem Werk</em>',
  'coast.caption': 'Unser Rohfisch stammt aus der Ostsee und ihren Buchten – deshalb sind unsere Produkte überwiegend frisch gekühlt oder nur einmal gefroren.',

  'export.label': 'Export', 'export.l1': 'Die Ostsee', 'export.l2': 'auf den Tischen', 'export.l3': '<em>Europas</em>',
  'export.lead': 'Die EU-Zulassungsnummer 68N und das HACCP-System öffnen uns den europäischen Markt. Unsere Filets gehen nach Deutschland, Dänemark, Frankreich und in weitere EU-Länder sowie in ganz Russland.',
  'map.home': 'Kaliningrad', 'map.de': 'Deutschland', 'map.dk': 'Dänemark', 'map.fr': 'Frankreich', 'map.ru': 'Russland',

  'buyers.label': 'Für Einkäufer', 'buyers.l1': 'Für Partner', 'buyers.l2': '<em>und Einkäufer</em>',
  'buyers.lead': 'Hier erscheinen bald Spezifikationen, Zertifikate und Lieferbedingungen. Der Bereich ist in Arbeit – fordern Sie Unterlagen bis dahin telefonisch oder über das Formular an.',
  'b1.h': 'Spezifikationen', 'b1.p': 'Formate, Abpackung, Nettogewicht und Verpackung für jede Position.',
  'b2.h': 'Zertifikate', 'b2.p': 'EU-Nummer 68N, HACCP und Konformitätserklärungen.',
  'b3.h': 'Lagerung und Haltbarkeit', 'b3.p': 'Lagerbedingungen und Haltbarkeit für gekühlte und gefrorene Produkte sowie Konserven.',
  'b4.h': 'Preisliste', 'b4.p': 'Aktuelle Konditionen für Großhändler – auf Anfrage.',
  'badge.soon': 'PDF · bald', 'badge.request': 'Auf Anfrage', 'badge.soon2': 'Bald',
  'form.title': 'Angebot anfordern',
  'form.company': 'Unternehmen', 'form.country': 'Land', 'form.product': 'Gewünschte Produkte',
  'form.opt0': 'Position wählen', 'form.optMany': 'Mehrere Positionen',
  'form.volume': 'Menge pro Monat', 'form.contact': 'Telefon oder E-Mail', 'form.comment': 'Kommentar',
  'form.submit': 'Anfrage senden',
  'form.note': 'Demomodus: Anfragen werden noch nicht versendet. Rufen Sie uns an: +7 (4012) 311-576',
  'form.done': 'Vielen Dank! Das Formular ist im Demomodus, die Anfrage wurde nicht gesendet. Bitte rufen Sie uns an: +7 (4012) 311-576.',

  'contact.label': 'Kontakt', 'contact.l1': 'Sprechen wir', 'contact.l2': '<em>über Lieferungen</em>',
  'contact.phone': 'Telefon', 'contact.plant': 'Produktion',
  'contact.plantAddr': 'Region Kaliningrad,<br>Stadtkreis Swetly, Wolotschajewskoje',
  'contact.legal': 'Firmensitz',
  'contact.legalAddr': '238340, Region Kaliningrad, Swetly, Wolotschajewskoje, Zentralnaja-Straße 34, Räume II von „D“',
  'cursor.call': 'Anrufen',
  'footer.copy': '© 2005–2026 Baltic Seafood LLC', 'footer.top': 'Nach oben ↑',

  'pp.back': '← Alle Produkte', 'pp.specs': 'Eigenschaften', 'pp.tbd': 'wird ergänzt',
  'pp.packing': 'Abpackung', 'pp.weight': 'Nettogewicht', 'pp.storage': 'Lagerung', 'pp.shelf': 'Haltbarkeit', 'pp.origin': 'Herkunft',
  'pp.originVal': 'Ostsee und ihre Buchten',
  'pp.note': 'Diese Seite ist ein Entwurf: Genaue Angaben folgen nach Abstimmung mit der Produktion.',
  'pp.cta': 'Angebot anfordern', 'pp.next': 'Weiter', 'pp.photoSoon': 'Foto folgt',
  'pp.canned': 'Fischkonserven', 'pp.fillet': 'Filet', 'pp.whole': 'Ganzer Fisch',

  'nf.title': 'Seite nicht gefunden — Baltic Seafood',
  'nf.kicker': 'Fehler 404 · Tiefe unbekannt',
  'nf.l1': 'Diese Seite', 'nf.l2': '<em>ist abgetaucht</em>',
  'nf.text': 'Wir haben die Angel ausgeworfen, aber nichts hat angebissen. Vielleicht ist der Link veraltet oder die Seite ist mit der Strömung davongetrieben.',
  'nf.home': 'Zurück an die Oberfläche', 'nf.catalog': 'Produkte',
  'skip': 'Zum Inhalt springen',
};

const DICT = LANG === 'de' ? DE : LANG === 'en' ? EN : null;

export function applyI18n(root = document) {
  document.documentElement.lang = LANG;
  root.querySelectorAll('[data-lang]').forEach((a) => a.classList.toggle('is-active', a.dataset.lang === LANG));
  if (!DICT) return;
  const titleKey = document.body.dataset.titleKey || 'meta.title';
  if (DICT[titleKey]) document.title = DICT[titleKey];
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    const v = DICT[el.dataset.i18n];
    if (v != null) el.innerHTML = v;
  });
  root.querySelectorAll('[data-i18n-ph]').forEach((el) => {
    const v = DICT[el.dataset.i18nPh];
    if (v != null) el.setAttribute('placeholder', v);
  });
  root.querySelectorAll('[data-i18n-cursor]').forEach((el) => {
    const v = DICT[el.dataset.i18nCursor];
    if (v != null) el.dataset.cursor = v;
  });
}

/* Строки, которые рисует JS (этикетка банки, карта, страницы продуктов) */
export const T = (ru, en, de) => (LANG === 'de' ? (de ?? en) : LANG === 'en' ? en : ru);
export const tr = (key, ru) => (DICT && DICT[key] != null ? DICT[key] : ru);
export const LI = LANG === 'de' ? 2 : LANG === 'en' ? 1 : 0;   // индекс языка в массивах [ru, en, de]

/* Каталог для страниц продуктов (заглушки) */
export const PRODUCT_LIST = [
  { slug: 'sprats', img: 'media/cans.jpg', type: ['Консервы', 'Canned fish', 'Fischkonserven'],
    name: ['Шпроты в масле', 'Sprats in oil', 'Sprotten in Öl'],
    text: ['Классика Балтики. Килька нашего моря, консервированная в собственном цехе.', 'A Baltic classic. Sprat from our sea, canned in our own cannery.', 'Ein Klassiker der Ostsee. Sprotten aus unserem Meer, konserviert in der eigenen Fabrik.'] },
  { slug: 'kilka-tomato', img: null, type: ['Консервы', 'Canned fish', 'Fischkonserven'],
    name: ['Килька в томатном соусе', 'Fried sprat in tomato sauce', 'Gebratene Sprotten in Tomatensauce'],
    text: ['Обжаренная килька в томатном соусе. Простой рецепт, который держится на качестве сырья.', 'Fried sprat in tomato sauce. A simple recipe that relies on the quality of the fish.', 'Gebratene Sprotten in Tomatensauce. Ein einfaches Rezept, das von der Qualität des Fisches lebt.'] },
  { slug: 'cod-liver', img: null, type: ['Консервы', 'Canned fish', 'Fischkonserven'],
    name: ['Печень трески натуральная', 'Natural cod liver', 'Dorschleber natur'],
    text: ['Натуральная печень трески. Деликатес северных морей без лишних добавок.', 'Natural cod liver. A delicacy of the northern seas with nothing extra added.', 'Natürliche Dorschleber. Eine Delikatesse der nördlichen Meere ohne überflüssige Zusätze.'] },
  { slug: 'cod-fillet', img: 'media/p-cod-fillet.jpg', type: ['Филе', 'Fillet', 'Filet'],
    name: ['Филе трески', 'Cod fillet', 'Dorschfilet'],
    text: ['Охлаждённое и замороженное филе трески из сырья Балтийского моря.', 'Chilled and frozen cod fillet from Baltic Sea raw fish.', 'Gekühltes und gefrorenes Dorschfilet aus Ostsee-Rohware.'] },
  { slug: 'zander-fillet', img: 'media/p-zander.jpg', type: ['Филе', 'Fillet', 'Filet'],
    name: ['Филе судака', 'Pike-perch fillet', 'Zanderfilet'],
    text: ['Охлаждённое и замороженное филе судака.', 'Chilled and frozen pike-perch fillet.', 'Gekühltes und gefrorenes Zanderfilet.'] },
  { slug: 'perch-fillet', img: 'media/p-perch.jpg', type: ['Филе', 'Fillet', 'Filet'],
    name: ['Филе окуня', 'Perch fillet', 'Barschfilet'],
    text: ['Охлаждённое и замороженное филе окуня.', 'Chilled and frozen perch fillet.', 'Gekühltes und gefrorenes Barschfilet.'] },
  { slug: 'cod', img: 'media/p-cod.jpg', type: ['Рыба', 'Whole fish', 'Ganzer Fisch'],
    name: ['Треска', 'Cod', 'Dorsch'],
    text: ['Свежемороженая балтийская треска.', 'Fresh frozen Baltic cod.', 'Frisch gefrorener Ostseedorsch.'] },
  { slug: 'flounder', img: 'media/p-flounder.jpg', type: ['Рыба', 'Whole fish', 'Ganzer Fisch'],
    name: ['Камбала', 'Flounder', 'Flunder'],
    text: ['Свежемороженая балтийская камбала.', 'Fresh frozen Baltic flounder.', 'Frisch gefrorene Ostseeflunder.'] },
  { slug: 'herring', img: 'media/p-herring.jpg', type: ['Рыба', 'Whole fish', 'Ganzer Fisch'],
    name: ['Салака', 'Baltic herring', 'Ostseehering'],
    text: ['Свежемороженая салака из Балтийского моря.', 'Fresh frozen Baltic herring.', 'Frisch gefrorener Ostseehering.'] },
  { slug: 'sprat', img: 'media/p-sprat.jpg', type: ['Рыба', 'Whole fish', 'Ganzer Fisch'],
    name: ['Килька', 'Sprat', 'Sprotte'],
    text: ['Свежемороженая балтийская килька.', 'Fresh frozen Baltic sprat.', 'Frisch gefrorene Ostseesprotte.'] },
];
