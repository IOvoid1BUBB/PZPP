# 🗺️ Architektura Sprzedaży Kursów: Od Kreatora do Portalu Studenta

Ten dokument opisuje dokładny, techniczny przepływ (flow) sprzedaży kursów w naszej platformie: od momentu stworzenia strony przez twórcę, aż do zalogowania się studenta na kurs. 

Zadania dla zespołu są przypisane do konkretnych etapów tego lejka.

---

## 🏗️ KROK 1: Publikacja Oferty (Frontend / Kreator)
Twórca używa wbudowanego edytora, aby zbudować i opublikować stronę sprzedażową.

* **Edytor (GrapesJS):** W pliku `src/components/features/builder/GrapesEditor.jsx` twórca układa stronę.
* **Przycisk "Kup Teraz":** Twórca przeciąga nasz customowy blok sprzedażowy (Stripe) i w jego opcjach wybiera kurs, który chce sprzedawać (przekazanie `courseId`).
* **Zapis i Routing:** Projekt ląduje w bazie w tabeli `LandingPage` wraz z kodem HTML/CSS oraz unikalnym adresem `slug`. 
* **Publikacja:** Strona jest dostępna publicznie pod dynamicznym adresem (np. `/l/[slug]`).

## 💳 KROK 2: Transakcja (Stripe Checkout)
Klient wchodzi na opublikowany Landing Page i klika przycisk zakupu.

* **Inicjalizacja płatności:** Przycisk z landinga uderza w nasz wewnętrzny endpoint `/api/stripe/checkout`.
* **Sesja Stripe:** Nasz backend generuje bezpieczną sesję Checkout. W metadanych (metadata) sesji obowiązkowo zaszyte jest `courseId`, aby system wiedział po płatności, do jakiego kursu nadać dostęp.
* **Płatność:** Klient opłaca zamówienie na hostowanej stronie Stripe.

## ⚙️ KROK 3: Provisioning i Automatyzacja (Backend / Webhook)
Magia dzieje się w tle ułamki sekund po udanej płatności.

* **Nasłuchiwanie:** Nasz endpoint `/api/stripe/webhook` odbiera zdarzenie `checkout.session.completed` i weryfikuje jego sygnaturę.
* **Utworzenie Konta:** System sprawdza e-mail kupującego. Jeśli to nowy klient, generuje dla niego losowe hasło, hashuje je przez `bcryptjs` (kompatybilność z `src/lib/auth.js`) i tworzy profil `User` z rolą `UCZESTNIK`.
* **Nadanie Dostępu:** System tworzy rekord w tabeli `Enrollment`, łącząc nowo utworzonego `User` z zakupionym `Course`. 
* **Logika transakcyjna:** Transakcja Stripe zostaje zapisana w bazie (tabela `Order`/`Payment`), a logika bazy zapobiega dublowaniu zapisów na ten sam kurs.

## 📧 KROK 4: Dostarczenie Danych Logowania (Komunikacja)
Student musi otrzymać dostęp do platformy.

* **Wysyłka e-maila:** Bezpośrednio po utworzeniu konta, webhook wywołuje funkcję z `src/lib/nodemailer.js`.
* **Szablon:** System używa komponentu `@react-email` z pliku `src/emails/templates/CourseEnrollmentConfirmation.jsx`.
* **Treść:** Klient otrzymuje estetycznego maila zawierającego nazwę kursu, wygenerowany login (e-mail), hasło oraz link do ekranu logowania platformy.

## 🎓 KROK 5: Konsumpcja Treści (Portal Studenta)
Uczeń loguje się na platformę i rozpoczyna naukę.

* **Dashboard Studenta:** Po zalogowaniu uczestnik trafia na widok `/student`. System renderuje listę przypisanych do niego kursów na podstawie tabeli `Enrollment`.
* **Odtwarzacz (VOD):** Uczeń ogląda materiały w bezpiecznym, zamkniętym odtwarzaczu (opartym na `react-player`).
* **Zapis Postępu:** Po każdej lekcji system uaktualnia wartość procentową pola `progress` w tabeli `Enrollment`.
* **Certyfikacja:** Gdy postęp osiągnie 100%, backend automatycznie generuje wpis w tabeli `Certificate`, jako dowód ukończenia szkolenia.

---
### 👁️ Widok Twórcy (CRM)
W tym samym czasie twórca widzi pełen obraz sytuacji w swoim panelu:
1. Wie o nowej płatności w module analityki.
2. Klient pojawia się jako nowy kontakt w tabeli Leady/Klienci.
3. W zakładce analityki kursów, twórca może podejrzeć dokładny procent ukończenia (`progress`) poszczególnych studentów.
