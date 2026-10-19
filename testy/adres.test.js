// Uruchom: npm test   (albo: node testy/adres.test.js)
'use strict';

const assert = require('assert');
const path = require('path');
const { normalizuj, doPokazania } = require('../adres');

const przypadki = [
  ['', 'bezramka://stacja/'],
  ['   ', 'bezramka://stacja/'],
  ['stacja', 'bezramka://stacja/'],
  ['Stacja/', 'bezramka://stacja/'],
  ['szablon', 'bezramka://szablon/'],
  ['Pudel', 'bezramka://pudel/'],
  ['słońce', 'bezramka://slonce/'],
  ['Slonce', 'bezramka://slonce/'],
  ['example.com', 'https://example.com'],
  ['wp.pl/news?x=1', 'https://wp.pl/news?x=1'],
  ['example.com:8080/a', 'https://example.com:8080/a'],
  ['http://example.com', 'http://example.com'],
  ['https://pl.wikipedia.org/wiki/Ciuchcia', 'https://pl.wikipedia.org/wiki/Ciuchcia'],
  ['bezramka://stacja', 'bezramka://stacja'],
  ['localhost', 'http://localhost'],
  ['localhost:3000', 'http://localhost:3000'],
  ['localhost:3000/strona', 'http://localhost:3000/strona'],
  ['127.0.0.1:5500/index.html', 'http://127.0.0.1:5500/index.html'],
  ['192.168.1.10', 'http://192.168.1.10'],
  ['about:blank', 'about:blank'],
  ['file:///tmp/a.html', 'file:///tmp/a.html'],
];

let ok = 0;
for (const [wejscie, oczekiwane] of przypadki) {
  assert.deepStrictEqual(normalizuj(wejscie), { url: oczekiwane }, `„${wejscie}”`);
  ok++;
}

for (const zly of ['javascript:alert(1)', 'mailto:a@b.pl', 'jakieś dwa słowa', 'bezkropki', 'ftp://serwer']) {
  const w = normalizuj(zly);
  assert.ok(w.blad && !w.url, `„${zly}” powinno dać komunikat`);
  ok++;
}

// ścieżki do plików zamieniają się na file://
const plik = normalizuj(path.join(__dirname, 'adres.test.js'));
assert.ok(plik.url.startsWith('file://') && plik.url.endsWith('/testy/adres.test.js'), plik.url);
ok++;
assert.ok(normalizuj('~/strona.html').url.startsWith('file://'));
ok++;

assert.strictEqual(doPokazania('bezramka://stacja/'), 'bezramka://stacja');
assert.strictEqual(doPokazania('bezramka://blad/?kod=-105&adres=https%3A%2F%2Fx.pl%2F'), 'https://x.pl/');
assert.strictEqual(doPokazania('https://example.com/'), 'https://example.com/');
assert.strictEqual(doPokazania(''), '');
assert.strictEqual(doPokazania('bezramka://pudel/?z=ciuchcia'), 'bezramka://pudel');
ok += 5;

console.log(`adres.js: ${ok} sprawdzeń, wszystkie przeszły.`);
