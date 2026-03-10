import Navbar from "@/components/layout/Navbar";
import Hero from "@/components/landing-page/Hero";
import Features from "@/components/landing-page/Features";
import Pricing from "@/components/landing-page/Pricing";
import Footer from "@/components/layout/Footer";

export default function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col bg-background selection:bg-primary/30">
      <Navbar />
      <main className="flex-1 flex flex-col items-center w-full">
        <Hero />
        <Features />
        <Pricing />
      </main>
      <Footer />
    </div>
  );
}