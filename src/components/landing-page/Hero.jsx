import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative w-full min-h-[100dvh] flex flex-col justify-center items-center overflow-hidden bg-white pt-16">

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-[#5ec269] rounded-full blur-[100px] opacity-40 animate-blob pointer-events-none z-0" />
      
      <div className="container relative z-10 mx-auto px-4 md:px-6 flex flex-col items-center text-center space-y-8">
        <div className="space-y-4 max-w-3xl">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-black">
            Zarządzaj swoim biznesem <br className="hidden sm:block" />
            <span>szybciej i prościej</span>
          </h1>
          <p className="mx-auto max-w-[700px] text-lg sm:text-xl md:text-2xl leading-relaxed text-black/80">
            Kompleksowe rozwiązanie CRM, które zautomatyzuje Twoją pracę, zwiększy sprzedaż i pozwoli Ci skupić się na tym, co najważniejsze.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-center pt-4">
          <Button size="lg" className="w-full sm:w-auto text-lg h-12 px-8 font-semibold border border-black bg-black text-white hover:bg-transparent hover:text-black active:bg-transparent active:text-black rounded-md transition-colors" asChild>
            <Link href="/register">Rozpocznij za darmo</Link>
          </Button>
          <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg h-12 px-8 font-semibold border-black text-black hover:bg-black hover:text-white rounded-md bg-transparent" asChild>
            <Link href="#features">Dowiedz się więcej</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}