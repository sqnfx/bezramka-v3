// Preload każdej strony otwartej w Bezramce.
// 1) mówi oknu, kiedy przycisk myszy jest wciśnięty (żeby nie zgubić przeciągania),
// 2) pozwala przesuwać okno: Alt + przeciągnij albo przeciągnij element z atrybutem data-bezramka-uchwyt,
// 3) odpowiada, czy w danym punkcie strona coś rysuje (zapasowa metoda, gdy zrzut piksela nie widzi przezroczystości).
'use strict';

const { contextBridge, ipcRenderer, webFrame } = require('electron');

contextBridge.exposeInMainWorld('bezramka', {
  wersja: '1.2.0',
  pokazPasek: () => ipcRenderer.send('bezramka:pokaz-pasek'),
  // tylko dla stron wbudowanych (bezramka://), adresy http/https
  otworzWPrzegladarce: (url) => ipcRenderer.send('bezramka:zewnetrzny', String(url)),
  // tylko dla stron wbudowanych: pobranie danych z zaufanych serwerów (pogoda, lokalizacja)
  pobierz: (url) => ipcRenderer.invoke('bezramka:pobierz', String(url)),
});

/* ---------------------- mysz i przesuwanie okna ---------------------- */

const INTERAKTYWNE = 'a[href], button, input, select, textarea, label, summary, [contenteditable=""], ' +
  '[contenteditable="true"], [role="button"], [tabindex]:not([tabindex="-1"]), [data-bezramka-bez-uchwytu]';
let wcisnieta = false;
let przeciaganie = null; // { sx, sy, ruszone }
let tlumKlik = false;

function zakoncz() {
  if (przeciaganie) {
    if (przeciaganie.ruszone) {
      ipcRenderer.send('bezramka:przeciagaj', null);
      tlumKlik = true; // klik po przeciągnięciu nie powinien niczego naciskać
      setTimeout(() => { tlumKlik = false; }, 0);
    }
    przeciaganie = null;
  }
  if (wcisnieta) {
    wcisnieta = false;
    ipcRenderer.send('bezramka:mysz', false);
  }
}

window.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  wcisnieta = true;
  ipcRenderer.send('bezramka:mysz', true);
  const cel = e.target instanceof Element ? e.target : null;
  const uchwyt = e.altKey ||
    Boolean(cel && cel.closest('[data-bezramka-uchwyt]') && !cel.closest(INTERAKTYWNE));
  if (uchwyt) {
    przeciaganie = { sx: e.screenX, sy: e.screenY, ruszone: false };
    if (e.altKey) e.preventDefault();
  }
}, true);

window.addEventListener('mousemove', (e) => {
  if (!przeciaganie) return;
  if (!przeciaganie.ruszone) {
    if (Math.hypot(e.screenX - przeciaganie.sx, e.screenY - przeciaganie.sy) < 4) return;
    przeciaganie.ruszone = true;
    ipcRenderer.send('bezramka:przeciagaj', { start: { x: przeciaganie.sx, y: przeciaganie.sy } });
    const zaznaczenie = window.getSelection && window.getSelection();
    if (zaznaczenie) zaznaczenie.removeAllRanges();
  }
  e.preventDefault();
}, true);

// Pozycja kursora dla okna. Na Windows i macOS ruchy docierają tu nawet wtedy,
// gdy okno przepuszcza kliknięcia – dzięki temu okno szybko „łapie” mysz nad kształtem.
let ostatniRuch = 0;
window.addEventListener('mousemove', (e) => {
  const t = performance.now();
  if (t - ostatniRuch < 25) return;
  ostatniRuch = t;
  const zoom = webFrame.getZoomFactor() || 1;
  ipcRenderer.send('bezramka:ruch', { x: e.clientX * zoom, y: e.clientY * zoom });
}, { capture: true, passive: true });

window.addEventListener('mouseup', (e) => { if (e.button === 0) zakoncz(); }, true);
window.addEventListener('blur', zakoncz);
window.addEventListener('dragstart', (e) => { if (przeciaganie) e.preventDefault(); }, true);
window.addEventListener('click', (e) => {
  if (tlumKlik) { e.stopImmediatePropagation(); e.preventDefault(); tlumKlik = false; }
}, true);

/* ------------------ czy w punkcie (x, y) coś jest narysowane ------------------ */

const ZASTEPOWANE = new Set(['IMG', 'VIDEO', 'CANVAS', 'IFRAME', 'EMBED', 'OBJECT', 'INPUT', 'SELECT',
  'TEXTAREA', 'BUTTON', 'PROGRESS', 'METER']);

function przezroczysty(kolor) {
  if (!kolor || kolor === 'transparent') return true;
  const m = /rgba?\(([^)]*)\)/.exec(kolor);
  if (!m) return false;
  const czesci = m[1].split(/[\s,/]+/).filter(Boolean);
  return czesci.length >= 4 && parseFloat(czesci[3]) === 0;
}

function maTlo(styl) {
  return !przezroczysty(styl.backgroundColor) || (styl.backgroundImage && styl.backgroundImage !== 'none');
}

function maRamke(styl) {
  return ['Top', 'Right', 'Bottom', 'Left'].some((s) =>
    parseFloat(styl[`border${s}Width`]) > 0 && styl[`border${s}Style`] !== 'none' && !przezroczysty(styl[`border${s}Color`]));
}

function czyPelny(xOkna, yOkna) {
  const zoom = webFrame.getZoomFactor() || 1;
  const x = xOkna / zoom, y = yOkna / zoom;
  const root = document.documentElement, body = document.body;
  for (const e of [root, body]) {
    if (e && maTlo(getComputedStyle(e))) return true; // strona ma pełne tło – cała jest „pełna”
  }
  const e = document.elementFromPoint(x, y);
  if (!e || e === root || e === body) return false;
  if (e.closest('[data-bezramka-przelot]')) return false;
  if (e instanceof SVGElement && !(e instanceof SVGSVGElement)) return true; // trafiony kształt SVG
  if (ZASTEPOWANE.has(e.tagName)) return true;
  for (let w = e; w && w !== body && w !== root; w = w.parentElement) {
    const styl = getComputedStyle(w);
    if (maTlo(styl) || maRamke(styl)) return true;
  }
  for (const n of e.childNodes) {
    if (n.nodeType === Node.TEXT_NODE && n.textContent.trim()) return true;
  }
  return false;
}

ipcRenderer.on('bezramka:czy-pelny', (_e, { id, x, y }) => {
  let wynik = null;
  try { wynik = czyPelny(x, y); } catch { wynik = null; }
  ipcRenderer.send('bezramka:odpowiedz', { id, wynik });
});

// Punkty, w których według DOM nic nie ma – okno sprawdza na nich, czy zrzut piksela widzi przezroczystość.
ipcRenderer.on('bezramka:punkty-tla', (_e, { id }) => {
  const punkty = [];
  try {
    const zoom = webFrame.getZoomFactor() || 1;
    const w = window.innerWidth, h = window.innerHeight;
    for (let i = 1; i <= 9 && punkty.length < 12; i++) {
      for (let j = 1; j <= 7 && punkty.length < 12; j++) {
        const x = Math.round((w * i) / 10 * zoom), y = Math.round((h * j) / 8 * zoom);
        if (!czyPelny(x, y)) punkty.push({ x, y });
      }
    }
  } catch { /* pusta lista */ }
  ipcRenderer.send('bezramka:odpowiedz', { id, wynik: punkty });
});
