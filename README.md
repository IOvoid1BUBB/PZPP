# Uruchomienie aplikacji lokalnie (demo na localhost)

Ten projekt to aplikacja **Next.js** z bazą **PostgreSQL** i **Prisma**. Poniżej jest “happy path” uruchomienia demo na `http://localhost:3000`.

## Wymagania

- **Node.js >= 22** (wymagane przez `package.json`)
- **PostgreSQL** (lokalnie lub w Dockerze)

## 1) Instalacja zależności

```bash
npm install
```

## 2) Konfiguracja `.env`

Skopiuj plik przykładowy:

```bash
cp .env.example .env
```

Minimalnie ustaw w `.env`:

- `DIRECT_URL` (wymagane do migracji Prisma)
- `DATABASE_URL` (używane jako fallback w runtime)
- `NEXTAUTH_SECRET` (dowolny długi sekret)

Przykład dla lokalnego Postgresa na Dockerze (ważne: **schemat `public`**):

```env
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/pzpp?schema=public"
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/pzpp?schema=public"
NEXTAUTH_SECRET="wstaw_dowolny_dlugi_sekret"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

Wygenerowanie sekretu (przykład):

```bash
openssl rand -base64 32
```

## 3) Uruchom PostgreSQL (demo)

Jeśli nie masz lokalnego Postgresa, najprościej użyć Dockera:

```bash
docker run --name pzpp-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=pzpp -p 5432:5432 -d postgres:16
```

## 4) Migracje + seed (dane demo)

```bash
npx prisma migrate dev
npx prisma db seed
```

Seed tworzy konta demo (hasło: **`password123`**):

- **Kreator**: `kreator1@test.pl`
- **Kreator**: `kreator2@test.pl`
- **Uczeń**: `student1@test.pl`
- **Uczeń**: `student2@test.pl`

## 5) Start aplikacji

```bash
npm run dev
```

Otwórz w przeglądarce: `http://localhost:3000`

## (Opcjonalnie) Podgląd maili lokalnie

W `.env.example` jest konfiguracja pod lokalny SMTP. Możesz uruchomić Maildev:

```bash
npx maildev --smtp 1025 --web 1080
```

Panel Maildev: `http://localhost:1080`

## Najczęstsze problemy

- Jeśli po zmianach w `prisma/schema.prisma` masz błędy Prisma/typów, zajrzyj do `PRISMA_RECOVERY.md`.
