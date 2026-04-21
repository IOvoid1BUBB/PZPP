# Instrukcja Synchronizacji Bazy Danych i Prisma po Rebase

W związku ze znaczącymi zmianami w pliku `schema.prisma` i rozwiązaniem złożonych konfliktów (m.in. zmiany w modelu `StudentLessonNote`, relacjach oraz notyfikacjach), każdy członek zespołu musi zaktualizować swoje środowisko lokalne, aby uniknąć błędów związanych z bazą danych i typami.

Postępuj zgodnie z poniższymi krokami:

### Krok 1: Pobierz najnowsze zmiany z repozytorium
Upewnij się, że masz czysty stan repozytorium (brak niezatwierdzonych zmian), a następnie zaktualizuj branch:
```bash
git fetch origin
git checkout twoj-aktualny-branch
git pull --rebase origin main
```

### Krok 2: Regeneracja klienta Prisma
Ponieważ pliki wygenerowane przez Prismę różniły się między branchami i wystąpiły w nich konflikty (które zostały usunięte z repozytorium), musisz wygenerować klienta Prisma na nowo, w oparciu o aktualny plik `schema.prisma`:
```bash
npx prisma generate
```

### Krok 3: Aplikacja Migracji (Synchronizacja lokalnej bazy)
Twoja lokalna baza danych może być niezsynchronizowana z nowym plikiem schema (np. zmiana indexu w notatkach ucznia). Uruchom migracje w środowisku deweloperskim:
```bash
npx prisma migrate dev
```
_Jeśli używasz bazy produkcyjnej lub testowej bez możliwości resetowania, powinieneś użyć `npx prisma migrate deploy`._

### Krok 4: (Opcjonalnie) Twardy reset bazy danych
Jeśli `prisma migrate dev` rzuci błędem o niespójności historii migracji (drift), a Ty pracujesz na LOKALNEJ bazie, zresetuj ją do zera (uwaga: utracisz wszystkie lokalne dane):
```bash
npx prisma migrate reset
```
> **DATA LOSS WARNING:** Użycie komendy `npx prisma migrate reset` całkowicie usuwa obecne dane w lokalnej bazie i odtwarza tabele od nowa. Używaj tylko w ostateczności na środowisku lokalnym, NIGDY na produkcji.

### Krok 5: Weryfikacja spójności
Sprawdź, czy kompilator TS i Linter nie zgłaszają błędów (wywołania `findUnique` dla `StudentLessonNote` zostały zrefaktoryzowane):
```bash
npm run build
```

---

## Zasady zapobiegające błędom w przyszłości

1. Nigdy nie edytuj ręcznie plików znajdujących się w folderze `prisma/generated/` lub `node_modules/.prisma`. Są one generowane automatycznie.
2. Nigdy nie rozwiązuj konfliktów merge/rebase w wygenerowanych plikach Prisma w ciemno. Zawsze rozwiązuj je tylko w `schema.prisma`, usuń wygenerowany folder i wywołaj `npx prisma generate`.
3. Brak wykonania `npx prisma generate` spowoduje błędy TypeScript w IDE oraz Runtime Error ('Unknown arg... in...').
4. Jeśli zmuszasz zmiany do wejścia (`git push --force`) po rebase, upewnij się, że zespół wie o synchronizacji folderu `prisma/migrations`, by nie zgubić spójności bazy.
5. Unikaj force pushowania bez synchronizacji migracji i koordynuj zmiany w schemacie wewnątrz zespołu.

---

## Kroki naprawcze (Recovery Steps)

Jeżeli Prisma nadal wyświetla błędy niezgodności typów lub stare relacje, wykonaj poniższe kroki naprawcze:

1. Zamknij serwer deweloperski (`npm run dev`).
2. Usuń stare typy: 
   ```bash
   rm -rf node_modules/.prisma
   ```
   *(na Windowsie użyj `rmdir /s /q node_modules\.prisma`)*
3. Usuń folder wygenerowany (jeśli używasz niestandardowego wyjścia): 
   ```bash
   rm -rf prisma/generated/
   ```
4. Zreinstaluj zależności: 
   ```bash
   npm install
   ```
5. Wygeneruj klienta ponownie: 
   ```bash
   npx prisma generate
   ```
6. Uruchom serwer ponownie.
