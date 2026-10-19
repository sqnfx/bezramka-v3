// Pudel szuka psa: kręcone futro, wyszukiwarka ogłoszeń o zaginionych i znalezionych psach, przemiana w ciuchcię.
'use strict';

(() => {
  const W = 1200, H = 680;
  const NS = 'http://www.w3.org/2000/svg';
  const $ = (s) => document.querySelector(s);
  const scena = $('#scena');
  const wBezramce = typeof window.bezramka === 'object' && window.bezramka !== null;
  document.documentElement.classList.toggle('w-bezramce', wBezramce);
  const mniejRuchu = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function el(tag, atr, rodzic) {
    const e = document.createElementNS(NS, tag);
    for (const k in atr) e.setAttribute(k, atr[k]);
    if (rodzic) rodzic.appendChild(e);
    return e;
  }
  function losowacz(ziarno) {
    let s = ziarno >>> 0;
    return () => {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }
  const los = (a, b) => a + Math.random() * (b - a);

  /* ============================ skalowanie ============================ */
  const para = { canvas: $('#para'), ctx: $('#para').getContext('2d'), czastki: [] };
  const uklad = { skala: 1, dx: 0, dy: 0 };
  function dopasuj() {
    const zapas = wBezramce ? 0 : 52;
    const s = Math.min(window.innerWidth / W, (window.innerHeight - zapas) / H);
    const skala = s > 0 ? s : 1;
    const dx = (window.innerWidth - W * skala) / 2;
    const dy = Math.max(0, (window.innerHeight - zapas - H * skala) / 2);
    scena.style.transform = `translate(${dx}px, ${dy}px) scale(${skala})`;
    Object.assign(uklad, { skala, dx, dy });
    const r = (window.devicePixelRatio || 1) * skala;
    para.canvas.width = Math.max(1, Math.round(W * r));
    para.canvas.height = Math.max(1, Math.round(H * r));
    para.ctx.setTransform(r, 0, 0, r, 0, 0);
  }

  /* ============================ kręcone futro ============================ */
  const FUTRO = { kolor: '#EEBF8E', cien: '#D49B66', jasne: '#FADFBC' };
  const FUTRO_UCHA = { kolor: '#E3AB77', cien: '#C68B58', jasne: '#F1C898' };
  const FUTRO_DALEJ = { kolor: '#DCA571', cien: '#BF8653', jasne: '#EBC08F' };

  function obwodElipsy(cx, cy, rx, ry, odstep) {
    const obwod = Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));
    const n = Math.max(6, Math.round(obwod / odstep));
    const pkt = [];
    for (let i = 0; i < n; i++) {
      const t = (i / n) * Math.PI * 2;
      pkt.push({ x: cx + rx * Math.cos(t), y: cy + ry * Math.sin(t) });
    }
    return pkt;
  }
  function obwodProstokata(x, y, w, h, r, odstep) {
    const odcinki = [];
    const luk = (cx, cy, od) => ({ luk: true, cx, cy, od });
    odcinki.push({ x1: x + r, y1: y, x2: x + w - r, y2: y }, luk(x + w - r, y + r, -Math.PI / 2),
      { x1: x + w, y1: y + r, x2: x + w, y2: y + h - r }, luk(x + w - r, y + h - r, 0),
      { x1: x + w - r, y1: y + h, x2: x + r, y2: y + h }, luk(x + r, y + h - r, Math.PI / 2),
      { x1: x, y1: y + h - r, x2: x, y2: y + r }, luk(x + r, y + r, Math.PI));
    const pkt = [];
    for (const o of odcinki) {
      if (o.luk) {
        const n = Math.max(1, Math.round((Math.PI / 2) * r / odstep));
        for (let i = 0; i < n; i++) {
          const t = o.od + (i / n) * (Math.PI / 2);
          pkt.push({ x: o.cx + r * Math.cos(t), y: o.cy + r * Math.sin(t) });
        }
      } else {
        const dl = Math.hypot(o.x2 - o.x1, o.y2 - o.y1);
        const n = Math.max(1, Math.round(dl / odstep));
        for (let i = 0; i < n; i++) {
          pkt.push({ x: o.x1 + (o.x2 - o.x1) * (i / n), y: o.y1 + (o.y2 - o.y1) * (i / n) });
        }
      }
    }
    return pkt;
  }

  // Futro = kształt bazowy + kółka na obwodzie + loczki (łuki) dla faktury.
  function futro(g, ksztalt, { promien, odstep, barwy = FUTRO, loki = 0, poza = null, ziarno = 1 }) {
    const l = losowacz(ziarno);
    const punkty = ksztalt.typ === 'elipsa'
      ? obwodElipsy(ksztalt.cx, ksztalt.cy, ksztalt.rx, ksztalt.ry, odstep)
      : obwodProstokata(ksztalt.x, ksztalt.y, ksztalt.w, ksztalt.h, ksztalt.r, odstep);
    if (ksztalt.typ === 'elipsa') {
      el('ellipse', { cx: ksztalt.cx, cy: ksztalt.cy, rx: ksztalt.rx, ry: ksztalt.ry, fill: barwy.kolor }, g);
    } else {
      el('rect', { x: ksztalt.x, y: ksztalt.y, width: ksztalt.w, height: ksztalt.h, rx: ksztalt.r, fill: barwy.kolor }, g);
    }
    const kolka = punkty.map((p) => ({ ...p, r: promien * (0.8 + 0.4 * l()) }));
    for (const k of kolka) el('circle', { cx: k.x.toFixed(1), cy: k.y.toFixed(1), r: k.r.toFixed(1), fill: barwy.kolor }, g);
    const luk = (cx, cy, r, od, doo) => {
      const a = (od * Math.PI) / 180, b = (doo * Math.PI) / 180;
      return `M${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)} ` +
        `A${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${(cx + r * Math.cos(b)).toFixed(1)} ${(cy + r * Math.sin(b)).toFixed(1)}`;
    };
    let cienie = '', blaski = '';
    for (const k of kolka) {
      cienie += luk(k.x, k.y, k.r * 0.72, 15, 115) + ' ';
      blaski += luk(k.x, k.y, k.r * 0.6, 200, 280) + ' ';
    }
    // loczki we wnętrzu
    const wSrodku = (x, y) => {
      if (poza && x > poza.x && x < poza.x + poza.w && y > poza.y && y < poza.y + poza.h) return false;
      if (ksztalt.typ === 'elipsa') return ((x - ksztalt.cx) / ksztalt.rx) ** 2 + ((y - ksztalt.cy) / ksztalt.ry) ** 2 < 0.8;
      return x > ksztalt.x + 14 && x < ksztalt.x + ksztalt.w - 14 && y > ksztalt.y + 14 && y < ksztalt.y + ksztalt.h - 14;
    };
    let proby = 0, ile = 0;
    const minX = ksztalt.typ === 'elipsa' ? ksztalt.cx - ksztalt.rx : ksztalt.x;
    const minY = ksztalt.typ === 'elipsa' ? ksztalt.cy - ksztalt.ry : ksztalt.y;
    const szer = ksztalt.typ === 'elipsa' ? ksztalt.rx * 2 : ksztalt.w;
    const wys = ksztalt.typ === 'elipsa' ? ksztalt.ry * 2 : ksztalt.h;
    while (ile < loki && proby < loki * 20) {
      proby++;
      const x = minX + l() * szer, y = minY + l() * wys;
      if (!wSrodku(x, y)) continue;
      ile++;
      const r = 5 + l() * 4, obrot = l() * 360;
      cienie += luk(x, y, r, obrot, obrot + 200) + ' ';
      if (l() < 0.5) blaski += luk(x - 2, y - 2, r * 0.7, obrot + 170, obrot + 260) + ' ';
    }
    el('path', { d: cienie, fill: 'none', stroke: barwy.cien, 'stroke-width': 2.6, 'stroke-linecap': 'round', opacity: 0.55 }, g);
    el('path', { d: blaski, fill: 'none', stroke: barwy.jasne, 'stroke-width': 2.6, 'stroke-linecap': 'round', opacity: 0.85 }, g);
  }

  const PANEL = { x: 304, y: 156, w: 662, h: 340 };
  futro($('#futro-tulow'), { typ: 'prostokat', x: 280, y: 140, w: 710, h: 370, r: 150 },
    { promien: 30, odstep: 40, loki: 26, poza: { x: PANEL.x - 20, y: PANEL.y - 20, w: PANEL.w + 40, h: PANEL.h + 40 }, ziarno: 7 });
  futro($('#futro-piers'), { typ: 'elipsa', cx: 252, cy: 262, rx: 52, ry: 70 }, { promien: 26, odstep: 30, loki: 6, ziarno: 3 });
  futro($('#futro-czubek'), { typ: 'elipsa', cx: 190, cy: 94, rx: 46, ry: 36 }, { promien: 24, odstep: 26, loki: 5, ziarno: 11 });
  futro($('#futro-ucho'), { typ: 'elipsa', cx: 250, cy: 214, rx: 23, ry: 58 }, { promien: 21, odstep: 22, barwy: FUTRO_UCHA, loki: 5, ziarno: 5 });
  futro($('#futro-ogon'), { typ: 'elipsa', cx: 1084, cy: 98, rx: 28, ry: 28 }, { promien: 22, odstep: 22, loki: 3, ziarno: 13 });

  function noga(g, x, dalsza, ziarno) {
    el('rect', { x, y: 470, width: 30, height: 150, rx: 14, fill: dalsza ? 'url(#g-skora-dalej)' : 'url(#g-skora)' }, g);
    el('ellipse', { cx: x + 8, cy: 656, rx: 23, ry: 10, fill: dalsza ? '#C58D5D' : '#DDA675' }, g);
    futro(g, { typ: 'elipsa', cx: x + 15, cy: 616, rx: 15, ry: 13 },
      { promien: 16, odstep: 15, barwy: dalsza ? FUTRO_DALEJ : FUTRO, loki: 1, ziarno });
  }
  noga($('#nogi-dalsze'), 362, true, 21);
  noga($('#nogi-dalsze'), 942, true, 22);
  noga($('#nogi-blizsze'), 300, false, 23);
  noga($('#nogi-blizsze'), 878, false, 24);

  // puszysty brzeg panelu: kremowe kółka na obwodzie
  (() => {
    const g = $('#panel-brzeg');
    const cien = el('filter', { id: 'f-cien-panelu', x: '-5%', y: '-5%', width: '110%', height: '115%' }, $('#pudel defs'));
    el('feDropShadow', { dx: 0, dy: 3, stdDeviation: 4, 'flood-color': '#9A6334', 'flood-opacity': 0.3 }, cien);
    const grupa = el('g', { filter: 'url(#f-cien-panelu)' }, g);
    el('rect', { x: PANEL.x, y: PANEL.y, width: PANEL.w, height: PANEL.h, rx: 34, fill: '#FFF8EE' }, grupa);
    for (const p of obwodProstokata(PANEL.x, PANEL.y, PANEL.w, PANEL.h, 34, 21)) {
      el('circle', { cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: 9.5, fill: '#FFF8EE' }, grupa);
    }
  })();

  /* ============================ dane ============================ */
  const MIASTA = {
    'Ciuchciowo': [0, 0], 'Parowice': [6, 4], 'Semaforowo': [-8, 3], 'Torowa Wola': [4, -10],
    'Rozjazdy': [12, -3], 'Przetoki': [-5, -12], 'Zwrotnica Mała': [-13, -6], 'Węglarki': [10, 9],
    'Kolejowo Górne': [-2, 11], 'Bocznica': [17, 6],
  };

  const MASCI = [
    { klucz: 'biala', nazwa: 'biała', tlo: '#F7F3EA', rdzenie: ['bial', 'biel', 'sniez', 'krem'] },
    { klucz: 'czarna', nazwa: 'czarna', tlo: '#2E2926', rdzenie: ['czarn', 'smoli'] },
    { klucz: 'brazowa', nazwa: 'brązowa', tlo: '#8A5A35', rdzenie: ['braz', 'czekol', 'kasztan', 'brunat'] },
    { klucz: 'ruda', nazwa: 'ruda (morelowa)', tlo: '#E0A064', rdzenie: ['rud', 'morel', 'zlot', 'plow', 'rdzaw', 'pomarancz'] },
    { klucz: 'szara', nazwa: 'szara', tlo: '#A3A7AB', rdzenie: ['szar', 'srebr', 'popiel', 'grafit'] },
    { klucz: 'laciata', nazwa: 'łaciata', tlo: 'linear-gradient(135deg, #F7F3EA 50%, #7A4B2A 50%)', rdzenie: ['laci', 'latk', 'laty', 'plamk', 'cetk', 'trojkol'] },
    { klucz: 'podpalana', nazwa: 'podpalana', tlo: 'linear-gradient(135deg, #2E2926 56%, #C9874B 56%)', rdzenie: ['podpal'] },
    { klucz: 'pregowana', nazwa: 'pręgowana', tlo: 'repeating-linear-gradient(45deg, #8A5A35 0 3px, #4E3420 3px 6px)', rdzenie: ['pregow', 'tygrys'] },
  ];
  const MASC = Object.fromEntries(MASCI.map((m) => [m.klucz, m]));
  const PODOBNE_MASCI = {
    'ruda|brazowa': 0.4, 'biala|szara': 0.3, 'czarna|podpalana': 0.5, 'laciata|biala': 0.4,
    'laciata|czarna': 0.4, 'pregowana|brazowa': 0.4, 'czarna|szara': 0.2,
  };

  const RASY = [
    { nazwa: 'pudel', rdzenie: ['pudel', 'pudl'] },
    { nazwa: 'jamnik', rdzenie: ['jamni', 'jamn'] },
    { nazwa: 'owczarek niemiecki', rdzenie: ['owczar'] },
    { nazwa: 'labrador', rdzenie: ['labrad'] },
    { nazwa: 'golden retriever', rdzenie: ['golden', 'retriev'] },
    { nazwa: 'kundel', rdzenie: ['kund', 'miesza', 'mieszan'] },
    { nazwa: 'yorkshire terrier', rdzenie: ['york', 'jork'] },
    { nazwa: 'beagle', rdzenie: ['beagl', 'bigl'] },
    { nazwa: 'husky', rdzenie: ['husk', 'hask'] },
    { nazwa: 'border collie', rdzenie: ['border', 'colli', 'kolli'] },
    { nazwa: 'buldog francuski', rdzenie: ['buldo', 'bulda'] },
    { nazwa: 'chihuahua', rdzenie: ['chihu', 'cziwa', 'cziua'] },
    { nazwa: 'spaniel', rdzenie: ['spani', 'cocker', 'koker'] },
    { nazwa: 'shih tzu', rdzenie: ['shih', 'szicu', 'shitzu'] },
    { nazwa: 'maltańczyk', rdzenie: ['maltan', 'maltaj'] },
    { nazwa: 'jack russell terrier', rdzenie: ['jack', 'dzek', 'russel'] },
    { nazwa: 'terier', rdzenie: ['terier', 'terrier'] },
  ];

  const WIELKOSCI = [
    { klucz: 'maly', nazwa: 'mały', rdzenie: ['mal', 'mini', 'toy'] },
    { klucz: 'sredni', nazwa: 'średni', rdzenie: ['sredn'] },
    { klucz: 'duzy', nazwa: 'duży', rdzenie: ['duz', 'wielk', 'ogrom'] },
  ];
  const KOLEJNOSC_WIELKOSCI = ['maly', 'sredni', 'duzy'];

  const POMIJANE = new Set(['i', 'w', 'we', 'z', 'ze', 'na', 'do', 'od', 'po', 'pod', 'przy', 'kolo', 'o', 'a', 'ma', 'jest',
    'bardzo', 'taki', 'taka', 'troche', 'moj', 'moja', 'nasz', 'nasza', 'pies', 'psa', 'psy', 'piesek', 'pieska', 'psem',
    'suczka', 'suka', 'sunia', 'suczke', 'zaginal', 'zaginela', 'zaginiony', 'zaginiona', 'zgubil', 'zgubila', 'znaleziony',
    'znaleziona', 'znalazlem', 'znalazlam', 'szukam', 'okolice', 'okolicy', 'okolica', 'rasy', 'rasa', 'masci', 'masc', 'z']);

  // Tablica ogłoszeń z okolic Ciuchciowa (świat wymyślony, kontakty prowadzą do kolejarzy ze stacji).
  const TABLICA = [
    { id: 'bezik', typ: 'zaginiony', imie: 'Bezik', rasa: 'pudel', masc: 'ruda', wielkosc: 'sredni', miejsce: 'Ciuchciowo', dni: 2,
      opis: 'Morelowy pudel z różową kokardką na czubku głowy. Uwielbia ciuchcie i daje się przeciągać po pulpicie.',
      kontakt: 'Maszynista Burek, kabina lokomotywy przy peronie 1' },
    { id: 't2', typ: 'znaleziony', imie: '', rasa: 'kundel', masc: 'czarna', wielkosc: 'maly', miejsce: 'Parowice', dni: 1,
      opis: 'Mała czarna sunia z białą łatką na piersi i czerwoną obrożą bez adresatki. Grzeczna, boi się gwizdków.',
      kontakt: 'Dyżurny ruchu w Parowicach, nastawnia przy przejeździe' },
    { id: 't3', typ: 'zaginiony', imie: 'Kiełbasa', rasa: 'jamnik', masc: 'brazowa', wielkosc: 'maly', miejsce: 'Semaforowo', dni: 5,
      opis: 'Długi brązowy jamnik, siwy pyszczek. Reaguje na szelest papierka. Ma chip 999000000000042.', chip: '999000000000042',
      kontakt: 'Zawiadowca stacji Semaforowo' },
    { id: 't4', typ: 'znaleziony', imie: '', rasa: 'owczarek niemiecki', masc: 'podpalana', wielkosc: 'duzy', miejsce: 'Torowa Wola', dni: 3,
      opis: 'Duży owczarek, czarny podpalany. Chodził wzdłuż torów, ma niebieską obrożę z dzwoneczkiem.',
      kontakt: 'Toromistrz z Torowej Woli, budka przy semaforze' },
    { id: 't5', typ: 'zaginiony', imie: 'Śnieżka', rasa: 'maltańczyk', masc: 'biala', wielkosc: 'maly', miejsce: 'Węglarki', dni: 1,
      opis: 'Biała puchata suczka w różowych szelkach. Ucieka za kotami.',
      kontakt: 'Pani z kiosku na dworcu w Węglarkach' },
    { id: 't6', typ: 'znaleziony', imie: '', rasa: 'pudel', masc: 'biala', wielkosc: 'sredni', miejsce: 'Rozjazdy', dni: 4,
      opis: 'Biały pudel z niebieską kokardką biegał przy rozjeździe nr 3. Przyjazny, świeżo ostrzyżony.',
      kontakt: 'Nastawniczy w Rozjazdach' },
    { id: 't7', typ: 'zaginiony', imie: 'Rudy', rasa: 'kundel', masc: 'ruda', wielkosc: 'sredni', miejsce: 'Kolejowo Górne', dni: 8,
      opis: 'Rudy kundel, jedno ucho stojące, drugie klapnięte. Lubi jeździć pociągami osobowymi.',
      kontakt: 'Kierownik pociągu osobowego do Kolejowa Górnego' },
    { id: 't8', typ: 'znaleziony', imie: '', rasa: 'beagle', masc: 'laciata', wielkosc: 'sredni', miejsce: 'Ciuchciowo', dni: 0,
      opis: 'Trójkolorowy beagle siedział w poczekalni przy kasie biletowej. Bardzo głodny, merda ogonem.',
      kontakt: 'Kasa biletowa nr 1, stacja Ciuchciowo' },
    { id: 't9', typ: 'zaginiony', imie: 'Bosman', rasa: 'labrador', masc: 'czarna', wielkosc: 'duzy', miejsce: 'Bocznica', dni: 6,
      opis: 'Czarny labrador, siwa broda, zielona obroża. Wskakuje do każdej kałuży.',
      kontakt: 'Magazynier z bocznicy towarowej' },
    { id: 't10', typ: 'znaleziony', imie: '', rasa: 'husky', masc: 'szara', wielkosc: 'duzy', miejsce: 'Zwrotnica Mała', dni: 2,
      opis: 'Szaro-biały husky z niebieskimi oczami. Wyje, gdy przejeżdża pociąg.',
      kontakt: 'Zwrotniczy w Zwrotnicy Małej' },
    { id: 't11', typ: 'zaginiony', imie: 'Pikuś', rasa: 'yorkshire terrier', masc: 'podpalana', wielkosc: 'maly', miejsce: 'Przetoki', dni: 3,
      opis: 'Malutki york w czerwonym sweterku. Szczeka na semafory.',
      kontakt: 'Konduktorka z Przetok' },
    { id: 't12', typ: 'znaleziony', imie: '', rasa: 'jamnik', masc: 'brazowa', wielkosc: 'maly', miejsce: 'Parowice', dni: 2,
      opis: 'Brązowy jamnik, siwy pyszczek, bez obroży. Znaleziony na peronie 2, lubi papierki po kanapkach.',
      kontakt: 'Bufet dworcowy w Parowicach' },
    { id: 't13', typ: 'zaginiony', imie: 'Kapsel', rasa: 'border collie', masc: 'laciata', wielkosc: 'sredni', miejsce: 'Torowa Wola', dni: 10,
      opis: 'Czarno-biały border collie, zagania gołębie na peronie. Ma chip 999000000000107.', chip: '999000000000107',
      kontakt: 'Zawiadowca stacji Torowa Wola' },
    { id: 't14', typ: 'znaleziony', imie: '', rasa: 'chihuahua', masc: 'ruda', wielkosc: 'maly', miejsce: 'Semaforowo', dni: 1,
      opis: 'Malutka ruda chihuahua w różowej kurteczce. Trzęsła się pod ławką na peronie.',
      kontakt: 'Kasa biletowa w Semaforowie' },
    { id: 't15', typ: 'zaginiony', imie: 'Wagon', rasa: 'buldog francuski', masc: 'pregowana', wielkosc: 'maly', miejsce: 'Rozjazdy', dni: 4,
      opis: 'Pręgowany buldożek francuski. Chrapie jak lokomotywa parowa.',
      kontakt: 'Nastawniczy w Rozjazdach' },
  ];

  const PAMIEC = 'pudel-ogloszenia';
  const PAMIEC_BEZIK = 'pudel-bezik-odnaleziony';
  function czytaj(klucz, domyslnie) {
    try { const v = localStorage.getItem(klucz); return v === null ? domyslnie : JSON.parse(v); } catch { return domyslnie; }
  }
  function zapisz(klucz, wartosc) {
    try { localStorage.setItem(klucz, JSON.stringify(wartosc)); } catch { /* bez pamięci */ }
  }
  let moje = czytaj(PAMIEC, []);
  if (!Array.isArray(moje)) moje = [];
  let bezikOdnaleziony = czytaj(PAMIEC_BEZIK, false) === true;

  const dzis = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  function wszystkie() {
    const d0 = dzis();
    const z = TABLICA.map((o) => ({ ...o, data: new Date(d0.getTime() - o.dni * 86400000) }));
    for (const m of moje) z.push({ ...m, data: new Date(m.data), moje: true });
    return z.map(przygotuj);
  }

  /* ============================ wyszukiwanie ============================ */
  const zwykle = (t) => String(t || '').toLowerCase().replace(/ł/g, 'l').normalize('NFD').replace(/[̀-ͯ]/g, '');
  const slowa = (t) => zwykle(t).split(/[^a-z0-9]+/).filter(Boolean);
  const rdzen = (t) => (t.length > 5 ? t.slice(0, 5) : t);
  const zaczynaSie = (slowo, rdzenie) => rdzenie.some((r) => slowo.startsWith(r));

  function rasaZ(tekst) {
    for (const s of slowa(tekst)) {
      const r = RASY.find((x) => zaczynaSie(s, x.rdzenie));
      if (r) return r.nazwa;
    }
    return zwykle(tekst).trim();
  }
  function przygotuj(o) {
    return {
      ...o,
      rasaKlucz: rasaZ(o.rasa),
      miejsceKlucz: zwykle(o.miejsce).trim(),
      slowa: new Set([...slowa(o.opis), ...slowa(o.imie), ...slowa(o.rasa)].filter((s) => s.length >= 3 || /^\d+$/.test(s)).map(rdzen)),
    };
  }

  function znaneMiasta(ogloszenia) {
    const m = new Map(Object.keys(MIASTA).map((n) => [zwykle(n), n]));
    for (const o of ogloszenia) if (o.miejsce && !m.has(o.miejsceKlucz)) m.set(o.miejsceKlucz, o.miejsce);
    return m;
  }

  // Rozbiór opisu na: miasta, rasy, maści, wielkości, numery chipów i resztę słów.
  function rozbierz(pytanie, ogloszenia) {
    const t = slowa(pytanie);
    const wynik = { miasta: [], rasy: new Set(), masci: new Set(), wielkosci: new Set(), chipy: [], inne: [] };
    const miasta = [...znaneMiasta(ogloszenia).keys()].map((k) => k.split(' '));
    for (let i = 0; i < t.length; i++) {
      const s = t[i];
      const miasto = miasta.find((cz) => cz.every((c, j) => t[i + j] && rdzen(t[i + j]) === rdzen(c)));
      if (miasto) { wynik.miasta.push(miasto.join(' ')); i += miasto.length - 1; continue; }
      if (/^\d{15}$/.test(s)) { wynik.chipy.push(s); continue; }
      if (POMIJANE.has(s) || (s.length < 3 && !/^\d+$/.test(s))) continue;
      const rasa = RASY.find((x) => zaczynaSie(s, x.rdzenie));
      if (rasa) { wynik.rasy.add(rasa.nazwa); continue; }
      const masc = MASCI.find((x) => zaczynaSie(s, x.rdzenie));
      if (masc) { wynik.masci.add(masc.klucz); continue; }
      const wielkosc = WIELKOSCI.find((x) => zaczynaSie(s, x.rdzenie));
      if (wielkosc) { wynik.wielkosci.add(wielkosc.klucz); continue; }
      wynik.inne.push(rdzen(s));
    }
    return wynik;
  }

  function odleglosc(a, b) {
    if (a === b) return 0;
    const n = Object.fromEntries(Object.entries(MIASTA).map(([k, v]) => [zwykle(k), v]));
    if (!n[a] || !n[b]) return Infinity;
    return Math.hypot(n[a][0] - n[b][0], n[a][1] - n[b][1]);
  }

  function ocen(o, r) {
    if (r.chipy.length) return r.chipy.includes(o.chip) ? 100 : 0;
    let max = 0, ma = 0;
    if (r.rasy.size) { max += 3; if (r.rasy.has(o.rasaKlucz)) ma += 3; }
    if (r.masci.size) {
      max += 2;
      let najlepiej = 0;
      for (const m of r.masci) {
        const p = m === o.masc ? 1 : (PODOBNE_MASCI[`${m}|${o.masc}`] || PODOBNE_MASCI[`${o.masc}|${m}`] || 0);
        najlepiej = Math.max(najlepiej, p);
      }
      ma += 2 * najlepiej;
    }
    if (r.wielkosci.size) {
      max += 1;
      let najlepiej = 0;
      for (const w of r.wielkosci) {
        const d = Math.abs(KOLEJNOSC_WIELKOSCI.indexOf(w) - KOLEJNOSC_WIELKOSCI.indexOf(o.wielkosc));
        najlepiej = Math.max(najlepiej, d === 0 ? 1 : d === 1 ? 0.4 : 0);
      }
      ma += najlepiej;
    }
    if (r.miasta.length) {
      max += 2;
      let najlepiej = 0;
      for (const m of r.miasta) najlepiej = Math.max(najlepiej, Math.max(0, 1 - odleglosc(m, o.miejsceKlucz) / 25));
      ma += 2 * najlepiej;
    }
    for (const s of r.inne.slice(0, 4)) {
      max += 1;
      if (o.slowa.has(s)) ma += 1;
    }
    return max ? Math.round((100 * ma) / max) : null;
  }

  /* ============================ stan i filtry ============================ */
  const stan = { typ: '', wielkosci: new Set(), masci: new Set(), otwarte: null };
  const pytanie = $('#pytanie');
  const lista = $('#wyniki');
  const pusto = $('#pusto');
  const ile = $('#ile');

  const filtrMasc = $('#filtr-masc');
  for (const m of MASCI) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.masc = m.klucz;
    b.style.background = m.tlo;
    b.title = m.nazwa;
    b.setAttribute('aria-label', `Maść ${m.nazwa}`);
    b.setAttribute('aria-pressed', 'false');
    filtrMasc.appendChild(b);
  }
  filtrMasc.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const k = b.dataset.masc;
    if (stan.masci.has(k)) stan.masci.delete(k); else stan.masci.add(k);
    b.setAttribute('aria-pressed', String(stan.masci.has(k)));
    pokaz();
  });
  $('#filtr-wielkosc').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const k = b.dataset.wielkosc;
    if (stan.wielkosci.has(k)) stan.wielkosci.delete(k); else stan.wielkosci.add(k);
    b.setAttribute('aria-pressed', String(stan.wielkosci.has(k)));
    pokaz();
  });
  function ustawTyp(typ) {
    stan.typ = typ;
    for (const b of document.querySelectorAll('#filtr-typ button')) b.setAttribute('aria-checked', String(b.dataset.typ === typ));
  }
  $('#filtr-typ').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    ustawTyp(b.dataset.typ);
    pokaz();
  });

  /* ============================ wyniki ============================ */
  function odmiana(n, jeden, kilka, wiele) {
    if (n === 1) return jeden;
    const d = n % 10, s = n % 100;
    return d >= 2 && d <= 4 && (s < 12 || s > 14) ? kilka : wiele;
  }
  function kiedy(data) {
    const dni = Math.round((dzis() - new Date(data.getFullYear(), data.getMonth(), data.getDate())) / 86400000);
    if (dni <= 0) return 'dziś';
    if (dni === 1) return 'wczoraj';
    if (dni < 31) return `${dni} dni temu`;
    return data.toLocaleDateString('pl-PL');
  }
  const BARWY_AWATARA = {
    biala: ['#F7F3EA', '#E2D7C4', '#FFFFFF'], czarna: ['#3A3431', '#221E1C', '#5A514B'], brazowa: ['#8A5A35', '#66401F', '#BC8F66'],
    ruda: ['#E0A064', '#C47D43', '#F5D3AC'], szara: ['#A3A7AB', '#7C8186', '#D2D5D8'], laciata: ['#F7F3EA', '#7A4B2A', '#FFFFFF'],
    podpalana: ['#3A3431', '#221E1C', '#C9874B'], pregowana: ['#8A5A35', '#4E3420', '#BC8F66'],
  };
  function awatar(masc) {
    const [glowa, uszy, pysk] = BARWY_AWATARA[masc] || BARWY_AWATARA.ruda;
    const dodatki = masc === 'laciata' ? '<path d="M20 11c4-1 7 2 7 6 0 2-2 3-4 3-3 0-4-3-3-9z" fill="#7A4B2A"/>'
      : masc === 'pregowana' ? '<path d="M13 13l3 3M14 19l3 2M23 13l-3 3M23 19l-3 2" stroke="#4E3420" stroke-width="1.6" stroke-linecap="round"/>'
        : masc === 'podpalana' ? '<circle cx="14.5" cy="15" r="1.6" fill="#C9874B"/><circle cx="21.5" cy="15" r="1.6" fill="#C9874B"/>' : '';
    return `<svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="18" fill="#F3E2CC"/>` +
      `<path d="M8 12c-3 3-3 10 0 13 2 1 4-1 4-3l1-9c0-2-3-3-5-1zM28 12c3 3 3 10 0 13-2 1-4-1-4-3l-1-9c0-2 3-3 5-1z" fill="${uszy}"/>` +
      `<ellipse cx="18" cy="18" rx="8.5" ry="9" fill="${glowa}"/>${dodatki}` +
      `<ellipse cx="18" cy="23" rx="5" ry="3.8" fill="${pysk}"/>` +
      `<circle cx="14.5" cy="17" r="1.4" fill="#1E1714"/><circle cx="21.5" cy="17" r="1.4" fill="#1E1714"/>` +
      `<ellipse cx="18" cy="21.3" rx="1.9" ry="1.4" fill="#1E1714"/></svg>`;
  }
  const tekst = (t) => document.createTextNode(t);
  function znaczek(o) {
    const s = document.createElement('span');
    if (o.id === 'bezik' && bezikOdnaleziony) { s.className = 'znaczek odnaleziony'; s.textContent = 'Odnaleziony'; return s; }
    s.className = `znaczek ${o.typ}`;
    s.textContent = o.typ === 'zaginiony' ? 'Zaginiony' : 'Znaleziony';
    return s;
  }

  let ostatnie = [];
  function pokaz({ zWeszeniem = false } = {}) {
    const ogloszenia = wszystkie();
    const q = pytanie.value.trim();
    const r = rozbierz(q, ogloszenia);
    let wyniki = ogloszenia
      .filter((o) => !stan.typ || o.typ === stan.typ)
      .filter((o) => !stan.wielkosci.size || stan.wielkosci.has(o.wielkosc))
      .filter((o) => !stan.masci.size || stan.masci.has(o.masc))
      .map((o) => ({ o, wynik: q ? ocen(o, r) : null }));
    if (q) {
      wyniki = wyniki.filter((w) => w.wynik !== null && w.wynik >= 30)
        .sort((a, b) => b.wynik - a.wynik || b.o.data - a.o.data);
    } else {
      wyniki.sort((a, b) => b.o.data - a.o.data);
    }
    ostatnie = wyniki;

    lista.replaceChildren(...wyniki.map(({ o, wynik }) => wiersz(o, wynik)));
    lista.hidden = wyniki.length === 0;
    pusto.hidden = wyniki.length !== 0;
    pusto.textContent = q
      ? 'Nic nie pasuje do tego opisu. Usuń filtry albo dodaj ogłoszenie, żeby inni mogli pomóc.'
      : 'Brak ogłoszeń dla wybranych filtrów.';
    const n = wyniki.length;
    ile.textContent = q
      ? `${n} ${odmiana(n, 'ogłoszenie pasuje', 'ogłoszenia pasują', 'ogłoszeń pasuje')}`
      : `${n} ${odmiana(n, 'ogłoszenie', 'ogłoszenia', 'ogłoszeń')} z okolicy`;
    if (zWeszeniem) {
      lista.scrollTop = 0;
      wesz();
      if (wyniki[0] && wyniki[0].wynik >= 80) setTimeout(machaj, 700);
    }
  }

  function wiersz(o, wynik) {
    const li = document.createElement('li');
    li.className = 'wynik';
    const glowa = document.createElement('button');
    glowa.type = 'button';
    glowa.className = 'wynik-glowa';
    glowa.setAttribute('aria-expanded', String(stan.otwarte === o.id));
    const aw = document.createElement('span');
    aw.className = 'awatar';
    aw.innerHTML = awatar(o.masc);
    const t = document.createElement('span');
    t.className = 'wynik-tekst';
    const tytul = document.createElement('span');
    tytul.className = 'wynik-tytul';
    const nazwa = document.createElement('span');
    const imie = document.createElement('b');
    imie.textContent = o.imie || (o.typ === 'znaleziony' ? 'Bez imienia' : 'Pies');
    nazwa.append(imie, tekst(`, ${o.rasa || 'nieznana rasa'}`));
    tytul.append(nazwa, znaczek(o));
    if (o.moje) { const m = document.createElement('span'); m.className = 'znaczek moje'; m.textContent = 'Moje'; tytul.append(m); }
    const gdzie = document.createElement('span');
    gdzie.className = 'wynik-gdzie';
    gdzie.textContent = `${o.miejsce}, ${kiedy(o.data)}, ${(MASC[o.masc] || {}).nazwa || ''}, ${(WIELKOSCI.find((w) => w.klucz === o.wielkosc) || {}).nazwa || ''}`;
    t.append(tytul, gdzie);
    glowa.append(aw, t);
    if (wynik !== null) {
      const d = document.createElement('span');
      d.className = 'dopasowanie';
      d.title = 'Dopasowanie do opisu';
      d.innerHTML = `<span class="miarka"><i style="width:${wynik}%"></i></span>`;
      d.append(tekst(`${wynik}%`));
      glowa.append(d);
    }
    glowa.addEventListener('click', () => {
      stan.otwarte = stan.otwarte === o.id ? null : o.id;
      pokaz();
      const otwarty = lista.querySelector('[aria-expanded="true"]');
      if (otwarty) otwarty.closest('.wynik').scrollIntoView({ block: 'nearest' });
    });
    li.append(glowa);
    if (stan.otwarte === o.id) li.append(szczegoly(o));
    return li;
  }

  function szczegoly(o) {
    const d = document.createElement('div');
    d.className = 'wynik-szczegoly';
    const opis = document.createElement('p');
    opis.textContent = o.opis || 'Brak opisu.';
    const kontakt = document.createElement('p');
    kontakt.className = 'kontakt';
    const b = document.createElement('b');
    b.textContent = o.kontakt || 'nie podano';
    kontakt.append(tekst('Kontakt: '), b);
    d.append(opis, kontakt);
    const akcje = document.createElement('div');
    akcje.className = 'wynik-akcje';
    if (o.id === 'bezik' && !bezikOdnaleziony) {
      const to = document.createElement('button');
      to.type = 'button';
      to.className = 'przycisk-glowny';
      to.textContent = 'To ten pudel na ekranie!';
      to.addEventListener('click', () => {
        bezikOdnaleziony = true;
        zapisz(PAMIEC_BEZIK, true);
        hau(0, 1.7); hau(0.2, 1.8);
        machaj();
        komunikat('Bezik odnaleziony. Hau!');
        pokaz();
      });
      akcje.append(to);
    }
    const podobne = document.createElement('button');
    podobne.type = 'button';
    podobne.className = 'przycisk-drugi';
    podobne.textContent = o.typ === 'zaginiony' ? 'Szukaj wśród znalezionych' : 'Szukaj wśród zaginionych';
    podobne.addEventListener('click', () => szukajPodobnych(o));
    akcje.append(podobne);
    if (o.moje) {
      const usun = document.createElement('button');
      usun.type = 'button';
      usun.className = 'przycisk-drugi';
      usun.textContent = 'Usuń ogłoszenie';
      usun.addEventListener('click', () => {
        moje = moje.filter((m) => m.id !== o.id);
        zapisz(PAMIEC, moje);
        stan.otwarte = null;
        komunikat('Usunięto ogłoszenie.');
        pokaz();
      });
      akcje.append(usun);
    }
    d.append(akcje);
    return d;
  }

  function szukajPodobnych(o) {
    const m = MASC[o.masc];
    pytanie.value = [o.rasa, m ? m.nazwa.split(' (')[0] : '', o.miejsce].filter(Boolean).join(', ');
    ustawTyp(o.typ === 'zaginiony' ? 'znaleziony' : 'zaginiony');
    stan.otwarte = null;
    pokaz({ zWeszeniem: true });
  }

  let czasPisania = 0;
  pytanie.addEventListener('input', () => {
    clearTimeout(czasPisania);
    czasPisania = setTimeout(() => { stan.otwarte = null; pokaz(); }, 140);
  });
  $('#formularz-szukaj').addEventListener('submit', (e) => {
    e.preventDefault();
    clearTimeout(czasPisania);
    stan.otwarte = null;
    weszenieDzwiek();
    pokaz({ zWeszeniem: true });
  });

  /* ============================ komunikaty i ruch pudla ============================ */
  const kom = $('#komunikat');
  let czasKom = 0;
  function komunikat(t) {
    kom.textContent = t;
    kom.hidden = false;
    clearTimeout(czasKom);
    czasKom = setTimeout(() => { kom.hidden = true; }, 2600);
  }
  function chwilowo(klasa, ms) {
    if (mniejRuchu) return;
    scena.classList.remove(klasa);
    void scena.offsetWidth;
    scena.classList.add(klasa);
    setTimeout(() => scena.classList.remove(klasa), ms);
  }
  const machaj = () => chwilowo('macha', 1400);
  const wesz = () => chwilowo('weszy', 760);

  const glaszcz = $('#przycisk-glowa');
  glaszcz.addEventListener('click', () => {
    hau(0, 1.75);
    machaj();
    chwilowo('przechyla', 600);
  });
  glaszcz.addEventListener('mouseenter', () => scena.classList.add('przechyla'));
  glaszcz.addEventListener('mouseleave', () => scena.classList.remove('przechyla'));

  /* ============================ dźwięki ============================ */
  let ac = null, szumBufor = null;
  function audio() {
    try {
      if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
    } catch { ac = null; }
    return ac;
  }
  function szum(a, t, dl) {
    if (!szumBufor) {
      szumBufor = a.createBuffer(1, a.sampleRate, a.sampleRate);
      const d = szumBufor.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const s = a.createBufferSource();
    s.buffer = szumBufor;
    s.start(t, Math.random() * 0.5);
    s.stop(t + dl);
    return s;
  }
  function hau(opoznienie = 0, wysokosc = 1) {
    const a = audio(); if (!a) return;
    const t = a.currentTime + 0.01 + opoznienie;
    const o = a.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(420 * wysokosc, t);
    o.frequency.exponentialRampToValueAtTime(720 * wysokosc, t + 0.03);
    o.frequency.exponentialRampToValueAtTime(250 * wysokosc, t + 0.15);
    const f = a.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 1100 * wysokosc; f.Q.value = 1.1;
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.17);
    o.connect(f).connect(g).connect(a.destination);
    o.start(t);
    o.stop(t + 0.18);
  }
  function weszenieDzwiek() {
    const a = audio(); if (!a) return;
    for (let i = 0; i < 3; i++) {
      const t = a.currentTime + 0.02 + i * 0.11;
      const f = a.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = 2600 + i * 300; f.Q.value = 1.4;
      const g = a.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.09, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
      szum(a, t, 0.09).connect(f).connect(g).connect(a.destination);
    }
  }
  function syk() {
    const a = audio(); if (!a) return;
    const t = a.currentTime;
    const f = a.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = 2500;
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.09, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
    szum(a, t, 1).connect(f).connect(g).connect(a.destination);
  }

  /* ============================ nowe ogłoszenie ============================ */
  const widokSzukaj = $('#widok-szukaj');
  const widokDodaj = $('#widok-dodaj');
  const blad = $('#blad');
  const pola = {
    imie: $('#nowy-imie'), rasa: $('#nowy-rasa'), masc: $('#nowy-masc'), wielkosc: $('#nowy-wielkosc'),
    miejsce: $('#nowy-miejsce'), data: $('#nowy-data'), opis: $('#nowy-opis'), kontakt: $('#nowy-kontakt'),
  };
  for (const m of MASCI) pola.masc.add(new Option(m.nazwa, m.klucz));
  $('#lista-ras').replaceChildren(...RASY.map((r) => new Option(r.nazwa)));
  $('#lista-miejsc').replaceChildren(...Object.keys(MIASTA).map((m) => new Option(m)));
  let nowyTyp = 'zaginiony';
  $('#nowy-typ').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    nowyTyp = b.dataset.typ;
    for (const x of document.querySelectorAll('#nowy-typ button')) x.setAttribute('aria-checked', String(x === b));
  });
  const dataISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  function pokazWidok(dodawanie) {
    widokSzukaj.hidden = dodawanie;
    widokDodaj.hidden = !dodawanie;
    zamknijDymek();
    if (dodawanie) {
      widokDodaj.reset();
      nowyTyp = 'zaginiony';
      for (const x of document.querySelectorAll('#nowy-typ button')) x.setAttribute('aria-checked', String(x.dataset.typ === 'zaginiony'));
      pola.masc.value = 'ruda';
      pola.wielkosc.value = 'sredni';
      pola.data.value = dataISO(new Date());
      pola.data.max = dataISO(new Date());
      blad.hidden = true;
      for (const p of Object.values(pola)) p.removeAttribute('aria-invalid');
      const q = pytanie.value.trim();
      if (q) {
        const r = rozbierz(q, wszystkie());
        if (r.rasy.size) pola.rasa.value = [...r.rasy][0];
        if (r.masci.size) pola.masc.value = [...r.masci][0];
        if (r.wielkosci.size) pola.wielkosc.value = [...r.wielkosci][0];
        if (r.miasta.length) pola.miejsce.value = znaneMiasta(wszystkie()).get(r.miasta[0]) || '';
      }
      pola.imie.focus();
    } else {
      $('#dodaj').focus();
    }
  }
  $('#dodaj').addEventListener('click', () => pokazWidok(true));
  $('#anuluj').addEventListener('click', () => pokazWidok(false));
  widokDodaj.addEventListener('keydown', (e) => { if (e.key === 'Escape') pokazWidok(false); });
  widokDodaj.addEventListener('input', (e) => {
    if (e.target.getAttribute('aria-invalid') === 'true' && e.target.value.trim()) {
      e.target.removeAttribute('aria-invalid');
      blad.hidden = true;
    }
  });

  widokDodaj.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = Object.fromEntries(Object.entries(pola).map(([k, p]) => [k, p.value.trim()]));
    for (const p of Object.values(pola)) p.removeAttribute('aria-invalid');
    let problem = null, pole = null;
    if (!v.miejsce) { problem = nowyTyp === 'zaginiony' ? 'Wpisz, gdzie pies zaginął.' : 'Wpisz, gdzie znalazłeś psa.'; pole = pola.miejsce; }
    else if (!v.rasa && !v.opis) { problem = 'Wpisz rasę albo znaki szczególne, żeby można było psa rozpoznać.'; pole = pola.rasa; }
    else if (!v.kontakt) { problem = 'Wpisz kontakt, żeby ktoś mógł dać Ci znać.'; pole = pola.kontakt; }
    if (problem) {
      blad.textContent = problem;
      blad.hidden = false;
      pole.setAttribute('aria-invalid', 'true');
      pole.focus();
      return;
    }
    const chip = (v.opis.match(/\b\d{15}\b/) || [])[0];
    const nowe = {
      id: `m${Date.now()}`, typ: nowyTyp, imie: v.imie, rasa: v.rasa || 'kundel', masc: v.masc, wielkosc: v.wielkosc,
      miejsce: v.miejsce, data: v.data ? new Date(`${v.data}T12:00:00`).toISOString() : new Date().toISOString(),
      opis: v.opis, kontakt: v.kontakt, chip,
    };
    moje.push(nowe);
    zapisz(PAMIEC, moje);
    pokazWidok(false);
    // od razu szukamy drugiej strony: zaginął → wśród znalezionych, znaleziony → wśród zaginionych
    szukajPodobnych(przygotuj({ ...nowe, data: new Date(nowe.data) }));
    komunikat(ostatnie.length ? 'Dodano ogłoszenie. Oto podobne psy z okolicy.' : 'Dodano ogłoszenie. Na razie nikt nie zgłosił podobnego psa.');
  });

  /* ============================ prawdziwe odnośniki ============================ */
  const dymek = $('#dymek');
  const przyciskInternet = $('#internet');
  function zamknijDymek() {
    dymek.hidden = true;
    przyciskInternet.setAttribute('aria-expanded', 'false');
  }
  przyciskInternet.addEventListener('click', () => {
    const otworz = dymek.hidden;
    dymek.hidden = !otworz;
    przyciskInternet.setAttribute('aria-expanded', String(otworz));
    if (otworz) dymek.querySelector('a').focus();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !dymek.hidden) { zamknijDymek(); przyciskInternet.focus(); } });
  document.addEventListener('mousedown', (e) => {
    if (!dymek.hidden && !dymek.contains(e.target) && e.target !== przyciskInternet) zamknijDymek();
  });
  function otworzZewnetrznie(url) {
    if (wBezramce && typeof window.bezramka.otworzWPrzegladarce === 'function') window.bezramka.otworzWPrzegladarce(url);
    else window.open(url, '_blank', 'noopener');
  }
  dymek.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-zewn]'); if (!a) return;
    e.preventDefault();
    let url = a.href;
    if (a.dataset.zewn === 'google') {
      const q = pytanie.value.trim();
      const poczatek = stan.typ === 'znaleziony' ? 'znaleziono psa' : 'zaginął pies';
      url = `https://www.google.com/search?q=${encodeURIComponent(`${poczatek} ${q}`.trim())}`;
    }
    otworzZewnetrznie(url);
    zamknijDymek();
  });

  /* ============================ para: przemiana ============================ */
  // Para wygasa przy brzegach okna, żeby nigdy nie było widać prostych krawędzi (czyli prostokąta okna).
  function winieta(c) {
    const M = 90;
    c.save();
    c.globalCompositeOperation = 'destination-in';
    let g = c.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(M / W, '#000'); g.addColorStop(1 - M / W, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(M / H, '#000'); g.addColorStop(1 - M / H, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    c.restore();
  }
  // Kłąb pary układa się wokół sylwetki pudla; poza nią zostaje tylko kilka obłoczków.
  function naPudlu(x, y) {
    const e = document.elementFromPoint(uklad.dx + x * uklad.skala, uklad.dy + y * uklad.skala);
    return Boolean(e) && e !== scena && e !== document.body && e !== document.documentElement && e.id !== 'pudel';
  }
  function klab(pojawienie) {
    for (let y = 70; y <= 640; y += 76) {
      for (let x = 60; x <= 1140; x += 80) {
        if (!naPudlu(x, y) && Math.random() < 0.75) continue;
        para.czastki.push(pojawienie
          ? { x: x + los(-20, 20), y: y + los(-20, 20), vx: los(-14, 14), vy: los(-40, -14), r: los(80, 108),
              rosnie: 30, a: 0.9, t: 0.35, zycie: los(1.4, 1.9) }
          : { x: x + los(-20, 20), y: y + los(-20, 20), vx: los(-12, 12), vy: los(-30, -8), r: los(30, 50),
              rosnie: los(45, 70), a: 0.9, t: 0, zycie: 3.2 });
      }
    }
  }
  let poprzedni = performance.now();
  function klatka(t) {
    const dt = Math.min(0.05, Math.max(0, (t - poprzedni) / 1000));
    poprzedni = t;
    const c = para.ctx;
    if (para.czastki.length || para.brudne) {
      c.clearRect(0, 0, W, H);
      para.brudne = para.czastki.length > 0;
      for (let i = para.czastki.length - 1; i >= 0; i--) {
        const p = para.czastki[i];
        p.t += dt;
        if (p.t > p.zycie) { para.czastki.splice(i, 1); continue; }
        p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.rosnie * dt;
        p.vy *= 1 - 0.6 * dt; p.vx *= 1 - 0.3 * dt;
        const a = p.a * (1 - p.t / p.zycie) * Math.min(1, p.t * 5);
        const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        g.addColorStop(0, `rgba(244,245,247,${a})`);
        g.addColorStop(0.6, `rgba(244,245,247,${a * 0.55})`);
        g.addColorStop(1, 'rgba(244,245,247,0)');
        c.fillStyle = g;
        c.beginPath();
        c.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        c.fill();
      }
      if (para.czastki.length) winieta(c);
    }
    requestAnimationFrame(klatka);
  }

  const zawartoscSceny = () => [...scena.children].filter((e) => e.id !== 'para');
  let wraca = false;
  $('#wroc').addEventListener('click', () => {
    if (wraca) return;
    wraca = true;
    const cel = location.protocol === 'bezramka:' ? 'bezramka://stacja/?z=pudel' : '../stacja/index.html?z=pudel';
    if (mniejRuchu) { location.href = cel; return; }
    syk();
    klab(false);
    for (const e of zawartoscSceny()) {
      e.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 650, delay: 150, easing: 'ease-in', fill: 'forwards' });
    }
    setTimeout(() => { location.href = cel; }, 1000);
  });

  /* ============================ start ============================ */
  window.addEventListener('resize', dopasuj);
  dopasuj();
  pokaz();
  if (new URLSearchParams(location.search).get('z') === 'ciuchcia' && !mniejRuchu) {
    klab(true);
    for (const e of zawartoscSceny()) {
      e.animate([{ opacity: 0, transform: e.id === 'pudel' ? 'scale(.97)' : 'none' }, { opacity: 1, transform: 'none' }],
        { duration: 800, delay: 200, easing: 'ease-out', fill: 'backwards' });
    }
    setTimeout(() => { hau(0, 1.7); machaj(); }, 900);
  }
  requestAnimationFrame((t) => { poprzedni = t; requestAnimationFrame(klatka); });
})();
