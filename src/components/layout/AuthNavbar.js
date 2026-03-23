"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
// Importuję ładną ikonkę strzałki i czapki studenckiej z lucide-react (macie to w paczkach!)
import { ArrowLeft, GraduationCap } from "lucide-react";
import { TrendingUp } from "lucide-react";

export default function AuthNavbar() {
  return (
    // Te klasy (relative, z-50, bg-white) są pancerne - tło nie ma prawa tu wejść
    <header className="relative z-50 bg-white border-b border-slate-100 w-full h-16 flex items-center shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6 relative">
        <div className="flex items-center gap-2 z-10">
          <TrendingUp className="size-5" />
          <div className="flex flex-col">
            <span className="text-sm font-bold leading-tight">IMS</span>
            <span className="text-[10px] text-muted-foreground leading-tight">
              Sprzedażowe centrum
              <br />
              dowodzenia
            </span>
          </div>
        </div>

        {/* Prawa strona - Przycisk "Strona Główna" zamiast logowania/rejestracji */}
        <Link href="/">
          <Button
            variant="ghost"
            className="text-slate-600 font-medium hover:text-slate-950 hover:bg-slate-100 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Strona Główna
          </Button>
        </Link>
      </div>
    </header>
  );
}