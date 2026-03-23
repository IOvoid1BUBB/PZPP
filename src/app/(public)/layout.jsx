import AuthNavbar from "@/components/layout/AuthNavbar"; // <-- Zmieniony import
import Footer from "@/components/layout/Footer";

export default function PublicLayout({ children }) {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Używamy naszego nowego, czystego Navbaru */}
      <AuthNavbar />

      {/* Główna zawartość strony (logowanie / rejestracja) */}
      <main className="flex-grow flex flex-col relative w-full">
        {children}
      </main>

      {/* Globalna stopka */}
      <Footer />
    </div>
  );
}