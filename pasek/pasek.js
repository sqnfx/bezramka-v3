// Pasek adresu: wpisz adres, naciśnij Enter. Esc chowa pasek.
'use strict';

(() => {
  const api = window.pasek;
  const pigulka = document.getElementById('pigulka');
  const forma = document.getElementById('forma');
  const pole = document.getElementById('adres');
  const komunikat = document.getElementById('komunikat');
  const przyciski = Object.fromEntries(
    [...document.querySelectorAll('[data-akcja]')].map((b) => [b.dataset.akcja, b]),
  );
  let stan = null;
  let edytowane = false;

  forma.addEventListener('submit', (e) => {
    e.preventDefault();
    edytowane = false;
    api.idz(pole.value);
  });

  pole.addEventListener('input', () => {
    edytowane = true;
    api.aktywny();
    if (stan && stan.blad && !komunikat.hidden) komunikat.hidden = true;
    zglosWysokosc();
  });

  pole.addEventListener('keydown', (e) => {
    api.aktywny();
    if (e.key !== 'Escape') return;
    e.preventDefault();
    if (edytowane && stan) {
      pole.value = stan.adres;
      edytowane = false;
      pole.select();
    } else {
      api.akcja('schowaj');
    }
  });

  pole.addEventListener('focus', () => setTimeout(() => pole.select(), 0));
  pigulka.addEventListener('pointerdown', () => api.aktywny());

  for (const [nazwa, przycisk] of Object.entries(przyciski)) {
    przycisk.addEventListener('click', () => api.akcja(nazwa));
  }

  api.naStan((s) => {
    stan = s;
    if (!edytowane || document.activeElement !== pole) {
      pole.value = s.adres || '';
      edytowane = false;
    }
    przyciski.wstecz.disabled = !s.wstecz;
    przyciski.dalej.disabled = !s.dalej;
    przyciski.odswiez.title = s.laduje ? 'Zatrzymaj' : 'Odśwież (F5)';
    przyciski.odswiez.setAttribute('aria-label', s.laduje ? 'Zatrzymaj' : 'Odśwież');
    przyciski['na-wierzchu'].setAttribute('aria-pressed', String(Boolean(s.naWierzchu)));
    pigulka.classList.toggle('laduje', Boolean(s.laduje));
    const tekst = s.blad || s.podpowiedz || '';
    komunikat.textContent = tekst;
    komunikat.hidden = !tekst;
    komunikat.classList.toggle('blad', Boolean(s.blad));
    document.title = s.tytul ? `Bezramka – ${s.tytul}` : 'Bezramka';
    zglosWysokosc();
  });

  api.naFokus(() => {
    edytowane = false;
    pole.focus();
    pole.select();
  });

  // Okienko paska ma dokładnie taką wysokość jak pigułka (plus margines na cień).
  let ostatnia = 0;
  function zglosWysokosc() {
    requestAnimationFrame(() => {
      const h = Math.ceil(document.body.getBoundingClientRect().height);
      if (h !== ostatnia) {
        ostatnia = h;
        api.wysokosc(h);
      }
    });
  }
  new ResizeObserver(zglosWysokosc).observe(pigulka);
  zglosWysokosc();
})();
