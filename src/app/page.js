import Navbar from "@/components/layout/Navbar";
import Hero from "@/components/landing-page/Hero";
import Features from "@/components/landing-page/Features";
import Pricing from "@/components/landing-page/Pricing";
import Footer from "@/components/layout/Footer";
import PublicBookingWidget from "@/components/features/calendar/PublicBookingWidget";

export default function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col bg-background selection:bg-primary/30">
      <Navbar />
      <main className="flex-1 flex flex-col items-center w-full">
        <Hero />
        <Features />
        <section className="w-full max-w-6xl px-6 py-14">
          <div className="mb-5">
            <h2 className="text-2xl font-semibold">Zarezerwuj bezpłatną rozmowę</h2>
            <p className="text-sm text-muted-foreground">
              Wybierz dogodny dzień i godzinę, a my wrócimy z konsultacją.
            </p>
          </div>
        </section>
        <Pricing />
      </main>
      <Footer />
    </div>
  );
}