# PhysicsLab

[![GitHub Pages](https://img.shields.io/badge/GitHub-Pages-blue?logo=github)](https://november7.github.io/PhysicsLab/)
[![Language-English-success](https://img.shields.io/badge/Language-English-success)](#english)
[![Język-Polski-red](https://img.shields.io/badge/J%C4%99zyk-Polski-red)](#polski)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue)](LICENSE)

## Polski

PhysicsLab to zbiór pokazowych, interaktywnych symulacji zjawisk fizycznych przygotowanych w HTML, CSS i JavaScript. Przykłady można uruchamiać w przeglądarce. Poszczególne symulacje działają także offline, a strona główna wczytująca ten README wymaga serwera HTTP lub GitHub Pages.

**[Otwórz symulacje w przeglądarce](https://november7.github.io/PhysicsLab/)**

### Charakter i przeznaczenie projektu

**Projekt jest materiałem pokazowym, niezweryfikowanym i nie jest materiałem edukacyjnym.** Ma służyć przede wszystkim jako inspiracja do tworzenia podobnych interaktywnych materiałów, wizualizacji i interfejsów.

Symulacje, opisy, wzory, obliczenia oraz ilustracje mogą zawierać błędy, nieścisłości lub uproszczenia. Projekt nie przeszedł weryfikacji merytorycznej ani dydaktycznej. Nie należy traktować go jako wiarygodnego źródła wiedzy fizycznej, podręcznika ani podstawy do obliczeń wymagających poprawności naukowej.

Przed wykorzystaniem pomysłów lub kodu we własnych materiałach edukacyjnych należy niezależnie zweryfikować modele, założenia, obliczenia i opisy. Informacja o pokazowym charakterze projektu opisuje jego przeznaczenie i ograniczenia, nie wprowadza dodatkowych ograniczeń praw przyznanych przez licencję GPL v3.

### Dostępne symulacje

[![GitHub Pages](https://img.shields.io/badge/GitHub-Pages-blue?logo=github)](https://november7.github.io/PhysicsLab/)

Wybierz moduł, a następnie zmieniaj parametry i przeciągaj dostępne obiekty, aby obserwować zmiany wizualizacji. Interfejs symulacji jest w języku polskim.

### Uruchomienie lokalne

Projekt jest statyczną stroną — nie wymaga instalowania zależności ani kompilacji. Do korzystania z symulacji potrzebna jest przeglądarka z włączonym JavaScriptem. Do uruchomienia całej strony lokalnie potrzebny jest również serwer HTTP; poniższy przykład korzysta z Pythona 3.

1. Pobierz repozytorium jako ZIP i rozpakuj je lub sklonuj je za pomocą Git:

   ```sh
   git clone https://github.com/november7/PhysicsLab.git
   cd PhysicsLab
   ```

2. W katalogu projektu uruchom serwer:

   ```sh
   python -m http.server 8000 --bind 127.0.0.1
   ```

3. Otwórz [http://localhost:8000](http://localhost:8000) w przeglądarce. Aby zatrzymać serwer, naciśnij `Ctrl+C` w terminalu.

Na Windows możesz użyć `py` zamiast `python`, a na macOS i Linux — `python3`.

Poszczególne pliki symulacji, np. `newton.html`, można też otworzyć bezpośrednio z dysku, zachowując plik `styles.css` w tym samym katalogu. Strona główna pobiera `README.md` i `simulations.json` przez `fetch`, dlatego wymaga serwera HTTP.

### Struktura projektu

```text
PhysicsLab/
├── vendor/              # Lokalne kopie bibliotek zewnętrznych
├── simulations.json     # Katalog modułów wyświetlany na stronie głównej
├── index.html           # Strona główna i lista symulacji
├── newton.html          # Symulacje zasad dynamiki Newtona
├── optics.html          # Symulacje optyczne
├── magnetic-field.html  # Symulacja pola magnetycznego
├── ...                  # Kolejne pliki symulacji
├── styles.css           # Wspólne style
├── .gitignore           # Reguły ignorowania plików, w tym katalogu tests/
├── README.md            # Dokumentacja wyświetlana także na stronie głównej
└── LICENSE              # Pełny tekst licencji
```

### Testy i rozwój

Katalog `tests/` jest przeznaczony na lokalne testy i jest pomijany przez Git zgodnie z regułami w `.gitignore`. Nie jest częścią repozytorium pobieranego przez klonowanie lub jako ZIP.

Jeśli masz lokalny katalog `tests/` z poniższymi plikami, uruchom testy w katalogu projektu. Korzystają one z wbudowanego modułu `node:test` w Node.js i nie wymagają dodatkowych pakietów:

```sh
node --test tests/newton.test.cjs tests/optics.test.cjs tests/magnetic-field.test.cjs
```

Testy sprawdzają wybrane obliczenia i zachowania interfejsu z uproszczonym modelem DOM. Nie zastępują kontroli działania w przeglądarce ani niezależnej weryfikacji merytorycznej.

Przy dodawaniu modułu uzupełnij `simulations.json`, aby pojawił się na stronie głównej. Po zmianach sprawdź odpowiednie symulacje w przeglądarce i uruchom testy, jeśli masz je lokalnie. Opisując błąd, podaj moduł, parametry, kroki odtworzenia oraz oczekiwany i rzeczywisty wynik.

### Autorstwo i wykorzystanie AI

Części kodu źródłowego zostały wygenerowane przy wsparciu narzędzi sztucznej inteligencji, a następnie przejrzane, zmodyfikowane i zintegrowane przez autora. Przegląd kodu przez autora nie oznacza weryfikacji poprawności fizycznej ani dydaktycznej materiałów.

### Licencja

Copyright (c) 2026 Marcin Kowalski.

Projekt jest udostępniany na licencji **GNU General Public License, wersja 3 (GPL-3.0)**. Identyfikator SPDX: `GPL-3.0-only`.

Pełny tekst licencji i szczegółowe warunki znajdują się w pliku [LICENSE](LICENSE). Jest to oryginalny angielski tekst [GNU GPL v3 opublikowany przez Free Software Foundation](https://www.gnu.org/licenses/gpl-3.0.html).

Licencja pozwala używać, kopiować, modyfikować i rozpowszechniać projekt na określonych w niej warunkach. Przy rozpowszechnianiu należy spełnić odpowiednie wymagania GPL v3, w tym dotyczące zachowania informacji o prawach autorskich i licencji, oznaczania zmian oraz udostępniania odpowiedniego kodu źródłowego. Rozpowszechniane zmodyfikowane wersje objęte GPL v3 muszą zachować tę licencję.

Projekt jest udostępniany bez gwarancji, w zakresie określonym w sekcjach 15 i 16 licencji. Powyższy opis jest skrótem i nie zastępuje pełnego tekstu [LICENSE](LICENSE). Zewnętrzne komponenty w katalogu `vendor/` zachowują własne licencje oraz informacje o prawach autorskich.

## English

PhysicsLab is a collection of demonstration-only interactive physics simulations built with HTML, CSS, and JavaScript. The examples run in a browser. Individual simulations also work offline, while the home page that loads this README requires an HTTP server or GitHub Pages.

**[Open the simulations in your browser](https://november7.github.io/PhysicsLab/)**

### Purpose and limitations

**This project is unverified demonstration material and is not educational material.** Its main purpose is to inspire the creation of similar interactive materials, visualizations, and interfaces.

The simulations, descriptions, formulas, calculations, and illustrations may contain errors, inaccuracies, or simplifications. The project has not undergone scientific or educational validation. It should not be treated as a reliable physics reference, a textbook, or a basis for calculations that require scientific accuracy.

Before reusing ideas or code in educational materials, independently verify the models, assumptions, calculations, and explanations. This statement describes the project's intended purpose and limitations; it does not impose additional restrictions on the rights granted by GPL v3.

### Available simulations

[![GitHub Pages](https://img.shields.io/badge/GitHub-Pages-blue?logo=github)](https://november7.github.io/PhysicsLab/)

Choose a module, then adjust its parameters and drag the available objects to observe changes in the visualization. The simulation interface is in Polish.

### Running locally

The project is a static website — no dependency installation or build step is required. The simulations require a browser with JavaScript enabled. Running the entire site locally also requires an HTTP server; the example below uses Python 3.

1. Download the repository as a ZIP archive and extract it, or clone it using Git:

   ```sh
   git clone https://github.com/november7/PhysicsLab.git
   cd PhysicsLab
   ```

2. Start the server from the project directory:

   ```sh
   python -m http.server 8000 --bind 127.0.0.1
   ```

3. Open [http://localhost:8000](http://localhost:8000) in your browser. To stop the server, press `Ctrl+C` in the terminal.

On Windows, you can use `py` instead of `python`; on macOS and Linux, use `python3`.

Individual simulation files, such as `newton.html`, can also be opened directly from disk, with `styles.css` kept in the same directory. The home page loads `README.md` and `simulations.json` using `fetch`, so it requires an HTTP server.

### Project structure

```text
PhysicsLab/
├── vendor/              # Local copies of third-party libraries
├── simulations.json     # Module catalog displayed on the home page
├── index.html           # Home page and simulation list
├── newton.html          # Newton's laws of motion simulations
├── optics.html          # Optics simulations
├── magnetic-field.html  # Magnetic field simulation
├── ...                  # Additional simulation files
├── styles.css           # Shared styles
├── .gitignore           # File ignore rules, including the tests/ directory
├── README.md            # Documentation also displayed on the home page
└── LICENSE              # Complete license text
```

### Testing and development

The `tests/` directory is intended for local tests and is ignored by Git according to the rules in `.gitignore`. It is not included when cloning the repository or downloading it as a ZIP archive.

If you have a local `tests/` directory containing the files listed below, run the tests from the project directory. They use Node.js's built-in `node:test` module and require no additional packages:

```sh
node --test tests/newton.test.cjs tests/optics.test.cjs tests/magnetic-field.test.cjs
```

The tests check selected calculations and interface behaviors using a simplified DOM model. They do not replace browser checks or independent scientific validation.

When adding a module, update `simulations.json` so it appears on the home page. After making changes, check the relevant simulations in a browser and run the tests if you have them locally. When reporting a bug, include the module, parameters, reproduction steps, and expected and actual results.

### Authorship and AI assistance

Parts of the source code were generated with the assistance of AI tools and subsequently reviewed, modified, and integrated by the author. The author's code review does not constitute scientific or educational validation of the materials.

### License

Copyright (c) 2026 Marcin Kowalski.

This project is licensed under the **GNU General Public License, version 3 (GPL-3.0)**. SPDX identifier: `GPL-3.0-only`.

See [LICENSE](LICENSE) for the complete license text and detailed terms. It contains the original English text of [GNU GPL v3 published by the Free Software Foundation](https://www.gnu.org/licenses/gpl-3.0.html).

The license permits use, copying, modification, and redistribution under its terms. Redistribution must comply with the applicable GPL v3 requirements, including preserving copyright and license notices, identifying changes, and providing the corresponding source code. Distributed modified versions covered by GPL v3 must remain under that license.

The project is provided without warranty to the extent described in sections 15 and 16 of the license. This summary does not replace the complete [LICENSE](LICENSE) text. Third-party components in `vendor/` retain their own licenses and copyright notices.
