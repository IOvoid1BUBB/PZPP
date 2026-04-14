# 🗺️ Architektura Katalogów (Next.js App Router)

Poniżej znajduje się oficjalna struktura plików dla naszej platformy marketingowej. Proszę trzymać się tego podziału podczas tworzenia nowych funkcjonalności!

### 🛠 Stack Technologiczny

Nasza aplikacja opiera się na nowoczesnym, darmowym stacku full-stack (JavaScript/TypeScript):

- **Framework Główny:** Next.js (z App Routerem). Serwuje zarówno interfejs użytkownika, jak i obsługuje komunikację backendową (API/Server Actions).
- **Frontend:** React.js z wykorzystaniem TailwindCSS do budowy nowoczesnego i responsywnego interfejsu.
- **Komunikacja z API i Stan Aplikacji:** React Query (TanStack Query) do dynamicznych komponentów (np. kalendarz, kreator).
  > **Dlaczego React Query, a nie Redux?** Ponieważ nasza aplikacja opiera się na ciągłym pobieraniu i aktualizowaniu danych z serwera (leady, spotkania, statystyki). React Query to tzw. _server-state manager_ – automatycznie cache'uje zapytania, odświeża dane w tle, zarządza stanami ładowania (loading/error) i redukuje ilość kodu boilerplate o 80% w porównaniu do Reduxa. Resztę stanu trzymamy w natywnych funkcjach serwera Next.js.

```text
PZPP_PROJEKT_1/
├── prisma/
│   └── schema.prisma         <-- Tutaj definiujemy modele bazy danych (User, Lead, Course, itd.)
├── public/                   <-- Statyczne pliki: obrazki, logo, ikony
└── src/
    ├── components/           <-- Reużywalne komponenty React
    │   ├── layout/           <-- Komponenty strukturalne (Navbar, Sidebar, Footer)
    │   ├── ui/               <-- Małe elementy interfejsu (Button, Input, Modal)
    │   └── features/         <-- Złożone bloki logiczne (np. KanbanBoard dla CRM)
    │
    ├── lib/                  <-- Konfiguracje i narzędzia pomocnicze
    │   ├── prisma.js         <-- Inicjalizacja klienta bazy danych
    │   └── utils.js          <-- Funkcje pomocnicze (np. łączenie klas Tailwind)
    │
    └── app/                  <-- GŁÓWNY ROUTING APLIKACJI
        │
        ├── (dashboard)/      <-- ŚWIAT 1: PANEL KREATORA (Dla właściciela biznesu)
        │   ├── layout.js     <-- Boczny pasek nawigacji (Sidebar)
        │   ├── page.js       <-- Główny ekran (Statystyki i Dashboard)
        │   ├── crm/          <-- Zarządzanie kontaktami i leadami
        │   ├── kalendarz/    <-- Zarządzanie spotkaniami
        │   ├── wiadomosci/   <-- Komunikacja i ujednolicony Inbox
        │   ├── kreator/      <-- Lejki sprzedaży i landing pages
        │   ├── dokumenty/    <-- Pliki i E-Signing
        │   └── kursy/        <-- Zarządzanie materiałami i modułami
        │
        ├── (public)/         <-- ŚWIAT 2: STRONA OFERTOWA (Dla niezalogowanych)
        │   ├── layout.js     <-- Publiczny górny pasek (Navbar)
        │   ├── oferta/
        │   ├── cennik/
        │   ├── login/        <-- Logowanie
        │   └── register/     <-- Rejestracja
        │
        ├── (student)/        <-- ŚWIAT 3: PORTAL UCZNIA (Dla klientów)
        │   ├── layout.js     <-- Uproszczone menu nawigacyjne kursanta
        │   ├── page.js       <-- Lista zakupionych materiałów
        │   └── kursy/
        │       └── [courseId]/ <-- Dynamiczny routing do konkretnego wideo
        │
        ├── api/              <-- BACKEND (Route Handlers)
        │   ├── auth/         <-- Endpointy NextAuth.js
        │   ├── leads/        <-- Endpointy do dodawania leadów
        │   └── webhooks/     <-- Odbieranie danych z zewnątrz
        │
        ├── favicon.ico
        ├── globals.css       <-- Główne style TailwindCSS
        ├── layout.js         <-- Root Layout (tu podpinamy React Query i fonty)
        └── page.js           <-- Główny plik przekierowujący na (public)
```

## 🗺️ Roadmapa i Architektura Sprzedaży

Szczegółowy przepływ od GrapesJS do płatności Stripe znajdziesz w dedykowanym pliku:
👉 [Architektura Sprzedaży Kursów](COURSE_SALES_FLOW.md)

## Wypełnienie bazy danych

```bash

# Wypełnij bazę danymi demo (kreatorzy, studenci, kursy)
npx prisma db seed

```
