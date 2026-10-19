# Bezramka i Stacja Ciuchciowo

Dwie rzeczy w jednym folderze:

- **Bezramka** – mikroprzeglądarka bez ramki. Wpisujesz adres, naciskasz Enter i przeglądarka znika. Na ekranie zostaje tylko to, co strona narysowała. Wszystko, co przezroczyste, nie istnieje: nie widać tego i można przez to klikać w okna pod spodem.
- **Stacja Ciuchciowo** – strona w kształcie parowozu. W oknie kabiny siedzi maszynista Burek, na kotle wisi tablica odjazdów, na dymnicy chodzi zegar dworcowy, a w ścianie kabiny jest kasa biletowa.
- **Pudel szuka psa** – kliknij Burka, a ciuchcia rozpłynie się w parze i zamieni w pudla. W jego futrze mieszka wyszukiwarka zaginionych i znalezionych psów.
- **Gdzie słońce świeci?** – kup w kasie bilet „Tam, gdzie świeci słońce”, a ciuchcia zamieni się w słońce, które pokaże, gdzie najbliżej świeci teraz słońce.

## Uruchomienie

**Windows bez instalowania czegokolwiek:** użyj gotowego `Bezramka.exe` (jeden plik) albo rozpakuj `Bezramka-1.2.0-win-x64.zip` i uruchom `Bezramka.exe` z folderu. Jeden plik przy każdym starcie rozpakowuje się kilka sekund, a wersja w folderze startuje od razu. Program nie ma podpisu cyfrowego, więc za pierwszym razem Windows może pokazać „System Windows ochronił ten komputer”. Wtedy kliknij „Więcej informacji” i „Uruchom mimo to”.

**Ze źródeł** potrzebny jest [Node.js](https://nodejs.org) w wersji LTS.

**Windows:** kliknij dwukrotnie `uruchom.bat`.
**macOS / Linux:** w terminalu `./uruchom.sh`.

Za pierwszym razem program pobierze Electron (silnik okien, ok. 100–200 MB), potem startuje od razu. Można też ręcznie: `npm install`, potem `npm start`.

Konkretny adres na start: `uruchom.bat example.com` albo `./uruchom.sh example.com`.

## Obsługa

Po starcie pojawia się lokomotywa i nad nią pasek adresu. Pasek chowa się sam, gdy strona się wczyta.

| Co | Jak |
|---|---|
| Pokaż pasek adresu | `Ctrl+L` (gdy strona jest aktywna) albo `Ctrl+Alt+B` (zawsze), ikona w zasobniku, prawy klik na stronie |
| Otwórz adres | wpisz w pasek i Enter: `example.com`, `localhost:3000`, `C:\strony\moja.html`, `stacja`, `pudel`, `slonce`, `szablon` |
| Schowaj pasek | `Esc` |
| Przesuń stronę po ekranie | przeciągnij ją myszą (gdy strona na to pozwala) albo `Alt` + przeciągnij w dowolnym miejscu |
| Wstecz / dalej | `Alt+←` / `Alt+→` albo strzałki w pasku |
| Odśwież | `F5` |
| Większa / mniejsza / normalna | `Ctrl+=` / `Ctrl+-` / `Ctrl+0` |
| Zawsze na wierzchu | pinezka w pasku albo prawy klik |
| Narzędzia deweloperskie | `F12` |
| Zamknij | `Ctrl+Q`, ✕ w pasku, prawy klik albo ikona w zasobniku |

Na macOS zamiast `Ctrl` jest `Cmd`.

## Co można zrobić na Stacji Ciuchciowo

- **Lizak** przy tylnej ścianie kabiny: odjazd. Koła ruszają, tor przesuwa się pod lokomotywą, komin sapie dymem. Drugi klik zatrzymuje.
- **Gwizdek** na kotle: gwiżdże i puszcza parę.
- **Megafon:** gong i zapowiedź najbliższego pociągu. Głosem, jeśli system ma polski głos (Windows po polsku zwykle ma). Tekst przewija się też na tablicy.
- **Reflektory:** włącza światła. Snop światła jest półprzezroczysty, więc da się przez niego klikać.
- **Kasa biletowa:** wybierz pociąg i kup bilet. Bilet wysuwa się szczeliną w dachu. Kliknij go, żeby skasować (zostaje dziurka, przez którą widać pulpit), i jeszcze raz, żeby go zabrać.

Rozkład jest wymyślony, ale liczony od bieżącej godziny, więc tablica zawsze pokazuje najbliższe odjazdy. Część pociągów jest opóźniona. Opóźnienie może ulec zmianie.

- **Maszynista Burek** w oknie kabiny: przechyla głowę, gdy na niego najedziesz. Po kliknięciu szczeka dwa razy, lokomotywa znika w kłębie pary i zamienia się w pudla.

## Pudel szuka psa

Adres `pudel`, albo klik w Burka na stacji. Okno ma kształt pudla, a wyszukiwarka siedzi w jego futrze.

- **Opisz psa** zwykłymi słowami, np. „biały pudel Rozjazdy” albo „brązowy jamnik z siwym pyszczkiem”. Wyszukiwarka rozpoznaje rasę, maść, wielkość, miejscowość (bliższe miejscowości pasują bardziej) i słowa z opisu, a przy każdym ogłoszeniu pokazuje procent dopasowania. Piętnastocyfrowy numer chipa szuka dokładnego psa.
- **Filtry:** zaginione albo znalezione, wielkość i maść.
- **Kliknij ogłoszenie**, żeby zobaczyć opis i kontakt. Przycisk „Szukaj wśród znalezionych” (albo „zaginionych”) od razu szuka drugiej strony: dla zaginionego psa pokazuje podobne znalezione.
- **Dodaj ogłoszenie:** opisz swojego psa. Ogłoszenie zostaje na tablicy na tym komputerze, a pudel od razu pokazuje podobne psy z okolicy.
- **Szukaj w internecie:** prawdziwe miejsca, gdzie szuka się psów. Opis w Google, numer chipa w bazie Safe-Animal i w europejskiej wyszukiwarce Europetnet, ogłoszenia Safe-Animal. Odnośniki otwierają się w zwykłej przeglądarce.
- **Pogłaszcz pudla** po głowie: zaszczeka i zamacha ogonem. Pudel macha też, gdy wywęszy bardzo pasujące ogłoszenie.
- **Wróć do ciuchci:** pudel znika w parze, a z pary wyjeżdża lokomotywa.

Tablica ogłoszeń jest wymyślona, tak samo jak okolice Ciuchciowa: Parowice, Semaforowo, Rozjazdy i reszta. Kontakty prowadzą do kolejarzy z tych stacji. Jedno z ogłoszeń dotyczy pudla, którego widać na ekranie.

## Gdzie słońce świeci?

Adres `slonce` (albo `słońce`), albo bilet „Tam, gdzie świeci słońce” w kasie na stacji. Okno ma kształt słońca. W środku jest radar z Tobą pośrodku, a na wstędze odpowiedź, np. „Najbliższe słońce: Kłodawa, 143 km na zachód”.

- **Twoje miejsce** Bezramka ustala w przybliżeniu z adresu internetowego (GeoJS, a gdy nie odpowiada, ipwho.is). Wbudowana lokalizacja Electrona wymaga płatnego klucza Google, więc z niej nie korzysta. Przycisk „Twoje miejsce” pozwala wpisać miejscowość; wpisana zostaje zapamiętana.
- **Pogoda na tę chwilę** pochodzi z Open-Meteo, czyli z modeli pogodowych odświeżanych co 15 minut, a nie z pomiarów stacji. Słońce „świeci” tam, gdzie jest dzień i bezpośrednie promieniowanie słoneczne ma co najmniej 120 W/m², tak jak w definicji usłonecznienia Światowej Organizacji Meteorologicznej.
- **Jak szuka:** sprawdza miejscowości pierścieniami: najpierw do 80 km (gęsto), potem do 250, 700 i 2000 km (coraz większe miasta), na końcu cały świat. Pomija miejsca, gdzie słońce jest pod horyzontem; to liczy samo, z położenia Ziemi i Słońca. Zatrzymuje się na pierwszym pierścieniu, w którym coś świeci, i podaje najbliższe takie miejsce. W nocy znajdzie słońce na innym kontynencie.
- **Radar** ma prawdziwe odległości od Ciebie (rzut azymutalny równoodległy), z wybrzeżami i granicami. Żółte słoneczka to miejsca ze słońcem, szare kropki to chmury, granatowe to noc. Najedź na kropkę, żeby zobaczyć nazwę i pogodę.
- **Pokaż na mapie** otwiera znalezione miejsce w OpenStreetMap w zwykłej przeglądarce.
- **Na daną chwilę:** co 15 minut słońce szuka od nowa. Wyniki pogody są pamiętane przez 10 minut, żeby nie zasypywać serwera zapytaniami. Darmowe Open-Meteo pozwala na 600 zapytań na minutę, a jedno szukanie to od kilkudziesięciu do około 460 miejscowości.

Strona łączy się tylko z: api.open-meteo.com, geocoding-api.open-meteo.com, get.geojs.io i ipwho.is. Program pozwala stronom wbudowanym pobierać dane wyłącznie z tych serwerów.

Dane: pogoda Open-Meteo.com (CC BY 4.0), miejscowości GeoNames (CC BY 4.0, przez zbiór all-the-cities), polskie nazwy dużych miast, wybrzeża i granice Natural Earth (domena publiczna).

## Własna strona w kształcie

Każda strona może mieć dowolny kształt. Zasady (gotowy przykład: `strony/szablon/index.html`, adres `szablon`):

1. **Przezroczyste tło:** `html, body { background: transparent; }`.
2. **Rysuj kształt** zwykłym CSS-em lub SVG: `border-radius`, `clip-path`, obrazki PNG z przezroczystością. Mysz łapią piksele nieprzezroczyste co najmniej w ok. 80%. Bardziej przezroczyste (dym, poświata) ją przepuszczają.
3. **Rozmiar okna** (opcjonalnie): `<meta name="bezramka-rozmiar" content="1200x680">`. Bez tego okno ma 1100 × 720.
4. **Uchwyt** (opcjonalnie): element z atrybutem `data-bezramka-uchwyt` przesuwa okno, gdy się go przeciąga. Przyciski, linki i pola formularzy w środku działają normalnie.

Strona może sprawdzić, czy jest w Bezramce: `if (window.bezramka) { … }`. Może też wywołać `window.bezramka.pokazPasek()`. Strony wbudowane (`bezramka://…`) mogą otworzyć odnośnik w zwykłej przeglądarce: `window.bezramka.otworzWPrzegladarce(url)`, oraz pobrać dane z kilku zaufanych serwerów: `window.bezramka.pobierz(url)`.

Własne strony możesz otwierać ze ścieżki (`C:\folder\strona.html`) albo dodać je jako wbudowane: folder `strony/moja/index.html` będzie pod adresem `bezramka://moja`.

Zwykłe strony internetowe też się otworzą. Jeśli mają białe tło, wyglądają po prostu jak prostokąt bez ramki.

## Jak to działa

- Okno strony jest przezroczyste i nie ma ramki (Electron, `transparent: true`, `frame: false`).
- Co 30 ms Bezramka sprawdza piksel strony pod kursorem. Jeśli jest pusty, okno przepuszcza kliknięcia (`setIgnoreMouseEvents`). Jeśli coś tam jest narysowane, okno łapie mysz.
- Gdy system nie oddaje przezroczystości w zrzucie piksela, Bezramka sama to wykrywa i pyta stronę, jaki element leży pod kursorem.
- Pasek adresu to osobne, małe okienko, które przykleja się nad stroną.

## Kłopoty

- **Linux:** przezroczystość wymaga kompozytora okien (GNOME, KDE i większość współczesnych pulpitów go mają). Gdy zamiast przezroczystości widać czarne tło, uruchom z `BEZRAMKA_BEZ_GPU=1 ./uruchom.sh`. Pozycję kursora nad przezroczystym oknem Bezramka odczytuje na Linuksie przez `python3` i X11, więc oba muszą być dostępne (w sesji Wayland przydaje się `--ozone-platform=x11`).
- **Kliknięcia nie przechodzą albo nie trafiają:** uruchom z `BEZRAMKA_DEBUG=1`, żeby zobaczyć w terminalu wybrany tryb. Tryb można wymusić: `BEZRAMKA_TRYB=dom` albo `BEZRAMKA_TRYB=piksele`.
- **Okna nie da się rozciągnąć myszą** – przezroczyste okna tego nie potrafią. Rozmiar zmieniasz skrótami `Ctrl+=` i `Ctrl+-`.

## Pliki

```
main.js               okna, przezroczystość dla myszy, skróty, adresy bezramka://
adres.js              zamiana wpisanego tekstu na adres
preload-strona.js     przeciąganie okna i wykrywanie elementu pod kursorem
pasek/                pasek adresu
strony/stacja/        Stacja Ciuchciowo z maszynistą Burkiem
strony/pudel/         pudel z wyszukiwarką psów
strony/slonce/        słońce z radarem; miejscowosci.js i kontury.js to dane
strony/szablon/       przykład własnej strony w kształcie
strony/blad/          strona błędu (kozioł oporowy na końcu toru)
testy/adres.test.js   testy rozpoznawania adresów (npm test)
```

Program nie wysyła nigdzie żadnych danych. Strony nie dostają dostępu do kamery, mikrofonu ani lokalizacji.
