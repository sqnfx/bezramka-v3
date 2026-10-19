// Gdzie słońce świeci? Szuka najbliższego miejsca, w którym w tej chwili świeci słońce.
// Pogoda: Open-Meteo (bieżące warunki z modeli pogodowych), miejscowości: GeoNames, kontury: Natural Earth.
'use strict';

(() => {
  const W = 1200, H = 680;
  const NS = 'http://www.w3.org/2000/svg';
  const $ = (s) => document.querySelector(s);
  const scena = $('#scena');
  const wBezramce = typeof window.bezramka === 'object' && window.bezramka !== null;
  document.documentElement.classList.toggle('w-bezramce', wBezramce);
  const mniejRuchu = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const los = (a, b) => a + Math.random() * (b - a);

  function el(tag, atr, rodzic) {
    const e = document.createElementNS(NS, tag);
    for (const k in atr) e.setAttribute(k, atr[k]);
    if (rodzic) rodzic.appendChild(e);
    return e;
  }

  /* ============================ rysunek: promienie ============================ */
  const SRODEK = { x: 600, y: 296 };
  (() => {
    const g = $('#promienie');
    const blask = el('filter', { id: 'f-blask', x: '-20%', y: '-20%', width: '140%', height: '140%' }, $('#slonce defs'));
    el('feGaussianBlur', { stdDeviation: 14 }, blask);
    el('circle', { cx: SRODEK.x, cy: SRODEK.y, r: 252, fill: '#FFCF4A', opacity: 0.32, filter: 'url(#f-blask)', class: 'ozdoba' }, g);
    const n = 16;
    for (let i = 0; i < n; i++) {
      const kat = (i / n) * Math.PI * 2 - Math.PI / 2;
      const dlugi = i % 2 === 0;
      const zew = dlugi ? 292 : 262, wew = 226, pol = (dlugi ? 7.5 : 6.5) * Math.PI / 180;
      const p = (r, k) => `${(SRODEK.x + r * Math.cos(k)).toFixed(1)} ${(SRODEK.y + r * Math.sin(k)).toFixed(1)}`;
      el('path', {
        d: `M${p(wew, kat - pol)} Q ${p((wew + zew) / 2, kat - pol * 0.35)} ${p(zew, kat)} Q ${p((wew + zew) / 2, kat + pol * 0.35)} ${p(wew, kat + pol)} Z`,
        fill: 'url(#g-promien)', stroke: '#FFA21E', 'stroke-width': 5, 'stroke-linejoin': 'round',
      }, g);
    }
  })();

  /* ============================ skalowanie ============================ */
  const radar = { canvas: $('#radar'), ctx: $('#radar').getContext('2d'), w: 380, h: 380 };
  const para = { canvas: $('#para'), ctx: $('#para').getContext('2d'), czastki: [], brudne: false };
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
    for (const [p, w, h] of [[radar, 380, 380], [para, W, H]]) {
      p.canvas.width = Math.max(1, Math.round(w * r));
      p.canvas.height = Math.max(1, Math.round(h * r));
      p.ctx.setTransform(r, 0, 0, r, 0, 0);
    }
    brudny = true;
  }

  /* ============================ geografia ============================ */
  const RAD = Math.PI / 180, R_ZIEMI = 6371;
  const MIEJSCA = (window.MIEJSCOWOSCI || []).map(([nazwa, la, lo, kraj, poziom], ranga) =>
    ({ nazwa, lat: la / 100, lon: lo / 100, kraj, poziom, ranga }));

  function odleglosc(a, b) {
    const f1 = a.lat * RAD, f2 = b.lat * RAD, df = (b.lat - a.lat) * RAD, dl = (b.lon - a.lon) * RAD;
    const h = Math.sin(df / 2) ** 2 + Math.cos(f1) * Math.cos(f2) * Math.sin(dl / 2) ** 2;
    return 2 * R_ZIEMI * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  function azymut(a, b) {
    const f1 = a.lat * RAD, f2 = b.lat * RAD, dl = (b.lon - a.lon) * RAD;
    const y = Math.sin(dl) * Math.cos(f2);
    const x = Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl);
    return (Math.atan2(y, x) / RAD + 360) % 360;
  }
  // Rzut azymutalny równoodległy: odległości od środka są prawdziwe. Wynik w km (y na północ).
  function rzut(srodek, lat, lon) {
    const f0 = srodek.lat * RAD, f = lat * RAD, dl = (lon - srodek.lon) * RAD;
    const cosc = Math.sin(f0) * Math.sin(f) + Math.cos(f0) * Math.cos(f) * Math.cos(dl);
    const c = Math.acos(Math.max(-1, Math.min(1, cosc)));
    if (c > 0.93 * Math.PI) return null;
    const k = c < 1e-9 ? 1 : c / Math.sin(c);
    return {
      x: R_ZIEMI * k * Math.cos(f) * Math.sin(dl),
      y: R_ZIEMI * k * (Math.cos(f0) * Math.sin(f) - Math.sin(f0) * Math.cos(f) * Math.cos(dl)),
    };
  }
  // Wysokość słońca nad horyzontem w stopniach (przybliżenie astronomiczne, dokładność ok. 1°).
  function wysokoscSlonca(lat, lon, data) {
    const d = data.getTime() / 86400000 - 10957.5;
    const g = (357.529 + 0.98560028 * d) * RAD;
    const q = 280.459 + 0.98564736 * d;
    const L = (q + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * RAD;
    const e = (23.439 - 0.00000036 * d) * RAD;
    const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L));
    const dek = Math.asin(Math.sin(e) * Math.sin(L));
    const gmst = ((18.697374558 + 24.06570982441908 * d) % 24) * 15 * RAD;
    const kg = gmst + lon * RAD - ra;
    const f = lat * RAD;
    return Math.asin(Math.sin(f) * Math.sin(dek) + Math.cos(f) * Math.cos(dek) * Math.cos(kg)) / RAD;
  }

  /* ============================ pobieranie ============================ */
  // W Bezramce zapytania idą przez program (bez ograniczeń CORS), w zwykłej przeglądarce wprost.
  async function pobierz(url) {
    if (wBezramce && typeof window.bezramka.pobierz === 'function') {
      const o = await window.bezramka.pobierz(url);
      if (!o) throw new Error('brak odpowiedzi');
      return o;
    }
    const kontrola = new AbortController();
    const czas = setTimeout(() => kontrola.abort(), 15000);
    try {
      const r = await fetch(url, { signal: kontrola.signal });
      return { ok: r.ok, status: r.status, text: await r.text() };
    } catch (e) {
      return { ok: false, status: 0, text: '', blad: String(e && e.message || e) };
    } finally {
      clearTimeout(czas);
    }
  }

  class BladPogody extends Error {
    constructor(rodzaj, opis) { super(opis || rodzaj); this.rodzaj = rodzaj; }
  }

  const PAMIEC_POGODY = new Map();
  const WAZNOSC_POGODY = 10 * 60 * 1000;
  let bezDNI = false;
  const klucz = (p) => `${p.lat.toFixed(2)},${p.lon.toFixed(2)}`;

  async function pogodaDla(punkty) {
    const teraz = Date.now();
    const brakujace = [];
    for (const p of punkty) {
      const z = PAMIEC_POGODY.get(klucz(p));
      if (!z || teraz - z.t > WAZNOSC_POGODY) brakujace.push(p);
    }
    for (let i = 0; i < brakujace.length; i += 100) {
      const partia = brakujace.slice(i, i + 100);
      const zmienne = ['is_day', 'cloud_cover', 'weather_code', 'temperature_2m'];
      if (!bezDNI) zmienne.push('direct_normal_irradiance');
      const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + partia.map((p) => p.lat.toFixed(2)).join(',') +
        '&longitude=' + partia.map((p) => p.lon.toFixed(2)).join(',') +
        '&current=' + zmienne.join(',') + '&timeformat=unixtime&forecast_days=1';
      const o = await pobierz(url);
      if (!o.ok) {
        let powod = '';
        try { powod = JSON.parse(o.text).reason || ''; } catch { /* nie JSON */ }
        if (o.status === 400 && !bezDNI && /direct_normal_irradiance/.test(powod)) { bezDNI = true; i -= 100; continue; }
        if (o.status === 429) throw new BladPogody('limit', powod);
        throw new BladPogody(o.status ? 'serwer' : 'siec', powod || o.blad);
      }
      let dane;
      try { dane = JSON.parse(o.text); } catch { throw new BladPogody('serwer', 'zła odpowiedź'); }
      const lista = Array.isArray(dane) ? dane : [dane];
      partia.forEach((p, j) => {
        const c = lista[j] && lista[j].current;
        PAMIEC_POGODY.set(klucz(p), { t: Date.now(), p: c || null });
      });
    }
    return punkty.map((p) => (PAMIEC_POGODY.get(klucz(p)) || {}).p || null);
  }

  // „Słońce świeci”: dzień i bezpośrednie promieniowanie słońca co najmniej 120 W/m² (definicja usłonecznienia WMO).
  function swieci(p) {
    if (!p || p.is_day !== 1) return false;
    if (typeof p.direct_normal_irradiance === 'number') return p.direct_normal_irradiance >= 120;
    return p.cloud_cover <= 30 && p.weather_code <= 2;
  }
  function opisPogody(p) {
    if (!p) return 'brak danych';
    const k = p.weather_code;
    if (k === 0) return 'bezchmurnie';
    if (k === 1) return 'przeważnie bezchmurnie';
    if (k === 2) return 'częściowe zachmurzenie';
    if (k === 3) return 'pochmurno';
    if (k === 45 || k === 48) return 'mgła';
    if (k >= 51 && k <= 55) return 'mżawka';
    if (k === 56 || k === 57) return 'marznąca mżawka';
    if (k >= 61 && k <= 65) return 'deszcz';
    if (k === 66 || k === 67) return 'marznący deszcz';
    if (k >= 71 && k <= 77) return 'śnieg';
    if (k >= 80 && k <= 82) return 'przelotny deszcz';
    if (k === 85 || k === 86) return 'przelotny śnieg';
    if (k >= 95) return 'burza';
    return `zachmurzenie ${p.cloud_cover}%`;
  }
  const temperatura = (p) => (p && typeof p.temperature_2m === 'number' ? `${Math.round(p.temperature_2m)}°C` : '');

  /* ============================ miejsce użytkownika ============================ */
  const PAMIEC_MIEJSCA = 'slonce-miejsce';
  function czytajMiejsce() {
    try { const m = JSON.parse(localStorage.getItem(PAMIEC_MIEJSCA)); return m && typeof m.lat === 'number' ? m : null; } catch { return null; }
  }
  function zapiszMiejsce(m) {
    try { if (m) localStorage.setItem(PAMIEC_MIEJSCA, JSON.stringify(m)); else localStorage.removeItem(PAMIEC_MIEJSCA); } catch { /* bez pamięci */ }
  }
  // Polska nazwa najbliższej znanej miejscowości (np. Warszawa zamiast Warsaw z adresu IP).
  function nazwaOkolicy(lat, lon, zapasowa) {
    let najlepsza = null;
    for (const m of MIEJSCA) {
      if (Math.abs(m.lat - lat) > 0.3 || Math.abs(m.lon - lon) > 0.5) continue;
      const d = odleglosc({ lat, lon }, m);
      if (d > 20) continue;
      if (!najlepsza || m.poziom > najlepsza.m.poziom || (m.poziom === najlepsza.m.poziom && d < najlepsza.d)) najlepsza = { m, d };
    }
    return najlepsza ? najlepsza.m.nazwa : (zapasowa || 'Twoja okolica');
  }
  async function miejsceZAdresuIP() {
    const proby = [
      ['https://get.geojs.io/v1/ip/geo.json', (j) => ({ lat: parseFloat(j.latitude), lon: parseFloat(j.longitude), miasto: j.city, kraj: j.country_code })],
      ['https://ipwho.is/', (j) => (j.success === false ? null : { lat: Number(j.latitude), lon: Number(j.longitude), miasto: j.city, kraj: j.country_code })],
    ];
    for (const [url, czytaj] of proby) {
      try {
        const o = await pobierz(url);
        if (!o.ok) continue;
        const m = czytaj(JSON.parse(o.text));
        if (m && Number.isFinite(m.lat) && Number.isFinite(m.lon)) {
          return { nazwa: nazwaOkolicy(m.lat, m.lon, m.miasto), lat: m.lat, lon: m.lon, kraj: m.kraj || '', zrodlo: 'ip' };
        }
      } catch { /* następna usługa */ }
    }
    return null;
  }

  /* ============================ szukanie słońca ============================ */
  // Pierścienie odległości: [od km, do km, ile miejscowości]. Bliżej gęsto, dalej tylko większe miasta.
  const PIERSCIENIE = [[0, 80, 90], [80, 250, 100], [250, 700, 100], [700, 2000, 100], [2000, 20100, 100]];
  const stan = {
    miejsce: null, sprawdzone: [], najblizsze: null, uMnie: null, szuka: false, nr: 0,
    skalaKm: 100, skalaWidok: 100, puls: 0, czas: null, zasieg: 0,
  };

  const odmiana = (n, a, b, c) => (n === 1 ? a : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)) ? b : c);
  const km = (d) => `${Math.round(d).toLocaleString('pl-PL')} km`;
  const KIERUNKI = ['na północ', 'na północny wschód', 'na wschód', 'na południowy wschód', 'na południe', 'na południowy zachód', 'na zachód', 'na północny zachód'];
  const kierunek = (az) => KIERUNKI[Math.round(az / 45) % 8];
  let nazwyKrajow = null;
  try { nazwyKrajow = new Intl.DisplayNames(['pl'], { type: 'region' }); } catch { /* bez nazw krajów */ }
  function kraj(c) {
    if (!c.kraj || !stan.miejsce || !stan.miejsce.kraj || c.kraj === stan.miejsce.kraj) return '';
    let n = c.kraj;
    try { n = nazwyKrajow ? nazwyKrajow.of(c.kraj) : c.kraj; } catch { /* kod */ }
    return ` (${n})`;
  }
  const godzina = (unix) => new Date(unix * 1000).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  const LADNE_SKALE = [25, 50, 75, 100, 150, 200, 300, 500, 750, 1000, 1500, 2000, 3000, 5000, 7500, 10000, 15000, 20000];
  const ladnaSkala = (d) => LADNE_SKALE.find((s) => s >= d) || 20000;

  async function szukaj() {
    if (!stan.miejsce || stan.szuka) return;
    const nr = ++stan.nr;
    const m = stan.miejsce;
    const teraz = new Date();
    stan.szuka = true;
    stan.sprawdzone = [];
    stan.najblizsze = null;
    stan.uMnie = null;
    stan.skalaKm = 75;
    scena.classList.add('szuka');
    $('#szukaj').disabled = true;
    $('#mapa').hidden = true;
    brudny = true;

    const odl = new Float32Array(MIEJSCA.length);
    for (let i = 0; i < MIEJSCA.length; i++) odl[i] = odleglosc(m, MIEJSCA[i]);
    const ja = { nazwa: m.nazwa, lat: m.lat, lon: m.lon, kraj: m.kraj, d: 0, az: 0, ja: true };

    try {
      for (let k = 0; k < PIERSCIENIE.length; k++) {
        const [od, doo, ile] = PIERSCIENIE[k];
        let kandydaci = [];
        for (let i = 0; i < MIEJSCA.length; i++) {
          const d = odl[i];
          if (d < od || d >= doo || (k === 0 && d < 2)) continue;
          const x = MIEJSCA[i];
          if (wysokoscSlonca(x.lat, x.lon, teraz) <= 1.5) continue; // tam teraz noc albo słońce jeszcze pod horyzontem
          kandydaci.push({ ...x, d });
        }
        kandydaci.sort((a, b) => b.poziom - a.poziom || a.ranga - b.ranga);
        kandydaci = kandydaci.slice(0, ile);
        if (k === 0) kandydaci.unshift(ja);
        if (!kandydaci.length) continue;
        stan.skalaKm = Math.max(stan.skalaKm, ladnaSkala(Math.min(doo, 20000)));
        stan.zasieg = doo;
        ustawOdpowiedz('Szukam słońca…',
          `Sprawdzam ${kandydaci.length} ${odmiana(kandydaci.length, 'miejsce', 'miejsca', 'miejsc')} do ${km(Math.min(doo, 20000))} od Ciebie.`);
        const pogody = await pogodaDla(kandydaci);
        if (nr !== stan.nr) return;
        kandydaci.forEach((c, j) => {
          c.pogoda = pogody[j];
          c.swieci = swieci(c.pogoda);
          c.noc = c.pogoda ? c.pogoda.is_day === 0 : wysokoscSlonca(c.lat, c.lon, teraz) <= 0;
          c.az = c.ja ? 0 : azymut(m, c);
          stan.sprawdzone.push(c);
          if (c.ja) stan.uMnie = c;
        });
        brudny = true;
        const slonce = stan.sprawdzone.filter((c) => c.swieci).sort((a, b) => a.d - b.d)[0];
        if (slonce) { stan.najblizsze = slonce; break; }
      }
      stan.czas = teraz;
      const s = stan.najblizsze;
      stan.skalaKm = s ? ladnaSkala(Math.max(s.d * 1.35, 40)) : ladnaSkala(Math.max(...stan.sprawdzone.map((c) => c.d), 40));
      if (s) stan.puls = performance.now();
      pokazWynik();
    } catch (e) {
      if (nr !== stan.nr) return;
      if (e instanceof BladPogody && e.rodzaj === 'limit') {
        ustawOdpowiedz('Serwer pogody prosi o chwilę przerwy', 'Za dużo zapytań naraz. Spróbuj ponownie za minutę.');
      } else {
        ustawOdpowiedz('Nie udało się sprawdzić pogody', 'Sprawdź połączenie z internetem i kliknij „Szukaj ponownie”.');
      }
    } finally {
      if (nr === stan.nr) {
        stan.szuka = false;
        scena.classList.remove('szuka');
        $('#szukaj').disabled = false;
        brudny = true;
      }
    }
  }

  function pokazWynik() {
    const m = stan.miejsce, u = stan.uMnie, s = stan.najblizsze;
    const czasDanych = (s && s.pogoda && s.pogoda.time) || (u && u.pogoda && u.pogoda.time);
    const stanNa = czasDanych ? ` Stan na ${godzina(czasDanych)}.` : '';
    const uCiebie = !u || !u.pogoda ? '' : u.noc ? 'U Ciebie jest noc.' : `U Ciebie: ${opisPogody(u.pogoda)}, ${temperatura(u.pogoda)}.`;
    if (s && s.ja) {
      ustawOdpowiedz('Słońce świeci u Ciebie', `${m.nazwa}: ${opisPogody(s.pogoda)}, ${temperatura(s.pogoda)}. Wyjdź na dwór!${stanNa}`);
    } else if (s) {
      ustawOdpowiedz(`Najbliższe słońce: ${s.nazwa}${kraj(s)}, ${km(s.d)} ${kierunek(s.az)}`,
        `Tam: ${opisPogody(s.pogoda)}, ${temperatura(s.pogoda)}. ${uCiebie}${stanNa}`);
      $('#mapa').hidden = false;
    } else {
      const n = stan.sprawdzone.length;
      ustawOdpowiedz(`Nie widzę słońca w promieniu ${km(Math.min(stan.zasieg, 20000))}`,
        `Sprawdziłem ${n} ${odmiana(n, 'miejsce', 'miejsca', 'miejsc')}: wszędzie chmury albo noc. ${uCiebie}${stanNa}`);
    }
  }

  /* ============================ wstęga ============================ */
  const odpowiedz = $('#odpowiedz');
  const szczegoly = $('#szczegoly');
  function ustawOdpowiedz(a, b) {
    odpowiedz.textContent = a;
    szczegoly.textContent = b;
    szczegoly.title = b;
  }
  function pokazMiejsce() {
    $('#moje-miejsce').textContent = stan.miejsce ? stan.miejsce.nazwa : 'nieznane';
    $('#zmien').title = stan.miejsce
      ? (stan.miejsce.zrodlo === 'ip' ? 'Ustalone w przybliżeniu z adresu internetowego. Kliknij, żeby wpisać miejscowość.' : 'Kliknij, żeby zmienić miejscowość.')
      : 'Kliknij, żeby wpisać miejscowość.';
  }
  function ustawMiejsce(m) {
    stan.miejsce = m;
    stan.sprawdzone = [];
    stan.najblizsze = null;
    przygotujKontury();
    pokazMiejsce();
    brudny = true;
  }

  function otworzZewnetrznie(url) {
    if (wBezramce && typeof window.bezramka.otworzWPrzegladarce === 'function') window.bezramka.otworzWPrzegladarce(url);
    else window.open(url, '_blank', 'noopener');
  }
  $('#szukaj').addEventListener('click', () => szukaj());
  $('#mapa').addEventListener('click', () => {
    const s = stan.najblizsze; if (!s) return;
    otworzZewnetrznie(`https://www.openstreetmap.org/?mlat=${s.lat.toFixed(4)}&mlon=${s.lon.toFixed(4)}#map=10/${s.lat.toFixed(4)}/${s.lon.toFixed(4)}`);
  });
  $('#zrodlo').addEventListener('click', (e) => { e.preventDefault(); otworzZewnetrznie('https://open-meteo.com/'); });

  /* ---------- zmiana miejsca ---------- */
  const widokOdp = $('#widok-odpowiedz');
  const widokMiejsce = $('#widok-miejsce');
  const pole = $('#miejsce-pole');
  const podpowiedzi = $('#podpowiedzi');
  let wyniki = [], wybrany = -1, czasPisania = 0, nrPodpowiedzi = 0;

  function pokazZmiane(tak) {
    widokOdp.hidden = tak;
    widokMiejsce.hidden = !tak;
    podpowiedzi.hidden = true;
    if (tak) { pole.value = ''; pole.focus(); } else { $('#zmien').focus(); }
  }
  $('#zmien').addEventListener('click', () => pokazZmiane(widokMiejsce.hidden));
  $('#miejsce-anuluj').addEventListener('click', () => pokazZmiane(false));
  $('#miejsce-ip').addEventListener('click', async () => {
    zapiszMiejsce(null);
    pokazZmiane(false);
    await ustalMiejsceISzukaj(true);
  });

  function rysujPodpowiedzi(lista, komunikat) {
    podpowiedzi.replaceChildren();
    if (komunikat) {
      const li = document.createElement('li');
      li.className = 'brak';
      li.textContent = komunikat;
      podpowiedzi.append(li);
    }
    lista.forEach((r, i) => {
      const li = document.createElement('li');
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', String(i === wybrany));
      li.append(document.createTextNode(r.name));
      const opis = [r.admin1, r.country].filter(Boolean).join(', ');
      if (opis) { const s = document.createElement('span'); s.textContent = `, ${opis}`; li.append(s); }
      li.addEventListener('mousedown', (e) => { e.preventDefault(); wybierz(i); });
      podpowiedzi.append(li);
    });
    podpowiedzi.hidden = !lista.length && !komunikat;
  }
  pole.addEventListener('input', () => {
    clearTimeout(czasPisania);
    const q = pole.value.trim();
    if (q.length < 2) { wyniki = []; rysujPodpowiedzi([]); return; }
    czasPisania = setTimeout(async () => {
      const nr = ++nrPodpowiedzi;
      const o = await pobierz(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=pl&format=json`);
      if (nr !== nrPodpowiedzi) return;
      if (!o.ok) { wyniki = []; rysujPodpowiedzi([], 'Nie udało się połączyć z wyszukiwarką miejscowości.'); return; }
      try { wyniki = (JSON.parse(o.text).results || []).filter((r) => Number.isFinite(r.latitude)); } catch { wyniki = []; }
      wybrany = wyniki.length ? 0 : -1;
      rysujPodpowiedzi(wyniki, wyniki.length ? null : 'Nie znam takiej miejscowości. Sprawdź pisownię.');
    }, 250);
  });
  pole.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); pokazZmiane(false); return; }
    if (!wyniki.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      wybrany = (wybrany + (e.key === 'ArrowDown' ? 1 : wyniki.length - 1)) % wyniki.length;
      rysujPodpowiedzi(wyniki);
    }
  });
  widokMiejsce.addEventListener('submit', (e) => { e.preventDefault(); if (wybrany >= 0) wybierz(wybrany); });
  function wybierz(i) {
    const r = wyniki[i]; if (!r) return;
    const m = { nazwa: r.name, lat: r.latitude, lon: r.longitude, kraj: r.country_code || '', zrodlo: 'reczne' };
    zapiszMiejsce(m);
    ustawMiejsce(m);
    pokazZmiane(false);
    szukaj();
  }

  async function ustalMiejsceISzukaj(zIP) {
    const zapisane = zIP ? null : czytajMiejsce();
    if (zapisane) { ustawMiejsce(zapisane); szukaj(); return; }
    ustawOdpowiedz('Ustalam, gdzie jesteś…', 'Na podstawie adresu internetowego. Możesz też wpisać miejscowość.');
    const m = await miejsceZAdresuIP();
    if (m) { ustawMiejsce(m); szukaj(); return; }
    ustawMiejsce(null);
    ustawOdpowiedz('Nie wiem, gdzie jesteś', 'Wpisz swoją miejscowość, a poszukam najbliższego słońca.');
    pokazZmiane(true);
  }

  /* ============================ radar ============================ */
  const R_MAPY = 172, SR = 190;
  let kontury = { wybrzeza: [], granice: [] };
  function przygotujKontury() {
    kontury = { wybrzeza: [], granice: [] };
    const m = stan.miejsce;
    if (!m || !window.KONTURY) return;
    for (const rodzaj of ['wybrzeza', 'granice']) {
      for (const linia of window.KONTURY[rodzaj]) {
        const t = new Float32Array(linia.length);
        for (let i = 0; i < linia.length; i += 2) {
          const p = rzut(m, linia[i + 1] / 20, linia[i] / 20);
          t[i] = p ? p.x : NaN;
          t[i + 1] = p ? p.y : NaN;
        }
        kontury[rodzaj].push(t);
      }
    }
  }

  function promyki(c, x, y, r, dl, kolor) {
    c.beginPath();
    for (let i = 0; i < 8; i++) {
      const k = (i / 8) * Math.PI * 2;
      c.moveTo(x + Math.cos(k) * (r + 1.5), y + Math.sin(k) * (r + 1.5));
      c.lineTo(x + Math.cos(k) * (r + 1.5 + dl), y + Math.sin(k) * (r + 1.5 + dl));
    }
    c.strokeStyle = kolor;
    c.lineWidth = Math.max(1, r / 4);
    c.lineCap = 'round';
    c.stroke();
  }
  function slonko(c, x, y, r) {
    promyki(c, x, y, r, r * 0.8, '#F08A00');
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fillStyle = '#FFC21A';
    c.fill();
    c.lineWidth = 1.2;
    c.strokeStyle = '#E07800';
    c.stroke();
  }
  function napis(c, t, x, y, wyrownanie = 'left') {
    c.font = '700 12.5px "Segoe UI", "Helvetica Neue", "Noto Sans", Arial, sans-serif';
    c.textAlign = wyrownanie;
    c.textBaseline = 'middle';
    c.lineJoin = 'round';
    c.lineWidth = 4;
    c.strokeStyle = 'rgba(255,249,232,.95)';
    c.strokeText(t, x, y);
    c.fillStyle = '#5A2A05';
    c.fillText(t, x, y);
  }

  let brudny = true, kropki = [];
  function rysujRadar(t) {
    const c = radar.ctx;
    const s = R_MAPY / stan.skalaWidok;
    c.save();
    c.clearRect(0, 0, 380, 380);
    c.beginPath();
    c.arc(SR, SR, SR, 0, Math.PI * 2);
    c.clip();
    const tlo = c.createRadialGradient(SR, SR - 30, 20, SR, SR, SR);
    tlo.addColorStop(0, '#FFFBEE');
    tlo.addColorStop(1, '#FBE7BE');
    c.fillStyle = tlo;
    c.fillRect(0, 0, 380, 380);

    // kontury lądów
    const linie = (lista, kolor, szer, kreska) => {
      c.beginPath();
      const lim = stan.skalaWidok * 1.6;
      for (const t2 of lista) {
        let pioro = false;
        for (let i = 0; i < t2.length; i += 2) {
          const x = t2[i], y = t2[i + 1];
          if (Number.isNaN(x) || Math.abs(x) > lim * 3 || Math.abs(y) > lim * 3) { pioro = false; continue; }
          const px = SR + x * s, py = SR - y * s;
          if (pioro) c.lineTo(px, py); else { c.moveTo(px, py); pioro = true; }
        }
      }
      c.strokeStyle = kolor;
      c.lineWidth = szer;
      c.setLineDash(kreska || []);
      c.stroke();
      c.setLineDash([]);
    };
    linie(kontury.wybrzeza, 'rgba(140,100,40,.5)', 1.1);
    linie(kontury.granice, 'rgba(160,115,50,.45)', 0.9, [4, 3]);

    // pierścienie odległości i strony świata
    c.strokeStyle = 'rgba(205,140,35,.5)';
    c.lineWidth = 1;
    c.setLineDash([3, 4]);
    for (const r of [R_MAPY / 2, R_MAPY]) { c.beginPath(); c.arc(SR, SR, r, 0, Math.PI * 2); c.stroke(); }
    c.setLineDash([]);
    c.font = '600 11px "Segoe UI", "Helvetica Neue", Arial, sans-serif';
    c.fillStyle = '#A8661A';
    c.textAlign = 'left';
    c.textBaseline = 'middle';
    // podpisy pierścieni wzdłuż osi północnej, wewnątrz radaru
    for (const [r, v] of [[R_MAPY / 2, stan.skalaKm / 2], [R_MAPY, stan.skalaKm]]) {
      if (Math.abs(stan.skalaWidok - stan.skalaKm) / stan.skalaKm < 0.05) c.fillText(km(v), SR + 6, SR - r + 9);
    }
    c.font = '700 11px "Segoe UI", "Helvetica Neue", Arial, sans-serif';
    c.fillStyle = '#B5761F';
    c.textAlign = 'center';
    c.fillText('Pn', SR, 10);
    c.fillText('Pd', SR, 371);
    c.fillText('Zach', 16, SR);
    c.fillText('Wsch', 364, SR);

    // przeszukiwanie: wiązka radaru
    if (stan.szuka && !mniejRuchu) {
      const a = (t / 1000) * 2.4;
      const g = c.createConicGradient(a, SR, SR);
      g.addColorStop(0, 'rgba(255,170,20,.32)');
      g.addColorStop(0.16, 'rgba(255,170,20,0)');
      g.addColorStop(1, 'rgba(255,170,20,0)');
      c.fillStyle = g;
      c.beginPath();
      c.arc(SR, SR, R_MAPY + 8, 0, Math.PI * 2);
      c.fill();
    }

    // sprawdzone miejsca
    kropki = [];
    const m = stan.miejsce;
    if (m) {
      const kolejnosc = [...stan.sprawdzone].sort((a, b) => (a.swieci - b.swieci) || (b.noc - a.noc));
      for (const p of kolejnosc) {
        if (p.ja) continue;
        const r = rzut(m, p.lat, p.lon);
        if (!r) continue;
        const px = SR + r.x * s, py = SR - r.y * s;
        if (Math.hypot(px - SR, py - SR) > R_MAPY + 8) continue;
        kropki.push({ px, py, p });
        if (p === stan.najblizsze) continue;
        if (p.swieci) slonko(c, px, py, 3.6);
        else {
          c.beginPath();
          c.arc(px, py, 3.3, 0, Math.PI * 2);
          c.fillStyle = p.noc ? '#454A7E' : '#8E9FB2';
          c.fill();
        }
      }
      const s0 = stan.najblizsze;
      if (s0 && !s0.ja) {
        const r = rzut(m, s0.lat, s0.lon);
        if (r) {
          const px = SR + r.x * s, py = SR - r.y * s;
          c.beginPath();
          c.moveTo(SR, SR);
          c.lineTo(px, py);
          c.strokeStyle = 'rgba(224,120,0,.85)';
          c.lineWidth = 1.6;
          c.setLineDash([5, 4]);
          c.stroke();
          c.setLineDash([]);
          const wiek = (t - stan.puls) / 1300;
          if (stan.puls && wiek < 1 && !mniejRuchu) {
            c.beginPath();
            c.arc(px, py, 9 + wiek * 26, 0, Math.PI * 2);
            c.strokeStyle = `rgba(255,170,0,${0.7 * (1 - wiek)})`;
            c.lineWidth = 3;
            c.stroke();
          }
          slonko(c, px, py, 8.5);
          const zPrawej = px < SR + 60;
          napis(c, s0.nazwa, px + (zPrawej ? 16 : -16), py, zPrawej ? 'left' : 'right');
        }
      }
      // Ty
      const uMnieSlonce = stan.najblizsze && stan.najblizsze.ja;
      if (uMnieSlonce) slonko(c, SR, SR, 9);
      c.beginPath();
      c.arc(SR, SR, uMnieSlonce ? 4 : 6.5, 0, Math.PI * 2);
      c.fillStyle = '#173F73';
      c.fill();
      c.lineWidth = 2.5;
      c.strokeStyle = '#FFFFFF';
      c.stroke();
      napis(c, 'Ty', SR, SR + 17, 'center');
    }
    c.restore();
  }

  // dymek nad kropką
  const dymek = $('#dymek-radaru');
  radar.canvas.addEventListener('mousemove', (e) => {
    const b = radar.canvas.getBoundingClientRect();
    const x = ((e.clientX - b.left) / b.width) * 380, y = ((e.clientY - b.top) / b.height) * 380;
    let naj = null, nd = 11;
    for (const k of kropki) {
      const d = Math.hypot(k.px - x, k.py - y);
      if (d < nd) { nd = d; naj = k; }
    }
    if (!naj) { dymek.hidden = true; return; }
    const p = naj.p;
    const stanTxt = p.swieci ? `słońce, ${opisPogody(p.pogoda)}, ${temperatura(p.pogoda)}`
      : p.noc ? 'noc' : `${opisPogody(p.pogoda)}, ${temperatura(p.pogoda)}`;
    dymek.textContent = `${p.nazwa}${kraj(p)}: ${stanTxt}, ${km(p.d)}`;
    dymek.style.left = `${410 + naj.px}px`;
    dymek.style.top = `${106 + naj.py}px`;
    dymek.hidden = false;
  });
  radar.canvas.addEventListener('mouseleave', () => { dymek.hidden = true; });

  /* ============================ para: przemiana ============================ */
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
  function naSloncu(x, y) {
    const e = document.elementFromPoint(uklad.dx + x * uklad.skala, uklad.dy + y * uklad.skala);
    return Boolean(e) && e !== scena && e !== document.body && e !== document.documentElement && e.id !== 'slonce';
  }
  function klab(pojawienie) {
    for (let y = 40; y <= 640; y += 76) {
      for (let x = 60; x <= 1140; x += 80) {
        if (!naSloncu(x, y) && Math.random() < 0.8) continue;
        para.czastki.push(pojawienie
          ? { x: x + los(-20, 20), y: y + los(-20, 20), vx: los(-14, 14), vy: los(-40, -14), r: los(80, 108), rosnie: 30, a: 0.9, t: 0.35, zycie: los(1.4, 1.9) }
          : { x: x + los(-20, 20), y: y + los(-20, 20), vx: los(-12, 12), vy: los(-30, -8), r: los(30, 50), rosnie: los(45, 70), a: 0.9, t: 0, zycie: 3.2 });
      }
    }
  }
  function rysujPare(dt) {
    const c = para.ctx;
    if (!para.czastki.length && !para.brudne) return;
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
  function syk() {
    try {
      const a = new (window.AudioContext || window.webkitAudioContext)();
      const b = a.createBuffer(1, a.sampleRate, a.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const s = a.createBufferSource(); s.buffer = b;
      const f = a.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2500;
      const g = a.createGain();
      g.gain.setValueAtTime(0.0001, a.currentTime);
      g.gain.exponentialRampToValueAtTime(0.09, a.currentTime + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 1);
      s.connect(f).connect(g).connect(a.destination);
      s.start(); s.stop(a.currentTime + 1);
    } catch { /* bez dźwięku */ }
  }
  const zawartoscSceny = () => [...scena.children].filter((e) => e.id !== 'para');
  let wraca = false;
  $('#wroc').addEventListener('click', () => {
    if (wraca) return;
    wraca = true;
    const cel = location.protocol === 'bezramka:' ? 'bezramka://stacja/?z=slonce' : '../stacja/index.html?z=slonce';
    if (mniejRuchu) { location.href = cel; return; }
    syk();
    klab(false);
    for (const e of zawartoscSceny()) e.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 650, delay: 150, easing: 'ease-in', fill: 'forwards' });
    setTimeout(() => { location.href = cel; }, 1000);
  });

  /* ============================ pętla ============================ */
  let poprzedni = performance.now();
  function klatka(t) {
    const dt = Math.min(0.05, Math.max(0, (t - poprzedni) / 1000));
    poprzedni = t;
    const przed = stan.skalaWidok;
    stan.skalaWidok += (stan.skalaKm - stan.skalaWidok) * Math.min(1, dt * (mniejRuchu ? 60 : 4));
    if (Math.abs(stan.skalaWidok - stan.skalaKm) < stan.skalaKm * 0.002) stan.skalaWidok = stan.skalaKm;
    const animuje = stan.szuka || przed !== stan.skalaWidok || (stan.puls && t - stan.puls < 1400);
    if (brudny || animuje) { rysujRadar(t); brudny = false; }
    rysujPare(dt);
    requestAnimationFrame(klatka);
  }

  /* ============================ start ============================ */
  window.addEventListener('resize', dopasuj);
  dopasuj();
  pokazMiejsce();
  if (new URLSearchParams(location.search).get('z') === 'ciuchcia' && !mniejRuchu) {
    klab(true);
    for (const e of zawartoscSceny()) {
      e.animate([{ opacity: 0, transform: e.id === 'slonce' ? 'scale(.96)' : 'none' }, { opacity: 1, transform: 'none' }],
        { duration: 800, delay: 200, easing: 'ease-out', fill: 'backwards' });
    }
  }
  requestAnimationFrame((t) => { poprzedni = t; requestAnimationFrame(klatka); });
  ustalMiejsceISzukaj(false);
  // „Na daną chwilę”: co kwadrans szukamy od nowa (dane z modeli odświeżają się co 15 minut).
  setInterval(() => { if (!document.hidden && !stan.szuka && stan.miejsce) szukaj(); }, 15 * 60 * 1000);

  // do testów
  window.__slonce = { stan, wysokoscSlonca, swieci, odleglosc, azymut, MIEJSCA };
})();
