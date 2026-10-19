// Bezramka – mikroprzeglądarka bez ramki.
// Okno strony jest przezroczyste i nie ma żadnej ramki: na ekranie zostaje tylko to,
// co strona narysowała. Kliknięcia w puste (przezroczyste) miejsca przechodzą do tego,
// co leży pod spodem. Pasek adresu to osobne, małe okienko, które pojawia się na chwilę.
'use strict';

const {
  app, BrowserWindow, ipcMain, screen, protocol, net, globalShortcut,
  Menu, Tray, nativeImage, shell, session, clipboard,
} = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const { pathToFileURL } = require('url');
const adres = require('./adres');

const KATALOG_STRON = path.join(__dirname, 'strony');
const IKONA = path.join(__dirname, 'ikona.png');
const DOMYSLNY_ROZMIAR = { w: 1100, h: 720 }; // dla stron, które nie podają rozmiaru
const PROG_ALFA = 200;       // piksel co najmniej tak nieprzezroczysty łapie mysz (0–255)
const CO_ILE_MS = 30;        // jak często sprawdzamy, co jest pod kursorem
const SZEROKOSC_PASKA = 660;
const SKROT_GLOBALNY = 'CommandOrControl+Alt+B';
const NA_MACU = process.platform === 'darwin';
const KLAWISZ = NA_MACU ? 'Cmd' : 'Ctrl';

protocol.registerSchemesAsPrivileged([{
  scheme: 'bezramka',
  privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true },
}]);

// Na Linuksie przezroczyste okna wymagają tej flagi (i działającego kompozytora okien).
if (process.platform === 'linux') app.commandLine.appendSwitch('enable-transparent-visuals');
if (process.env.BEZRAMKA_BEZ_GPU) app.disableHardwareAcceleration();

let strona = null;   // okno ze stroną (przezroczyste, bez ramki)
let pasek = null;    // okienko z paskiem adresu
let zasobnik = null; // ikona w zasobniku systemowym

const stan = {
  rozmiarStrony: null,     // rozmiar z <meta name="bezramka-rozmiar">
  skalaOkna: 1,
  przelot: null,           // true = kliknięcia przechodzą przez okno
  mysz: false,             // lewy przycisk wciśnięty na stronie
  tryb: process.env.BEZRAMKA_TRYB === 'dom' ? 'dom' : 'piksele',
  wymuszonyTryb: Boolean(process.env.BEZRAMKA_TRYB),
  blad: null,
  podpowiedz: `Pasek zniknie, gdy strona się wczyta. Przywołasz go skrótem ${KLAWISZ}+L (na stronie) albo ${KLAWISZ}+Alt+B (zawsze). Lokomotywę przesuwasz, przeciągając ją myszą.`,
  pierwszeChowanie: true,
  pokazane: false,
  koniec: false,
  timerChowania: null,
  timerPrzeciagania: null,
  zapytania: new Map(),
  nrZapytania: 0,
  sprawdzanie: false,
  punkt: null,             // ostatnia znana pozycja kursora na ekranie { x, y }
  ostatniEkran: null,      // ostatni odczyt pozycji z systemu
  sprawdzonyPunkt: null,
  ostatniCzas: 0,
  kursorX11: null,         // pozycja z pomocnika X11 (tylko Linux)
  pomocnikX11: null,
};

const zyje = (okno) => Boolean(okno) && !okno.isDestroyed();
const zeStrony = (e) => zyje(strona) && e.sender === strona.webContents;
const zPaska = (e) => zyje(pasek) && e.sender === pasek.webContents;
const log = (...a) => { if (process.env.BEZRAMKA_DEBUG) console.log('[bezramka]', ...a); };

/* ============================ adresy bezramka:// ============================ */

function zarejestrujProtokol() {
  protocol.handle('bezramka', async (zadanie) => {
    const u = new URL(zadanie.url);
    let wzgledna = decodeURIComponent(u.pathname);
    if (wzgledna.endsWith('/')) wzgledna += 'index.html';
    const plik = path.normalize(path.join(KATALOG_STRON, u.hostname, wzgledna));
    const wSrodku = plik.startsWith(KATALOG_STRON + path.sep);
    if (wSrodku && fs.existsSync(plik) && fs.statSync(plik).isFile()) {
      return net.fetch(pathToFileURL(plik).href);
    }
    // Nie ma takiej strony – strona błędu jest jednym plikiem, więc działa pod każdym adresem.
    const blad = await fs.promises.readFile(path.join(KATALOG_STRON, 'blad', 'index.html'));
    return new Response(blad, { status: 404, headers: { 'content-type': 'text/html; charset=utf-8' } });
  });
}

/* ================================== okna ================================== */

function utworzOkna(adresStartowy) {
  const ekran = screen.getPrimaryDisplay().workArea;
  strona = new BrowserWindow({
    width: DOMYSLNY_ROZMIAR.w,
    height: DOMYSLNY_ROZMIAR.h,
    x: Math.round(ekran.x + (ekran.width - DOMYSLNY_ROZMIAR.w) / 2),
    y: Math.round(ekran.y + (ekran.height - DOMYSLNY_ROZMIAR.h) / 2),
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    title: 'Bezramka',
    icon: IKONA,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload-strona.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  });
  ustawPrzelot(true);

  pasek = new BrowserWindow({
    width: SZEROKOSC_PASKA,
    height: 72,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    title: 'Bezramka – pasek adresu',
    icon: IKONA,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'pasek', 'preload-pasek.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  pasek.loadFile(path.join(__dirname, 'pasek', 'pasek.html'));
  pasek.webContents.on('will-navigate', (e) => e.preventDefault());
  pasek.webContents.on('before-input-event', obsluzSkroty);
  pasek.on('blur', () => {
    if (!stan.blad && zyje(strona) && !strona.webContents.isLoading()) zaplanujChowanie(600);
  });
  pasek.on('close', (e) => {
    if (!stan.koniec) { e.preventDefault(); schowajPasek(); }
  });

  const wc = strona.webContents;
  wc.on('before-input-event', obsluzSkroty);
  wc.on('did-start-loading', wyslijStan);
  wc.on('did-stop-loading', wyslijStan);
  wc.on('did-navigate', wyslijStan);
  wc.on('did-navigate-in-page', wyslijStan);
  wc.on('page-title-updated', (_e, tytul) => {
    strona.setTitle(tytul ? `${tytul} – Bezramka` : 'Bezramka');
    wyslijStan();
  });
  wc.on('did-fail-load', (_e, kod, opis, url, glowna) => {
    if (!glowna || kod === -3) return; // -3: wczytywanie przerwane, np. nowym adresem
    log('błąd wczytywania', kod, opis, url);
    stan.blad = `Nie udało się otworzyć ${adres.doPokazania(url)}.`;
    const cel = new URL('bezramka://blad/');
    cel.searchParams.set('kod', String(kod));
    cel.searchParams.set('opis', opis || '');
    cel.searchParams.set('adres', url);
    wczytaj(cel.href);
    pokazPasek({ fokus: false });
  });
  wc.on('did-finish-load', async () => {
    stan.rozmiarStrony = await odczytajRozmiar();
    zastosujRozmiar();
    pokazOknoStrony();
    setTimeout(kalibruj, 700);
    const naStronieBledu = wc.getURL().startsWith('bezramka://blad/');
    if (!naStronieBledu) {
      stan.blad = null;
      zaplanujChowanie(stan.pierwszeChowanie ? 6000 : 1400);
    }
    wyslijStan();
  });
  wc.setWindowOpenHandler(({ url }) => {
    // Bez kart i nowych okien: link otwiera się w tym samym miejscu.
    if (/^(https?|file|bezramka):/i.test(url)) wczytaj(url);
    else if (/^mailto:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  wc.on('context-menu', (_e, p) => pokazMenuKontekstowe(p));

  strona.on('move', pozycjonujPasek);
  strona.on('closed', () => { strona = null; app.quit(); });
  strona.once('ready-to-show', () => setTimeout(pokazOknoStrony, 1500));

  const start = adresStartowy ? adres.normalizuj(adresStartowy) : { url: adres.STRONA_DOMOWA };
  if (start.blad) stan.blad = start.blad;
  wczytaj(start.url || adres.STRONA_DOMOWA);
}

function pokazOknoStrony() {
  if (stan.pokazane || !zyje(strona)) return;
  stan.pokazane = true;
  strona.show();
  pokazPasek();
}

function wczytaj(url) {
  if (!zyje(strona)) return;
  strona.webContents.loadURL(url).catch(() => { /* obsługuje did-fail-load */ });
}

function idz(tekst) {
  const wynik = adres.normalizuj(tekst);
  if (wynik.blad) {
    stan.blad = wynik.blad;
    pokazPasek();
    wyslijStan();
    return;
  }
  stan.blad = null;
  stan.podpowiedz = null;
  wczytaj(wynik.url);
}

/* ======================== rozmiar okna według strony ======================== */

async function odczytajRozmiar() {
  try {
    const tresc = await strona.webContents.executeJavaScript(
      '(() => { const m = document.querySelector(\'meta[name="bezramka-rozmiar"]\'); return m ? m.content : ""; })()',
    );
    const m = /^\s*(\d{2,5})\s*[x×]\s*(\d{2,5})\s*$/i.exec(tresc || '');
    return m ? { w: Number(m[1]), h: Number(m[2]) } : null;
  } catch {
    return null;
  }
}

function zastosujRozmiar() {
  if (!zyje(strona)) return;
  const baza = stan.rozmiarStrony || DOMYSLNY_ROZMIAR;
  const b = strona.getBounds();
  const ekran = screen.getDisplayMatching(b).workArea;
  const skala = stan.rozmiarStrony ? stan.skalaOkna : 1;
  let w = baza.w * skala, h = baza.h * skala;
  const k = Math.min(1, (ekran.width * 0.98) / w, (ekran.height * 0.94) / h); // zawsze mieści się na ekranie
  w = Math.max(120, Math.round(w * k));
  h = Math.max(80, Math.round(h * k));
  if (b.width === w && b.height === h) return;
  let x = Math.round(b.x + b.width / 2 - w / 2);
  let y = Math.round(b.y + b.height / 2 - h / 2);
  x = Math.min(Math.max(x, ekran.x - w + 80), ekran.x + ekran.width - 80);
  y = Math.min(Math.max(y, ekran.y), ekran.y + ekran.height - 80);
  strona.setBounds({ x, y, width: w, height: h });
  pozycjonujPasek();
}

function zmienSkale(mnoznik) {
  if (!zyje(strona)) return;
  if (!stan.rozmiarStrony) {
    // zwykła strona: klasyczne powiększenie treści
    const wc = strona.webContents;
    wc.setZoomFactor(mnoznik === 0 ? 1 : Math.min(3, Math.max(0.3, wc.getZoomFactor() * mnoznik)));
    return;
  }
  stan.skalaOkna = mnoznik === 0 ? 1 : Math.min(3, Math.max(0.3, stan.skalaOkna * mnoznik));
  zastosujRozmiar();
}

/* ============== przezroczystość dla myszy: co jest pod kursorem? ============== */

function ustawPrzelot(tak) {
  if (!zyje(strona) || stan.przelot === tak) return;
  stan.przelot = tak;
  log(tak ? 'kliknięcia przechodzą dalej' : 'okno łapie mysz');
  // forward: na Windows i macOS strona dalej dostaje ruchy myszy, choć kliknięcia przechodzą dalej
  if (tak) strona.setIgnoreMouseEvents(true, { forward: true });
  else strona.setIgnoreMouseEvents(false);
  if (stan.pomocnikX11 && !stan.mysz) {
    setTimeout(() => {
      try { if (stan.pomocnikX11) stan.pomocnikX11.stdin.write('szturchnij\n'); } catch { /* bez szturchania */ }
    }, 15);
  }
}

function zapytajStrone(kanal, dane, limitMs = 200) {
  return new Promise((zwroc) => {
    if (!zyje(strona)) { zwroc(null); return; }
    const id = ++stan.nrZapytania;
    const czasomierz = setTimeout(() => { stan.zapytania.delete(id); zwroc(null); }, limitMs);
    stan.zapytania.set(id, (wynik) => {
      clearTimeout(czasomierz);
      stan.zapytania.delete(id);
      zwroc(wynik);
    });
    strona.webContents.send(kanal, { id, ...dane });
  });
}

// Nieprzezroczystość piksela strony pod punktem (0–255) albo null, gdy nie da się sprawdzić.
async function alfaPod(x, y) {
  try {
    const obraz = await strona.webContents.capturePage({ x: Math.floor(x), y: Math.floor(y), width: 1, height: 1 });
    if (!obraz || obraz.isEmpty()) return null;
    const bity = obraz.toBitmap();
    let a = 0;
    for (let i = 3; i < bity.length; i += 4) a = Math.max(a, bity[i]);
    return a;
  } catch {
    return null;
  }
}

async function czyPelny(x, y) {
  if (stan.tryb === 'piksele') {
    const a = await alfaPod(x, y);
    if (a !== null) return a >= PROG_ALFA;
  }
  const w = await zapytajStrone('bezramka:czy-pelny', { x, y });
  return w === null ? !stan.przelot : Boolean(w);
}

// Sprawdzamy, czy zrzut piksela widzi przezroczystość. Jeśli system jej nie zachowuje,
// przechodzimy na wykrywanie po elementach strony (DOM).
async function kalibruj() {
  if (stan.wymuszonyTryb || !zyje(strona) || !strona.isVisible()) return;
  stan.tryb = 'piksele';
  const punkty = await zapytajStrone('bezramka:punkty-tla', {}, 600);
  if (!Array.isArray(punkty) || punkty.length === 0) { log('tryb trafień: piksele (strona bez przezroczystego tła)'); return; }
  let zgodne = 0, niezgodne = 0;
  for (const p of punkty.slice(0, 12)) {
    const a = await alfaPod(p.x, p.y);
    if (a !== null && a < PROG_ALFA) zgodne++; else niezgodne++;
  }
  stan.tryb = zgodne >= niezgodne ? 'piksele' : 'dom';
  log(`tryb trafień: ${stan.tryb} (${zgodne}/${zgodne + niezgodne} punktów tła przezroczystych)`);
}

// Pozycja kursora. Windows i macOS podają ją zawsze. Na Linuksie (X11) Electron przestaje ją
// aktualizować, gdy okno przepuszcza kliknięcia – wtedy czytamy ją małym pomocnikiem w Pythonie.
const POMOCNIK_X11 = `
import ctypes, select, sys
x = ctypes.cdll.LoadLibrary('libX11.so.6')
x.XOpenDisplay.restype = ctypes.c_void_p
x.XOpenDisplay.argtypes = [ctypes.c_char_p]
d = x.XOpenDisplay(None)
if not d:
    sys.exit(1)
x.XDefaultRootWindow.restype = ctypes.c_ulong
x.XDefaultRootWindow.argtypes = [ctypes.c_void_p]
x.XQueryPointer.argtypes = [ctypes.c_void_p, ctypes.c_ulong] + [ctypes.c_void_p] * 7
x.XFlush.argtypes = [ctypes.c_void_p]
try:
    xt = ctypes.cdll.LoadLibrary('libXtst.so.6')
    xt.XTestFakeMotionEvent.argtypes = [ctypes.c_void_p, ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_ulong]
except OSError:
    xt = None
r = x.XDefaultRootWindow(d)
a, b, m = ctypes.c_ulong(), ctypes.c_ulong(), ctypes.c_uint()
rx, ry, wx, wy = ctypes.c_int(), ctypes.c_int(), ctypes.c_int(), ctypes.c_int()
ostatni = None
while True:
    x.XQueryPointer(d, r, ctypes.byref(a), ctypes.byref(b), ctypes.byref(rx), ctypes.byref(ry),
                    ctypes.byref(wx), ctypes.byref(wy), ctypes.byref(m))
    p = (rx.value, ry.value)
    if p != ostatni:
        sys.stdout.write('%d %d\\n' % p)
        sys.stdout.flush()
        ostatni = p
    gotowe, _, _ = select.select([sys.stdin], [], [], 0.02)
    if gotowe:
        polecenie = sys.stdin.readline()
        if not polecenie:
            break
        # serwer X ustala okno pod kursorem przy ruchu myszy – ruch w miejscu odświeża to po zmianie kształtu
        if xt and polecenie.startswith('szturchnij') and m.value & 0x1f00 == 0:
            xt.XTestFakeMotionEvent(d, -1, p[0], p[1], 0)
            x.XFlush(d)
`;

function uruchomPomocnikaX11() {
  if (process.platform !== 'linux' || !process.env.DISPLAY) return;
  try {
    const p = spawn('python3', ['-c', POMOCNIK_X11], { stdio: ['pipe', 'pipe', 'ignore'] });
    p.stdin.on('error', () => { /* pomocnik zamknięty */ });
    let bufor = '';
    p.stdout.on('data', (dane) => {
      bufor += dane.toString();
      const linie = bufor.split('\n');
      bufor = linie.pop();
      const ostatnia = linie.filter(Boolean).pop();
      if (!ostatnia) return;
      const [x, y] = ostatnia.split(' ').map(Number);
      const skala = screen.getPrimaryDisplay().scaleFactor || 1;
      stan.kursorX11 = { x: Math.round(x / skala), y: Math.round(y / skala) };
    });
    p.on('error', () => { stan.pomocnikX11 = null; });
    p.on('exit', () => { stan.pomocnikX11 = null; stan.kursorX11 = null; });
    stan.pomocnikX11 = p;
    app.on('will-quit', () => { try { p.kill(); } catch { /* już zamknięty */ } });
    log('pozycja kursora z pomocnika X11');
  } catch (err) {
    log('pomocnik X11 niedostępny:', err.message);
  }
}

function odczytajKursor() {
  const p = stan.kursorX11 || screen.getCursorScreenPoint();
  // nowa informacja tylko wtedy, gdy odczyt się zmienił – inaczej zostaje to, co podała strona
  if (!stan.ostatniEkran || stan.ostatniEkran.x !== p.x || stan.ostatniEkran.y !== p.y) {
    stan.ostatniEkran = p;
    stan.punkt = { x: p.x, y: p.y };
  }
  return stan.punkt;
}

async function sprawdzKursor() {
  if (stan.sprawdzanie || !zyje(strona) || !strona.isVisible() || strona.isMinimized()) return;
  if (stan.mysz || stan.timerPrzeciagania) { ustawPrzelot(false); return; }
  const p = odczytajKursor();
  const b = strona.getContentBounds();
  const x = p.x - b.x, y = p.y - b.y;
  if (x < 0 || y < 0 || x >= b.width || y >= b.height) { ustawPrzelot(true); return; }
  const teraz = Date.now();
  const sp = stan.sprawdzonyPunkt;
  const ruszyl = !sp || sp.x !== x || sp.y !== y;
  // gdy kursor stoi, i tak sprawdzamy co jakiś czas – strona mogła się zmienić (np. animacja)
  if (!ruszyl && teraz - stan.ostatniCzas < 200) return;
  stan.sprawdzonyPunkt = { x, y };
  stan.ostatniCzas = teraz;
  stan.sprawdzanie = true;
  try {
    ustawPrzelot(!(await czyPelny(x, y)));
  } finally {
    stan.sprawdzanie = false;
  }
}

/* ============================ komunikaty ze strony ============================ */

ipcMain.on('bezramka:odpowiedz', (e, wiadomosc) => {
  if (!zeStrony(e) || !wiadomosc) return;
  const f = stan.zapytania.get(wiadomosc.id);
  if (f) f(wiadomosc.wynik);
});

ipcMain.on('bezramka:ruch', (e, r) => {
  if (!zeStrony(e) || !r) return;
  const b = strona.getContentBounds();
  stan.punkt = { x: b.x + Math.round(Number(r.x) || 0), y: b.y + Math.round(Number(r.y) || 0) };
  sprawdzKursor();
});

ipcMain.on('bezramka:mysz', (e, wcisnieta) => {
  if (!zeStrony(e)) return;
  stan.mysz = Boolean(wcisnieta);
  if (stan.mysz) ustawPrzelot(false);
});

ipcMain.on('bezramka:przeciagaj', (e, d) => {
  if (!zeStrony(e)) return;
  clearInterval(stan.timerPrzeciagania);
  stan.timerPrzeciagania = null;
  if (!d || !d.start) return;
  const b = strona.getBounds();
  const dx = d.start.x - b.x, dy = d.start.y - b.y;
  stan.timerPrzeciagania = setInterval(() => {
    if (!zyje(strona)) return;
    const p = stan.kursorX11 || screen.getCursorScreenPoint();
    strona.setPosition(Math.round(p.x - dx), Math.round(p.y - dy));
  }, 16);
});

ipcMain.on('bezramka:pokaz-pasek', (e) => { if (zeStrony(e)) pokazPasek(); });

// Strony wbudowane mogą pobierać dane z kilku zaufanych serwerów (pogoda, lokalizacja z adresu IP).
// Zapytanie idzie przez program, więc nie przeszkadzają ograniczenia CORS.
const DOZWOLONE_SERWERY = new Set(['api.open-meteo.com', 'geocoding-api.open-meteo.com', 'get.geojs.io', 'ipwho.is']);
ipcMain.handle('bezramka:pobierz', async (e, url) => {
  const odmowa = (blad) => ({ ok: false, status: 0, text: '', blad });
  if (!zeStrony(e) || !strona.webContents.getURL().startsWith('bezramka://')) return odmowa('niedozwolone');
  let u;
  try { u = new URL(String(url)); } catch { return odmowa('zły adres'); }
  if (u.protocol !== 'https:' || !DOZWOLONE_SERWERY.has(u.hostname)) return odmowa('niedozwolony serwer');
  try {
    const odp = await net.fetch(u.href, { signal: AbortSignal.timeout(15000) });
    const text = await odp.text();
    if (text.length > 3000000) return odmowa('za duża odpowiedź');
    return { ok: odp.ok, status: odp.status, text };
  } catch (err) {
    return odmowa(String((err && err.message) || err));
  }
});

// Strony wbudowane mogą otworzyć odnośnik w zwykłej przeglądarce (np. bazy chipów z wyszukiwarki psów).
ipcMain.on('bezramka:zewnetrzny', (e, url) => {
  if (!zeStrony(e) || !strona.webContents.getURL().startsWith('bezramka://')) return;
  try {
    const u = new URL(String(url));
    if (u.protocol === 'https:' || u.protocol === 'http:') shell.openExternal(u.href);
  } catch { /* zły adres */ }
});

/* ================================ pasek adresu ================================ */

ipcMain.on('pasek:idz', (e, tekst) => { if (zPaska(e)) idz(String(tekst || '')); });
ipcMain.on('pasek:aktywny', (e) => { if (zPaska(e)) anulujChowanie(); });
ipcMain.on('pasek:wysokosc', (e, h) => {
  if (!zPaska(e)) return;
  const nowa = Math.max(40, Math.min(260, Math.round(Number(h) || 0)));
  const [w, teraz] = pasek.getSize();
  if (nowa !== teraz) {
    pasek.setSize(w, nowa);
    pozycjonujPasek();
  }
});
ipcMain.on('pasek:akcja', (e, nazwa) => {
  if (!zPaska(e) || !zyje(strona)) return;
  const wc = strona.webContents;
  switch (nazwa) {
    case 'wstecz': wstecz(); break;
    case 'dalej': dalej(); break;
    case 'odswiez': if (wc.isLoading()) wc.stop(); else wc.reload(); break;
    case 'dom': idz(''); break;
    case 'na-wierzchu': przelaczWierzch(); break;
    case 'schowaj': schowajPasek(); break;
    case 'zamknij': app.quit(); break;
    default: break;
  }
});

function pozycjonujPasek() {
  if (!zyje(pasek) || !zyje(strona)) return;
  const b = strona.getBounds();
  const [pw, ph] = pasek.getSize();
  const ekran = screen.getDisplayMatching(b).workArea;
  let x = Math.round(b.x + b.width / 2 - pw / 2);
  let y = b.y - ph + 4;
  if (y < ekran.y) y = Math.max(ekran.y, b.y + 4); // nad stroną brak miejsca – pasek nachodzi na jej górę
  x = Math.min(Math.max(x, ekran.x), ekran.x + ekran.width - pw);
  y = Math.min(y, ekran.y + ekran.height - ph);
  pasek.setPosition(x, y);
}

function pokazPasek({ fokus = true } = {}) {
  if (!zyje(pasek)) return;
  anulujChowanie();
  pozycjonujPasek();
  wyslijStan();
  if (fokus) {
    pasek.show();
    pasek.focus();
    pasek.webContents.send('pasek:fokus');
  } else if (!pasek.isVisible()) {
    pasek.showInactive();
  }
}

function schowajPasek() {
  anulujChowanie();
  stan.podpowiedz = null; // podpowiedź pokazujemy tylko przy pierwszym uruchomieniu
  stan.pierwszeChowanie = false;
  if (zyje(pasek) && pasek.isVisible()) pasek.hide();
  wyslijStan();
}

function przelaczPasek() {
  if (zyje(pasek) && pasek.isVisible()) { schowajPasek(); return; }
  if (zyje(strona) && !strona.isVisible()) strona.show();
  pokazPasek();
}

function zaplanujChowanie(ms) {
  anulujChowanie();
  stan.timerChowania = setTimeout(() => {
    stan.timerChowania = null;
    if (stan.blad || (zyje(strona) && strona.webContents.isLoading())) return;
    schowajPasek();
  }, ms);
}

function anulujChowanie() {
  clearTimeout(stan.timerChowania);
  stan.timerChowania = null;
}

function historia(wc) { return wc.navigationHistory || wc; }
function mozeWstecz(wc) { return historia(wc).canGoBack(); }
function mozeDalej(wc) { return historia(wc).canGoForward(); }
function wstecz() { if (zyje(strona) && mozeWstecz(strona.webContents)) historia(strona.webContents).goBack(); }
function dalej() { if (zyje(strona) && mozeDalej(strona.webContents)) historia(strona.webContents).goForward(); }

function przelaczWierzch() {
  if (!zyje(strona)) return;
  strona.setAlwaysOnTop(!strona.isAlwaysOnTop());
  wyslijStan();
}

function narzedzia() {
  if (!zyje(strona)) return;
  const wc = strona.webContents;
  if (wc.isDevToolsOpened()) wc.closeDevTools();
  else wc.openDevTools({ mode: 'detach' });
}

function wyslijStan() {
  odswiezZasobnik();
  if (!zyje(pasek) || !zyje(strona)) return;
  const wc = strona.webContents;
  pasek.webContents.send('pasek:stan', {
    adres: adres.doPokazania(wc.getURL()),
    tytul: wc.getTitle(),
    laduje: wc.isLoading(),
    wstecz: mozeWstecz(wc),
    dalej: mozeDalej(wc),
    naWierzchu: strona.isAlwaysOnTop(),
    blad: stan.blad,
    podpowiedz: stan.podpowiedz,
  });
}

/* ================================== skróty ================================== */

function obsluzSkroty(e, input) {
  if (input.type !== 'keyDown' || !zyje(strona)) return;
  const ctrl = NA_MACU ? input.meta : input.control;
  const k = String(input.key || '').toLowerCase();
  const wc = strona.webContents;
  const zrob = (f) => { e.preventDefault(); f(); };
  if ((ctrl && k === 'l') || k === 'f6' || (input.alt && !ctrl && k === 'd')) return zrob(() => pokazPasek());
  if (k === 'f5' || (ctrl && k === 'r')) return zrob(() => (input.shift ? wc.reloadIgnoringCache() : wc.reload()));
  if (input.alt && k === 'arrowleft') return zrob(wstecz);
  if (input.alt && k === 'arrowright') return zrob(dalej);
  if (input.alt && k === 'home') return zrob(() => idz(''));
  if (ctrl && (k === '=' || k === '+')) return zrob(() => zmienSkale(1.1));
  if (ctrl && k === '-') return zrob(() => zmienSkale(1 / 1.1));
  if (ctrl && k === '0') return zrob(() => zmienSkale(0));
  if (ctrl && (k === 'q' || k === 'w')) return zrob(() => app.quit());
  if (k === 'f12') return zrob(narzedzia);
  return undefined;
}

/* =========================== menu i zasobnik systemowy =========================== */

function pokazMenuKontekstowe(p) {
  if (!zyje(strona)) return;
  const wc = strona.webContents;
  const szablon = [];
  if (p.isEditable) {
    szablon.push(
      { role: 'cut', label: 'Wytnij' },
      { role: 'copy', label: 'Kopiuj' },
      { role: 'paste', label: 'Wklej' },
      { type: 'separator' },
    );
  } else if (p.selectionText) {
    szablon.push({ role: 'copy', label: 'Kopiuj' }, { type: 'separator' });
  }
  if (p.linkURL) {
    szablon.push({ label: 'Kopiuj adres linku', click: () => clipboard.writeText(p.linkURL) }, { type: 'separator' });
  }
  szablon.push(
    { label: 'Wstecz', enabled: mozeWstecz(wc), click: wstecz },
    { label: 'Dalej', enabled: mozeDalej(wc), click: dalej },
    { label: 'Odśwież', click: () => wc.reload() },
    { type: 'separator' },
    { label: `Pasek adresu (${KLAWISZ}+L)`, click: () => pokazPasek() },
    { label: 'Zawsze na wierzchu', type: 'checkbox', checked: strona.isAlwaysOnTop(), click: przelaczWierzch },
    { label: 'Narzędzia deweloperskie (F12)', click: narzedzia },
    { type: 'separator' },
    { label: 'Zamknij Bezramkę', click: () => app.quit() },
  );
  Menu.buildFromTemplate(szablon).popup({ window: strona });
}

function utworzZasobnik() {
  try {
    let obraz = nativeImage.createFromPath(IKONA);
    if (obraz.isEmpty()) return;
    const bok = NA_MACU ? 18 : 16;
    obraz = obraz.resize({ width: bok, height: bok, quality: 'best' });
    zasobnik = new Tray(obraz);
    zasobnik.setToolTip('Bezramka');
    zasobnik.on('click', przelaczPasek);
    odswiezZasobnik();
  } catch (err) {
    log('bez ikony w zasobniku:', err.message);
    zasobnik = null;
  }
}

function odswiezZasobnik() {
  if (!zasobnik || zasobnik.isDestroyed()) return;
  zasobnik.setContextMenu(Menu.buildFromTemplate([
    { label: `Pasek adresu (${KLAWISZ}+Alt+B)`, click: () => przelaczPasek() },
    { label: 'Stacja Ciuchciowo', click: () => idz('') },
    { label: 'Pudel szuka psa', click: () => idz('pudel') },
    { label: 'Gdzie słońce świeci?', click: () => idz('slonce') },
    { type: 'separator' },
    {
      label: 'Zawsze na wierzchu',
      type: 'checkbox',
      checked: zyje(strona) && strona.isAlwaysOnTop(),
      click: przelaczWierzch,
    },
    { type: 'separator' },
    { label: 'Zamknij Bezramkę', click: () => app.quit() },
  ]));
}

/* ================================== start ================================== */

function adresZArgumentow(argv) {
  const reszta = argv.slice(1).filter((a) => a && !a.startsWith('-'));
  if (!app.isPackaged) reszta.shift(); // w trybie deweloperskim pierwszy argument to ścieżka aplikacji („.”)
  return reszta[0] || null;
}

const pierwszaKopia = app.requestSingleInstanceLock();
if (!pierwszaKopia) {
  app.quit();
} else {
  app.on('second-instance', (_e, argv) => {
    const a = adresZArgumentow(argv);
    if (a) idz(a);
    if (zyje(strona)) strona.show();
    pokazPasek();
  });

  if (process.platform === 'win32') app.setAppUserModelId('Bezramka');

  app.whenReady().then(() => {
    zarejestrujProtokol();
    // Strony nie dostają kamery, mikrofonu, lokalizacji itd.
    session.defaultSession.setPermissionRequestHandler((_wc, uprawnienie, odpowiedz) => {
      odpowiedz(uprawnienie === 'clipboard-sanitized-write');
    });
    Menu.setApplicationMenu(NA_MACU ? Menu.buildFromTemplate([{ role: 'appMenu' }, { role: 'editMenu' }]) : null);

    const start = () => {
      utworzOkna(adresZArgumentow(process.argv));
      utworzZasobnik();
      try {
        if (!globalShortcut.register(SKROT_GLOBALNY, przelaczPasek)) log('skrót globalny zajęty:', SKROT_GLOBALNY);
      } catch (err) {
        log('skrót globalny niedostępny:', err.message);
      }
      uruchomPomocnikaX11();
      setInterval(sprawdzKursor, CO_ILE_MS);
    };
    // Linux: drobne opóźnienie pomaga kompozytorowi poprawnie utworzyć przezroczyste okno.
    if (process.platform === 'linux') setTimeout(start, 150);
    else start();
  });

  app.on('activate', () => pokazPasek());
  app.on('before-quit', () => { stan.koniec = true; });
  app.on('will-quit', () => globalShortcut.unregisterAll());
  app.on('window-all-closed', () => app.quit());
}
