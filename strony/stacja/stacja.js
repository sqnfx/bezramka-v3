// Stacja Ciuchciowo – życie lokomotywy: koła, dym, zegar, tablica odjazdów, kasa i dźwięki.
'use strict';

(() => {
  const W = 1200, H = 680;
  const NS = 'http://www.w3.org/2000/svg';
  const $ = (s) => document.querySelector(s);
  const scena = $('#scena');

  // Bezramka udostępnia stronie obiekt window.bezramka (z preloadu).
  const wBezramce = typeof window.bezramka === 'object' && window.bezramka !== null;
  document.documentElement.classList.toggle('w-bezramce', wBezramce);
  const mniejRuchu = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const los = (a, b) => a + Math.random() * (b - a);
  const dwa = (n) => String(n).padStart(2, '0');
  const gg = (d) => `${dwa(d.getHours())}:${dwa(d.getMinutes())}`;

  function el(tag, atr, rodzic) {
    const e = document.createElementNS(NS, tag);
    for (const k in atr) e.setAttribute(k, atr[k]);
    if (rodzic) rodzic.appendChild(e);
    return e;
  }

  /* ================= skalowanie sceny do okna ================= */
  let skala = 1;
  const plotna = [];
  function dodajPlotno(canvas, w, h, poZmianie) {
    const p = { canvas, ctx: canvas.getContext('2d'), w, h, poZmianie };
    plotna.push(p);
    return p;
  }
  function dopasuj() {
    const zapas = wBezramce ? 0 : 52;
    const s = Math.min(window.innerWidth / W, (window.innerHeight - zapas) / H);
    skala = s > 0 ? s : 1;
    const dx = (window.innerWidth - W * skala) / 2;
    const dy = Math.max(0, (window.innerHeight - zapas - H * skala) / 2);
    scena.style.transform = `translate(${dx}px, ${dy}px) scale(${skala})`;
    const r = (window.devicePixelRatio || 1) * skala;
    for (const p of plotna) {
      p.canvas.width = Math.max(1, Math.round(p.w * r));
      p.canvas.height = Math.max(1, Math.round(p.h * r));
      p.ctx.setTransform(r, 0, 0, r, 0, 0);
      if (p.poZmianie) p.poZmianie();
    }
  }

  /* ================= rysunek: podkłady, nity, koła, zegar ================= */
  const podklady = $('#podklady');
  for (let x = -46; x < W + 46; x += 46) {
    el('rect', { x, y: 637, width: 30, height: 15, rx: 2, fill: '#5E4330' }, podklady);
  }
  const nity = $('#nity');
  for (let y = 232; y <= 430; y += 18) el('circle', { cx: 955, cy: y, r: 2.3, fill: '#5A5F67' }, nity);

  const CZERWIEN = '#B3261E', CZERWIEN_CIEMNA = '#86201A';
  const KORBA = 30;            // promień wykorbienia
  const R_NAPEDU = 82;         // promień kół napędnych
  const KOLA = [
    { cx: 215, cy: 576, r: 52, szprychy: 11 },
    { cx: 420, cy: 546, r: 82, szprychy: 15, naped: true },
    { cx: 600, cy: 546, r: 82, szprychy: 15, naped: true },
    { cx: 780, cy: 546, r: 82, szprychy: 15, naped: true },
    { cx: 975, cy: 582, r: 46, szprychy: 9 },
  ];
  const biegun = (r, stopnie) => {
    const a = stopnie * Math.PI / 180;
    return `${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`;
  };
  const warstwaKol = $('#kola');
  for (const k of KOLA) {
    const g = el('g', { transform: `translate(${k.cx} ${k.cy})` }, warstwaKol);
    el('circle', { r: k.r - 4, fill: 'none', stroke: '#2E3136', 'stroke-width': 8 }, g);
    const obr = el('g', {}, g);
    k.obr = obr;
    el('circle', { r: k.r - 11, fill: 'none', stroke: CZERWIEN, 'stroke-width': 7 }, obr);
    const piasta = k.r * 0.22;
    for (let i = 0; i < k.szprychy; i++) {
      const a = (i / k.szprychy) * 360;
      el('line', {
        x1: biegun(piasta, a).split(' ')[0], y1: biegun(piasta, a).split(' ')[1],
        x2: biegun(k.r - 12, a).split(' ')[0], y2: biegun(k.r - 12, a).split(' ')[1],
        stroke: CZERWIEN, 'stroke-width': k.r > 60 ? 6 : 5, 'stroke-linecap': 'round',
      }, obr);
    }
    if (k.naped) {
      // przeciwwaga po przeciwnej stronie niż korba
      const z = k.r - 13;
      el('path', {
        d: `M ${biegun(z, 140)} A ${z} ${z} 0 0 1 ${biegun(z, 220)} Q ${biegun(k.r * 0.34, 180)} ${biegun(z, 140)} Z`,
        fill: CZERWIEN_CIEMNA,
      }, obr);
    }
    el('circle', { r: piasta, fill: CZERWIEN }, obr);
    el('circle', { r: 6.5, fill: '#5B6168' }, obr);
    if (k.naped) el('circle', { cx: KORBA, cy: 0, r: 8, fill: '#9AA1A9', stroke: '#5B6168', 'stroke-width': 2 }, obr);
  }

  const zegarG = $('#zegar');
  el('circle', { r: 57, fill: '#F7F6F0', stroke: '#23262B', 'stroke-width': 4 }, zegarG);
  for (let i = 0; i < 60; i++) {
    const gruby = i % 5 === 0;
    el('rect', {
      x: gruby ? -2.2 : -0.8, y: -51, width: gruby ? 4.4 : 1.6, height: gruby ? 12 : 4.5,
      fill: '#1D1F22', transform: `rotate(${i * 6})`,
    }, zegarG);
  }
  const wskGodz = el('rect', { x: -3.6, y: -31, width: 7.2, height: 41, fill: '#1D1F22' }, zegarG);
  const wskMin = el('rect', { x: -2.7, y: -46, width: 5.4, height: 58, fill: '#1D1F22' }, zegarG);
  const wskSek = el('g', {}, zegarG);
  el('line', { x1: 0, y1: 14, x2: 0, y2: -33, stroke: '#C4231B', 'stroke-width': 1.8 }, wskSek);
  el('circle', { cy: -34, r: 5.2, fill: '#C4231B' }, wskSek);
  el('circle', { r: 2.6, fill: '#C4231B' }, zegarG);

  // Zegar dworcowy: wskazówka sekundowa obiega tarczę w 58,5 s i czeka na pełną minutę.
  function ustawZegar() {
    const d = new Date();
    const ms = d.getSeconds() * 1000 + d.getMilliseconds();
    const s = mniejRuchu ? d.getSeconds() * 6 : Math.min(360, (ms / 58500) * 360);
    const m = d.getMinutes();
    const h = (d.getHours() % 12) + m / 60;
    wskGodz.setAttribute('transform', `rotate(${h * 30})`);
    wskMin.setAttribute('transform', `rotate(${m * 6})`);
    wskSek.setAttribute('transform', `rotate(${s})`);
  }

  const dragSprz = $('#drag-sprzegajacy');
  const korbowod = $('#korbowod');
  const wodzik = $('#wodzik');
  const tloczysko = $('#tloczysko');
  const DL_KORBOWODU = 250;
  function ustawKola(t) {
    for (const k of KOLA) {
      k.obr.setAttribute('transform', `rotate(${((t * R_NAPEDU) / k.r) * (180 / Math.PI)})`);
    }
    const kx = KORBA * Math.cos(t), ky = KORBA * Math.sin(t);
    dragSprz.setAttribute('transform', `translate(${kx.toFixed(2)} ${ky.toFixed(2)})`);
    const px = 600 + kx, py = 546 + ky;
    const dy = 506 - py;
    const xc = px + Math.sqrt(Math.max(0, DL_KORBOWODU * DL_KORBOWODU - dy * dy));
    korbowod.setAttribute('x1', px.toFixed(2));
    korbowod.setAttribute('y1', py.toFixed(2));
    korbowod.setAttribute('x2', xc.toFixed(2));
    wodzik.setAttribute('x', (xc - 17).toFixed(2));
    tloczysko.setAttribute('x1', (xc + 17).toFixed(2));
  }

  /* ================= rozkład jazdy (ten sam przez cały dzień) ================= */
  const KIERUNKI = [
    { cel: 'Zakopane', km: 412 },
    { cel: 'Hel', km: 388 },
    { cel: 'Krynica-Zdrój', km: 361 },
    { cel: 'Łeba', km: 297 },
    { cel: 'Żywiec', km: 274 },
    { cel: 'Sopot', km: 322 },
    { cel: 'Białowieża', km: 205 },
    { cel: 'Ustrzyki Dolne', km: 340 },
    { cel: 'Gniezno', km: 118 },
    { cel: 'Szklarska Poręba', km: 310 },
  ];
  const PORZADKOWE = { 1: 'pierwszego', 2: 'drugiego', 3: 'trzeciego' };

  function losowacz(ziarno) {
    let s = ziarno >>> 0;
    return () => {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }
  const rozklady = new Map();
  function rozkladNa(dzien) {
    const klucz = `${dzien.getFullYear()}-${dzien.getMonth() + 1}-${dzien.getDate()}`;
    if (rozklady.has(klucz)) return rozklady.get(klucz);
    const l = losowacz(dzien.getFullYear() * 1000 + (dzien.getMonth() + 1) * 40 + dzien.getDate());
    const pociagi = [];
    let minuta = 4 * 60 + 30 + Math.floor(l() * 20);
    let poprzedni = -1;
    while (minuta < 24 * 60) {
      let i;
      do { i = Math.floor(l() * KIERUNKI.length); } while (i === poprzedni);
      poprzedni = i;
      const opozn = l() < 0.22 ? [5, 10, 15, 20][Math.floor(l() * 4)] : 0;
      pociagi.push({
        id: `${klucz}/${pociagi.length}`,
        ...KIERUNKI[i],
        tor: 1 + Math.floor(l() * 3),
        opozn,
        odjazd: new Date(dzien.getFullYear(), dzien.getMonth(), dzien.getDate(), 0, minuta),
      });
      minuta += 14 + Math.floor(l() * 28);
    }
    rozklady.set(klucz, pociagi);
    return pociagi;
  }
  const kursy = new Map();
  function nastepne(teraz, ile) {
    const dzis = new Date(teraz.getFullYear(), teraz.getMonth(), teraz.getDate());
    const jutro = new Date(dzis.getFullYear(), dzis.getMonth(), dzis.getDate() + 1);
    const wynik = [];
    for (const p of [...rozkladNa(dzis), ...rozkladNa(jutro)]) {
      if (p.odjazd.getTime() + p.opozn * 60000 > teraz.getTime()) {
        wynik.push(p);
        kursy.set(p.id, p);
        if (wynik.length >= ile) break;
      }
    }
    return wynik;
  }

  /* ================= tablica z diodami ================= */
  const LED = { kol: 208, rz: 11, krok: 2.5, r: 0.98 };
  const FONT_LED = 'bold 9px Verdana, "DejaVu Sans", Tahoma, Arial, sans-serif';
  const BAZA_LED = 8;
  const tab = dodajPlotno($('#tablica'), 520, 110, () => { tloLed = null; });
  let tloLed = null;

  function narysujTloLed() {
    const c = document.createElement('canvas');
    c.width = tab.canvas.width;
    c.height = tab.canvas.height;
    const x = c.getContext('2d');
    const r = c.width / 520;
    x.setTransform(r, 0, 0, r, 0, 0);
    x.fillStyle = 'rgba(255, 170, 40, 0.09)';
    x.beginPath();
    for (let w = 0; w < LED.rz * 4; w++) {
      for (let k = 0; k < LED.kol; k++) {
        const cx = (k + 0.5) * LED.krok, cy = (w + 0.5) * LED.krok;
        x.moveTo(cx + LED.r, cy);
        x.arc(cx, cy, LED.r, 0, Math.PI * 2);
      }
    }
    x.fill();
    tloLed = c;
  }

  const raster = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  function zmierz(t) {
    raster.font = FONT_LED;
    return Math.ceil(raster.measureText(t).width);
  }
  // Rysuje tekst zwykłą czcionką w rozdzielczości „1 piksel = 1 dioda” i zamienia go na mapę zapalonych diod.
  function rastruj(szer, rysuj) {
    raster.canvas.width = szer;
    raster.canvas.height = LED.rz;
    raster.font = FONT_LED;
    raster.fillStyle = '#fff';
    raster.textBaseline = 'alphabetic';
    rysuj(raster);
    const d = raster.getImageData(0, 0, szer, LED.rz).data;
    const bity = new Uint8Array(szer * LED.rz);
    for (let i = 0; i < bity.length; i++) bity[i] = d[i * 4 + 3] > 110 ? 1 : 0;
    return { w: szer, bity };
  }
  function wierszOdjazdu(p, pokazOpozn) {
    return rastruj(LED.kol, (x) => {
      x.textAlign = 'left';
      x.fillText(gg(p.odjazd), 1, BAZA_LED);
      x.save();
      x.beginPath();
      x.rect(37, 0, 130, LED.rz);
      x.clip();
      x.fillText(pokazOpozn ? `opóźniony ${p.opozn} min` : p.cel, 37, BAZA_LED);
      x.restore();
      x.textAlign = 'right';
      x.fillText(`tor ${p.tor}`, LED.kol - 1, BAZA_LED);
    });
  }

  const linie = [null, null, null];
  const klucze = ['', '', ''];
  const odslona = [-0.2, -0.55, -0.9]; // rozbłysk wierszy po kolei przy wczytaniu
  const ticker = { maska: null, off: 0, zapowiedz: false };

  function ustawTicker(tekst, zapowiedz = false) {
    ticker.maska = rastruj(zmierz(tekst) + 8, (x) => x.fillText(tekst, 0, BAZA_LED));
    ticker.off = mniejRuchu ? 0 : -LED.kol;
    ticker.zapowiedz = zapowiedz;
  }
  function tekstTickera() {
    const czesci = ['Witamy na stacji Ciuchciowo.'];
    for (const p of nastepne(new Date(), 2)) {
      czesci.push(`Pociąg do stacji ${p.cel} odjedzie z toru ${p.tor} o godz. ${gg(p.odjazd)}.` +
        (p.opozn ? ` Opóźnienie ${p.opozn} min.` : ''));
    }
    czesci.push('W kasie biletowej kupisz też bilet tam, gdzie świeci słońce.');
    czesci.push('Prosimy nie zbliżać się do krawędzi peronu.');
    return czesci.join('      ');
  }

  const wybor = $('#kasa-kurs');
  const listaSR = $('#odjazdy-lista');
  let ostatniZestaw = '';
  function odswiezOdjazdy() {
    const teraz = new Date();
    const najblizsze = nastepne(teraz, 6);
    const migaj = Math.floor(teraz.getTime() / 2600) % 2 === 1;
    for (let i = 0; i < 3; i++) {
      const p = najblizsze[i];
      const op = Boolean(p && p.opozn && migaj);
      const klucz = p ? `${p.id}|${op}` : '-';
      if (klucz !== klucze[i]) {
        klucze[i] = klucz;
        linie[i] = p ? wierszOdjazdu(p, op) : null;
        if (odslona[i] >= 1) odslona[i] = 0;
      }
    }
    const zestaw = najblizsze.map((p) => p.id).join(',');
    if (zestaw !== ostatniZestaw) {
      ostatniZestaw = zestaw;
      const zaznaczony = wybor.value;
      wybor.replaceChildren(...najblizsze.map((p) => new Option(`${gg(p.odjazd)} ${p.cel}`, p.id)),
        new Option('Tam, gdzie świeci słońce', 'slonce'));
      if (zaznaczony === 'slonce' || najblizsze.some((p) => p.id === zaznaczony)) wybor.value = zaznaczony;
      listaSR.replaceChildren(...najblizsze.slice(0, 3).map((p) => {
        const li = document.createElement('li');
        li.textContent = `${gg(p.odjazd)} ${p.cel}, tor ${p.tor}${p.opozn ? `, opóźniony ${p.opozn} min` : ''}`;
        return li;
      }));
    }
  }

  function rysujTablice(dt) {
    if (!tloLed) narysujTloLed();
    const c = tab.ctx;
    c.clearRect(0, 0, 520, 110);
    c.drawImage(tloLed, 0, 0, 520, 110);
    const zapalone = [];
    for (let i = 0; i < 3; i++) {
      odslona[i] = Math.min(1, odslona[i] + dt * 2.4);
      const L = linie[i];
      if (!L || odslona[i] <= 0) continue;
      const zakres = Math.floor(odslona[i] * LED.kol);
      for (let w = 0; w < LED.rz; w++) {
        for (let k = 0; k < zakres; k++) if (L.bity[w * L.w + k]) zapalone.push(k, i * LED.rz + w);
      }
    }
    const M = ticker.maska;
    if (M) {
      const off = Math.floor(ticker.off);
      for (let k = 0; k < LED.kol; k++) {
        const s = off + k;
        if (s < 0 || s >= M.w) continue;
        for (let w = 0; w < LED.rz; w++) if (M.bity[w * M.w + s]) zapalone.push(k, 3 * LED.rz + w);
      }
    }
    const kropki = (promien) => {
      c.beginPath();
      for (let j = 0; j < zapalone.length; j += 2) {
        const x = (zapalone[j] + 0.5) * LED.krok, y = (zapalone[j + 1] + 0.5) * LED.krok;
        c.moveTo(x + promien, y);
        c.arc(x, y, promien, 0, Math.PI * 2);
      }
      c.fill();
    };
    c.fillStyle = 'rgba(255, 166, 30, 0.2)';
    kropki(1.75);
    c.fillStyle = '#FFBC3D';
    kropki(LED.r);
  }

  /* ================= dźwięki (syntezowane, bez plików) ================= */
  let ac = null, szumBufor = null;
  function audio() {
    try {
      if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
    } catch { ac = null; }
    return ac;
  }
  function szum(a) {
    if (szumBufor) return szumBufor;
    const n = a.sampleRate * 2;
    szumBufor = a.createBuffer(1, n, a.sampleRate);
    const d = szumBufor.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return szumBufor;
  }
  function zrodloSzumu(a, t, dl) {
    const s = a.createBufferSource();
    s.buffer = szum(a);
    s.start(t, Math.random() * 1.2);
    s.stop(t + dl);
    return s;
  }
  function gwizd(dlugosc = 1.4) {
    const a = audio(); if (!a) return;
    const t = a.currentTime + 0.01;
    const wy = a.createGain();
    wy.connect(a.destination);
    wy.gain.setValueAtTime(0.0001, t);
    wy.gain.exponentialRampToValueAtTime(0.2, t + 0.08);
    wy.gain.setValueAtTime(0.2, t + dlugosc - 0.35);
    wy.gain.exponentialRampToValueAtTime(0.0001, t + dlugosc);
    for (const f of [523.25, 659.25, 783.99]) {
      const o = a.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(f * 0.94, t);
      o.frequency.exponentialRampToValueAtTime(f, t + 0.12);
      const g = a.createGain();
      g.gain.value = 0.28;
      o.connect(g).connect(wy);
      o.start(t);
      o.stop(t + dlugosc + 0.05);
      const bp = a.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 16;
      zrodloSzumu(a, t, dlugosc + 0.05).connect(bp).connect(wy);
    }
  }
  function sapniecie(sila) {
    const a = audio(); if (!a) return;
    const t = a.currentTime;
    const f = a.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 800 + 700 * sila;
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16 * (0.4 + 0.6 * sila), t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
    zrodloSzumu(a, t, 0.26).connect(f).connect(g).connect(a.destination);
  }
  function syk() {
    const a = audio(); if (!a) return;
    const t = a.currentTime;
    const f = a.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = 2500;
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.09, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    zrodloSzumu(a, t, 1.7).connect(f).connect(g).connect(a.destination);
  }
  function gong() {
    const a = audio(); if (!a) return 0;
    const t0 = a.currentTime + 0.02;
    [783.99, 659.25, 523.25].forEach((f, i) => {
      const t = t0 + i * 0.42;
      for (const [mn, amp] of [[1, 1], [2.01, 0.22], [3.02, 0.07]]) {
        const o = a.createOscillator();
        o.frequency.value = f * mn;
        const g = a.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.15 * amp, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
        o.connect(g).connect(a.destination);
        o.start(t);
        o.stop(t + 1.7);
      }
    });
    return 1.7;
  }
  function trzask(glosnosc = 1) {
    const a = audio(); if (!a) return;
    const t = a.currentTime;
    const o = a.createOscillator();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(55, t + 0.09);
    const g = a.createGain();
    g.gain.setValueAtTime(0.25 * glosnosc, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(g).connect(a.destination);
    o.start(t); o.stop(t + 0.13);
    const f = a.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = 2800;
    const g2 = a.createGain();
    g2.gain.setValueAtTime(0.18 * glosnosc, t);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    zrodloSzumu(a, t, 0.05).connect(f).connect(g2).connect(a.destination);
  }
  function hau(opoznienie = 0, wysokosc = 1) {
    const a = audio(); if (!a) return;
    const t = a.currentTime + 0.01 + opoznienie;
    const o = a.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(420 * wysokosc, t);
    o.frequency.exponentialRampToValueAtTime(720 * wysokosc, t + 0.03);
    o.frequency.exponentialRampToValueAtTime(250 * wysokosc, t + 0.17);
    const f = a.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 1100 * wysokosc; f.Q.value = 1.1;
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.4, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(f).connect(g).connect(a.destination);
    o.start(t);
    o.stop(t + 0.21);
    const fs = a.createBiquadFilter();
    fs.type = 'bandpass'; fs.frequency.value = 1800 * wysokosc; fs.Q.value = 0.8;
    const gs = a.createGain();
    gs.gain.setValueAtTime(0.0001, t);
    gs.gain.exponentialRampToValueAtTime(0.12, t + 0.01);
    gs.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    zrodloSzumu(a, t, 0.13).connect(fs).connect(gs).connect(a.destination);
  }
  function drukarka() {
    const a = audio(); if (!a) return;
    const t0 = a.currentTime;
    for (let i = 0; i < 12; i++) {
      const t = t0 + i * 0.06;
      const f = a.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = 1900; f.Q.value = 3;
      const g = a.createGain();
      g.gain.setValueAtTime(0.12, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
      zrodloSzumu(a, t, 0.04).connect(f).connect(g).connect(a.destination);
    }
  }

  // Zapowiedź głosowa – tylko jeśli system ma polski głos; inaczej sam gong i tekst na tablicy.
  if ('speechSynthesis' in window) window.speechSynthesis.getVoices();
  function mow(tekst, koniec) {
    const s = window.speechSynthesis;
    const glos = s && s.getVoices().find((g) => /^pl([-_]|$)/i.test(g.lang));
    if (!glos) { setTimeout(koniec, 4000); return; }
    const u = new SpeechSynthesisUtterance(tekst);
    u.voice = glos;
    u.lang = glos.lang;
    u.rate = 0.97;
    u.onend = koniec;
    u.onerror = koniec;
    s.cancel();
    s.speak(u);
  }

  /* ================= dym i para ================= */
  const dym = dodajPlotno($('#dym'), W, H);
  const czastki = [];
  function puf(o, limit = 80) {
    if (czastki.length > limit) czastki.shift();
    czastki.push({ t: 0, kolor: [222, 224, 227], ...o });
  }
  function pufKomin(sila) {
    puf({
      x: 990 + los(-4, 4), y: 104,
      vx: -30 - 150 * sila + los(-10, 10), vy: -75 - 40 * sila,
      r: 12 + 6 * sila, rosnie: 26 + 22 * sila, a: 0.24 + 0.1 * sila, zycie: 2.6,
    });
  }
  function paraZGwizdka() {
    for (let i = 0; i < 7; i++) {
      puf({
        x: 370 + los(-3, 3), y: 160, vx: los(-25, 10), vy: -95 - los(0, 45),
        r: 5, rosnie: 34, a: 0.34, zycie: 1.3, kolor: [250, 250, 252],
      });
    }
  }
  // Kłąb pary zakrywający całą lokomotywę (przemiana w pudla i powrót).
  function klab(pojawienie) {
    for (let y = 170; y <= 600; y += 72) {
      for (let x = 70; x <= 1110; x += 78) {
        puf(pojawienie
          ? { x: x + los(-20, 20), y: y + los(-20, 20), vx: los(-14, 14), vy: los(-40, -14), r: los(80, 108),
              rosnie: 30, a: 0.9, t: 0.35, zycie: los(1.4, 1.9), kolor: [244, 245, 247] }
          : { x: x + los(-20, 20), y: y + los(-20, 20), vx: los(-12, 12), vy: los(-30, -8), r: los(30, 50),
              rosnie: los(45, 70), a: 0.9, zycie: 3.2, kolor: [244, 245, 247] }, 400);
      }
    }
  }
  function aktualizujDym(dt) {
    for (let i = czastki.length - 1; i >= 0; i--) {
      const p = czastki[i];
      p.t += dt;
      if (p.t > p.zycie) { czastki.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy *= 1 - 0.6 * dt;
      p.vx *= 1 - 0.3 * dt;
      p.r += p.rosnie * dt;
    }
  }
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
  function rysujDym() {
    const c = dym.ctx;
    c.clearRect(0, 0, W, H);
    for (const p of czastki) {
      const a = p.a * (1 - p.t / p.zycie) * Math.min(1, p.t * 5);
      const [r, g, b] = p.kolor;
      const gr = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      gr.addColorStop(0, `rgba(${r},${g},${b},${a})`);
      gr.addColorStop(0.6, `rgba(${r},${g},${b},${a * 0.55})`);
      gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
      c.fillStyle = gr;
      c.beginPath();
      c.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      c.fill();
    }
    if (czastki.length) winieta(c);
  }

  /* ================= sterowanie ================= */
  let jedzie = false;
  const przyciskLizak = $('#przycisk-lizak');
  przyciskLizak.addEventListener('click', () => {
    jedzie = !jedzie;
    scena.classList.toggle('jazda', jedzie);
    przyciskLizak.setAttribute('aria-pressed', String(jedzie));
    przyciskLizak.dataset.podpis = jedzie ? 'Stop' : 'Odjazd';
    przyciskLizak.setAttribute('aria-label', jedzie ? 'Stop: zatrzymaj lokomotywę' : 'Odjazd: pokaż lizak i rusz lokomotywę');
    if (jedzie) { gwizd(0.8); paraZGwizdka(); } else { syk(); }
  });

  let czasGwizdu = 0;
  $('#przycisk-gwizdek').addEventListener('click', () => {
    gwizd(1.4);
    paraZGwizdka();
    scena.classList.add('gwizdze');
    clearTimeout(czasGwizdu);
    czasGwizdu = setTimeout(() => scena.classList.remove('gwizdze'), 1200);
  });

  const przyciskReflektor = $('#przycisk-reflektor');
  przyciskReflektor.addEventListener('click', () => {
    const wl = scena.classList.toggle('swiatlo');
    przyciskReflektor.setAttribute('aria-pressed', String(wl));
    trzask(0.5);
  });

  let mowiTeraz = false;
  $('#przycisk-megafon').addEventListener('click', () => {
    if (mowiTeraz) return;
    const p = nastepne(new Date(), 1)[0];
    const tekst = p
      ? `Pociąg osobowy do stacji ${p.cel} odjedzie z toru ${PORZADKOWE[p.tor]} przy peronie pierwszym. ` +
        `Planowy odjazd pociągu, godzina ${gg(p.odjazd)}.` +
        (p.opozn ? ` Pociąg jest opóźniony o około ${p.opozn} minut. Opóźnienie może ulec zmianie.` : '') +
        ' Prosimy zachować ostrożność.'
      : 'Do rana nie ma już odjazdów. Zapraszamy jutro.';
    mowiTeraz = true;
    ustawTicker(tekst, true);
    scena.classList.add('mowi');
    const czekaj = gong();
    setTimeout(() => mow(tekst, () => { mowiTeraz = false; scena.classList.remove('mowi'); }), czekaj * 1000);
  });

  /* ================= maszynista: przemiana w pudla ================= */
  const przyciskPies = $('#przycisk-maszynista');
  const zawartoscSceny = () => [...scena.children].filter((e) => e.id !== 'dym');
  let przemiana = false;

  const patrzy = (tak) => scena.classList.toggle('pies-patrzy', tak);
  przyciskPies.addEventListener('mouseenter', () => patrzy(true));
  przyciskPies.addEventListener('mouseleave', () => patrzy(false));
  przyciskPies.addEventListener('focus', () => patrzy(true));
  przyciskPies.addEventListener('blur', () => patrzy(false));

  function szczeknij(opoznienieMs) {
    setTimeout(() => scena.classList.add('szczeka'), opoznienieMs);
    setTimeout(() => scena.classList.remove('szczeka'), opoznienieMs + 170);
  }

  // Przemiana lokomotywy w inną stronę (pudel, słońce): kłąb pary, potem nowa strona.
  function przemien(strona, wstep) {
    if (przemiana) return;
    przemiana = true;
    scena.classList.remove('pokaz-podpisy');
    const opoznienie = wstep();
    const cel = location.protocol === 'bezramka:' ? `bezramka://${strona}/?z=ciuchcia` : `../${strona}/index.html?z=ciuchcia`;
    if (mniejRuchu) { setTimeout(() => { location.href = cel; }, 500); return; }
    setTimeout(() => {
      syk();
      klab(false);
      for (const e of zawartoscSceny()) {
        e.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 650, delay: 150, easing: 'ease-in', fill: 'forwards' });
      }
    }, opoznienie);
    setTimeout(() => { location.href = cel; }, opoznienie + 980);
  }

  przyciskPies.addEventListener('click', () => przemien('pudel', () => {
    hau(0);
    hau(0.24);
    szczeknij(0);
    szczeknij(240);
    return 520;
  }));

  /* ================= kasa i bilet ================= */
  const bilet = $('#bilet');
  const rada = $('#b-rada');
  let stanBiletu = 'brak';
  let numer = 4200;
  try { numer = parseInt(localStorage.getItem('ciuchciowo-bilety') || '4200', 10) || 4200; } catch { /* bez pamięci */ }

  function drukujBilet(p) {
    numer += 1;
    try { localStorage.setItem('ciuchciowo-bilety', String(numer)); } catch { /* bez pamięci */ }
    $('#b-cel').textContent = p.cel;
    $('#b-czas').textContent = gg(p.odjazd);
    $('#b-tor').textContent = p.tor;
    $('#b-cena').textContent = `${(2.4 + p.km * 0.006).toFixed(2).replace('.', ',')} zł`;
    $('#b-nr').textContent = `Nr ${String(numer).padStart(6, '0')}`;
    rada.textContent = 'Kliknij bilet, żeby go skasować';
    bilet.className = 'widoczny';
    bilet.tabIndex = 0;
    bilet.setAttribute('aria-label', `Bilet do stacji ${p.cel}, odjazd ${gg(p.odjazd)}. Naciśnij, żeby skasować.`);
    void bilet.offsetWidth; // start animacji od pozycji schowanej
    bilet.classList.add('wydruk');
    stanBiletu = 'wydrukowany';
    drukarka();
  }

  $('#kasa').addEventListener('submit', (e) => {
    e.preventDefault();
    if (wybor.value === 'slonce') {
      // bilet do słońca: lokomotywa gwiżdże i zamienia się w słońce, które szuka najbliższego słońca
      przemien('slonce', () => { gwizd(0.9); paraZGwizdka(); return 650; });
      return;
    }
    const p = kursy.get(wybor.value) || nastepne(new Date(), 1)[0];
    if (!p) return;
    if (stanBiletu !== 'brak') {
      bilet.className = '';
      setTimeout(() => drukujBilet(p), 60);
    } else {
      drukujBilet(p);
    }
  });

  function obsluzBilet() {
    if (stanBiletu === 'wydrukowany') {
      const d = new Date();
      $('#b-stempel').textContent =
        `${dwa(d.getDate())}.${dwa(d.getMonth() + 1)}.${String(d.getFullYear()).slice(2)} ${gg(d)}`;
      bilet.classList.add('skasowany');
      rada.textContent = 'Kliknij, żeby zabrać bilet';
      bilet.setAttribute('aria-label', 'Bilet skasowany. Naciśnij, żeby go zabrać.');
      stanBiletu = 'skasowany';
      trzask(1);
    } else if (stanBiletu === 'skasowany') {
      stanBiletu = 'odlatuje';
      bilet.classList.add('odlot');
      setTimeout(() => {
        bilet.className = '';
        bilet.tabIndex = -1;
        stanBiletu = 'brak';
      }, 720);
    }
  }
  bilet.addEventListener('click', obsluzBilet);
  bilet.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); obsluzBilet(); }
  });

  /* ================= pętla animacji ================= */
  const OMEGA_MAX = 2 * Math.PI * 0.85;
  let teta = 0.7, omega = 0, przesuniecieToru = 0, cwiartka = 0;
  let doPufu = 0.8, doOdjazdow = 0, poprzedni = performance.now();

  function klatka(t) {
    const dt = Math.min(0.05, Math.max(0, (t - poprzedni) / 1000));
    poprzedni = t;

    const cel = jedzie ? OMEGA_MAX : 0;
    omega += (cel - omega) * Math.min(1, dt * (jedzie ? 0.55 : 0.9));
    if (!jedzie && omega < 0.03) omega = 0;
    teta += omega * dt;
    ustawKola(teta);
    przesuniecieToru = (przesuniecieToru + omega * R_NAPEDU * dt) % 46;
    podklady.setAttribute('transform', `translate(${(-przesuniecieToru).toFixed(2)} 0)`);

    const c = Math.floor(teta / (Math.PI / 2));
    if (c !== cwiartka) {
      cwiartka = c;
      if (omega > 0.4) {
        const sila = omega / OMEGA_MAX;
        sapniecie(sila);
        pufKomin(sila);
      }
    }
    if (!mniejRuchu && omega < 0.4) {
      doPufu -= dt;
      if (doPufu <= 0) {
        doPufu = los(1.4, 2.2);
        puf({ x: 990 + los(-3, 3), y: 106, vx: los(-14, 2), vy: -28, r: 9, rosnie: 15, a: 0.17, zycie: 4 });
      }
    }
    aktualizujDym(dt);
    rysujDym();
    ustawZegar();

    doOdjazdow -= dt;
    if (doOdjazdow <= 0) { doOdjazdow = 0.5; odswiezOdjazdy(); }
    if (ticker.maska) {
      if (!mniejRuchu) ticker.off += dt * 38;
      if (ticker.off > ticker.maska.w) {
        if (ticker.zapowiedz && mowiTeraz) ticker.off = -LED.kol;
        else ustawTicker(tekstTickera());
      }
    }
    rysujTablice(dt);
    requestAnimationFrame(klatka);
  }

  /* ================= start ================= */
  window.addEventListener('resize', dopasuj);
  dopasuj();
  ustawKola(teta);
  odswiezOdjazdy();
  ustawTicker(tekstTickera());
  requestAnimationFrame((t) => { poprzedni = t; requestAnimationFrame(klatka); });
  // Powrót od pudla albo od słońca: lokomotywa wyłania się z pary.
  if (['pudel', 'slonce'].includes(new URLSearchParams(location.search).get('z'))) {
    scena.classList.remove('pokaz-podpisy');
    if (!mniejRuchu) {
      klab(true);
      for (const e of zawartoscSceny()) {
        e.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 750, delay: 200, easing: 'ease-out', fill: 'backwards' });
      }
    }
  } else {
    setTimeout(() => scena.classList.remove('pokaz-podpisy'), 3800);
  }
})();
