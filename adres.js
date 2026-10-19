// Zamiana tego, co wpisano w pasek, na adres do wczytania.
'use strict';

const { pathToFileURL } = require('url');
const os = require('os');
const path = require('path');

const STRONA_DOMOWA = 'bezramka://stacja/';
const STRONY_WBUDOWANE = ['stacja', 'pudel', 'slonce', 'szablon', 'blad'];
const SCHEMATY = ['http', 'https', 'file', 'bezramka', 'about', 'data'];

const HOST_Z_PORTEM = /^[a-z0-9.-]+:\d{1,5}(?:[/?#]|$)/i;
const SCIEZKA_WINDOWS = /^[a-z]:[\\/]/i;
const LOKALNY = /^(localhost|127\.\d{1,3}\.\d{1,3}\.\d{1,3}|\[::1\])(:\d{1,5})?(?:[/?#]|$)/i;
const ADRES_IP = /^\d{1,3}(\.\d{1,3}){3}(:\d{1,5})?(?:[/?#]|$)/;
const DOMENA = /^[^\s/?#:]+\.[a-z0-9-]{2,}\.?(:\d{1,5})?(?:[/?#]|$)/i;

/**
 * @param {string} tekst – to, co wpisano
 * @returns {{url: string} | {blad: string}}
 */
function normalizuj(tekst) {
  const t = String(tekst ?? '').trim();
  if (!t) return { url: STRONA_DOMOWA };

  // ścieżki do plików na dysku
  if (SCIEZKA_WINDOWS.test(t) || t.startsWith('\\\\') || t.startsWith('/') || /^\.{1,2}[\\/]/.test(t)) {
    return { url: pathToFileURL(path.resolve(t)).href };
  }
  if (t === '~' || t.startsWith('~/') || t.startsWith('~\\')) {
    return { url: pathToFileURL(path.join(os.homedir(), t.slice(1))).href };
  }

  // adres z podanym schematem, np. https://…, file://…, bezramka://…
  const schemat = /^([a-z][a-z0-9+.-]*):/i.exec(t);
  if (schemat && !HOST_Z_PORTEM.test(t)) {
    const nazwa = schemat[1].toLowerCase();
    if (SCHEMATY.includes(nazwa)) return { url: t };
    return { blad: `Bezramka nie otwiera adresów typu „${nazwa}:”. Wpisz adres strony, np. example.com.` };
  }

  // strony wbudowane: „stacja”, „szablon”
  const krotki = t.toLowerCase().replace(/\/+$/, '').replace(/ł/g, 'l').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (STRONY_WBUDOWANE.includes(krotki)) return { url: `bezramka://${krotki}/` };

  if (/\s/.test(t)) {
    return { blad: 'To nie wygląda na adres strony. Wpisz np. example.com, stacja, pudel albo słońce.' };
  }
  if (LOKALNY.test(t) || ADRES_IP.test(t)) return { url: `http://${t}` };
  if (DOMENA.test(t) || HOST_Z_PORTEM.test(t)) return { url: `https://${t}` };

  return { blad: 'To nie wygląda na adres strony. Wpisz np. example.com, stacja, pudel albo słońce.' };
}

/** Adres do pokazania w pasku (strona błędu pokazuje adres, którego nie udało się otworzyć). */
function doPokazania(url) {
  if (!url) return '';
  try {
    const u = new URL(url);
    if (u.protocol === 'bezramka:' && u.hostname === 'blad' && u.searchParams.get('adres')) {
      return u.searchParams.get('adres');
    }
    u.searchParams.delete('z'); // znacznik przemiany ciuchcia ↔ pudel, niepotrzebny w pasku
    if (u.protocol === 'bezramka:' && (u.pathname === '/' || u.pathname === '/index.html') && !u.search && !u.hash) {
      return `bezramka://${u.hostname}`;
    }
  } catch { /* zostaw jak jest */ }
  return url;
}

module.exports = { normalizuj, doPokazania, STRONA_DOMOWA, STRONY_WBUDOWANE };
