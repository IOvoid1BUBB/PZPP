import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight } from "lucide-react"

const plans = [
  {
    name: "Plan free",
    price: "0 zł",
    period: "mies",
    features: [
      "Do 100 kontaktów w CRM",
      "1 aktywny lejek sprzedażowy",
      "Podstawowa analityka konwersji",
      "Wspólna skrzynka odbiorcza (Unified Inbox)",
      "Branding platformy na stronach",
    ],
    cta: "Zacznij teraz",
    variant: "outline",
    highlighted: false,
  },
  {
    name: "Plan premium",
    price: "199 zł",
    period: "mies",
    features: [
      "Nielimitowana liczba leadów i inteligentne listy",
      "Nielimitowane lejki i strony Landing Page",
      "Pełny moduł Kursów i Portalu Studenta",
      "E-podpisy i zarządzanie dokumentami",
      "Zaawansowane automatyzacje e-mail/SMS",
      "Własna domena i brak brandingu platformy",
    ],
    cta: "Kup teraz i skaluj",
    variant: "default",
    highlighted: true,
  },
]

export default function Pricing() {
  return (
    <section className="w-full py-16 md:py-24">
      <div className="container mx-auto px-4 md:px-6">
        <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl mb-12">
          Cennik
        </h2>

        <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={
                plan.highlighted
                  ? "bg-primary/5 border-primary shadow-lg"
                  : "border-border/50"
              }
            >
              <CardHeader>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <div className="mt-2">
                  <span className="text-lg font-semibold">Cena {plan.price}</span>
                  <span className="text-muted-foreground"> / {plan.period}</span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="font-medium mb-3">Zawiera</p>
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <ArrowRight className="size-4 mt-0.5 shrink-0 text-primary" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button variant={plan.variant} className="w-auto">
                  {plan.cta}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}