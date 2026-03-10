import { TrendingUp } from "lucide-react"

export default function Footer() {
  return (
    <footer className="w-full border-t py-8 mt-auto">
      <div className="container mx-auto px-4 md:px-6 flex flex-col items-center gap-4">
        <div className="flex items-center gap-2">
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
        
        <p className="text-sm text-muted-foreground text-center">
          Wykonano przez Wódeczka. Wszelkie prawa zastrzeżone 2026
        </p>
      </div>
    </footer>
  )
}