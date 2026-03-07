````markdown
# 🚀 Jak dodawać i testować kod (Workflow Zespołu)

Ten dokument opisuje krok po kroku, jak bierzemy zadanie, piszemy kod, testujemy go i wrzucamy na serwer. **Prosimy o ścisłe trzymanie się tych zasad, aby uniknąć konfliktów w repozytorium!**

## KROK 1: Wybierz zadanie z tablicy

Nie piszemy kodu "w ciemno". Każda funkcja musi mieć swoje przypisane zadanie (Issue).

1. Wejdź na naszą tablicę **GitHub Projects**.
2. Wybierz zadanie z kolumny **Backlog** lub **Ready**.
3. Kliknij w nie i w prawym panelu przypisz je do siebie (**Assignees** -> Twój nick).
4. Przesuń kartę do kolumny **In progress**.
5. Zwróć uwagę na **numer zadania** (np. `#12`), będzie Ci zaraz potrzebny.

## KROK 2: Przygotuj środowisko lokalne

Zawsze zaczynaj pracę od upewnienia się, że masz najnowszy kod z głównej gałęzi, a następnie stwórz własną, izolowaną gałąź na swoje zadanie.

```bash
# 1. Przejdź na główną gałąź
git checkout main

# 2. Pobierz najnowsze zmiany od reszty zespołu
git pull origin main

# 3. Zainstaluj paczki (na wypadek, gdyby ktoś dodał nowe biblioteki)
npm install

# 4. Stwórz nową gałąź z numerem zadania i krótką nazwą
git checkout -b feature/12-tabela-crm
```
````

## KROK 3: Kodowanie i Testowanie Lokalne

Teraz piszesz kod w odpowiednim folderze. Kiedy skończysz, **musisz sprawdzić, czy nic nie wybuchło na Twoim komputerze**, zanim wyślesz to reszcie.

1. **Odpal aplikację:** Wpisz `npm run dev` i przeklikaj swoją funkcję w przeglądarce (`localhost:3000`).
2. **Sprawdź błędy (Linter):** Wpisz `npm run lint`. Jeśli wyskoczą błędy, popraw je. Kod z błędami lintera nie przejdzie Code Review!
3. **Test budowania (Zalecane):** Wpisz `npm run build`. To zasymuluje tworzenie wersji produkcyjnej. Jeśli przejdzie bez czerwonych błędów, kod jest w 100% bezpieczny.

## KROK 4: Commit i Push

Zapisz swoją pracę i wyślij na GitHuba.

```bash
# 1. Dodaj wszystkie zmienione pliki
git add .

# 2. Stwórz commit z jasnym opisem (co dokładnie zrobiłeś)
git commit -m "feat: dodano sortowanie w tabeli leadów dla CRM"

# 3. Wypchnij swoją gałąź na serwer (pamiętaj o odpowiedniej nazwie gałęzi!)
git push -u origin feature/12-tabela-crm
```

## KROK 5: Pull Request i Magiczne Słowo

Czas na połączenie Twojego kodu z główną aplikacją.

1. Wejdź na repozytorium na GitHubie. Zobaczysz żółty baner proponujący stworzenie **Pull Requesta (PR)**. Kliknij zielony przycisk.
2. W tytule wpisz zwięźle, co zrobiłeś (np. `Dodano tabelę CRM`).
3. **BARDZO WAŻNE:** W opisie PR (Description) musisz wpisać magiczne słowo łączące PR z naszą tablicą:
   > **Closes #12** _(gdzie 12 to numer Twojego zadania)_
4. Kliknij **Create Pull Request**. Twoja karta na tablicy sama przeskoczy do kolumny **In review**.

## KROK 6: Code Review i Merge

**ZŁOTA ZASADA: Nigdy nie akceptujesz własnego Pull Requesta!**

1. Napisz na czacie zespołu: _"Hej, wrzuciłem tabelę CRM, zerknijcie na PR"_.
2. Ktoś inny z zespołu wchodzi w Twój kod, czyta go i jeśli jest okej, zatwierdza go (klika **Approve**).
3. Osoba sprawdzająca klika **Merge pull request**.
4. GitHub automatycznie zamyka zadanie i przenosi kartę do **Done**.

## KROK 7: Posprzątaj po sobie

Gdy Twój kod jest już bezpiecznie na gałęzi `main`, wróć do swojego terminala w VS Code i przygotuj się na kolejne zadanie:

```bash
# Wracasz na główną gałąź
git checkout main

# Pobierasz połączony kod
git pull origin main

# Usuwasz swoją starą gałąź (nie jest już potrzebna)
git branch -d feature/12-tabela-crm
```

**Gotowe! Bierzemy kolejne zadanie z Backlogu.** 🚀

```

```
