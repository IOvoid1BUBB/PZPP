export default function Features() {
  return (
    <section id="features" className="w-full py-16 md:py-24">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid gap-8 md:gap-12 lg:grid-cols-2 items-center mb-20 md:mb-32">
          <div className="order-2 lg:order-1">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl text-balance">
              Projektuj lejki, które same zarabiają
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Zapomnij o skomplikowanym kodzie. Dzięki edytorowi GrapesJS zbudujesz profesjonalne strony sprzedażowe w kilka minut. Wybieraj gotowe bloki, przeciągaj elementy i publikuj pod własną domeną.
            </p>
          </div>
          <div className="order-1 lg:order-2">
            <div className="aspect-[4/3] w-full rounded-2xl bg-primary/20 border border-primary/10 shadow-sm" />
          </div>
        </div>

        <div className="grid gap-8 md:gap-12 lg:grid-cols-2 items-center">
          <div className="order-2">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl text-balance">
              Zarządzaj relacjami bez chaosu
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Każdy lead ma swoją historię. Nasz CRM automatycznie gromadzi maile, SMS-y i notatki w jednym widoku. Dzięki inteligentnym listom zawsze wiesz, kto jest gotowy do zakupu, a kto wymaga przypomnienia.
            </p>
          </div>
          <div className="order-1">
            <div className="aspect-[4/3] w-full rounded-2xl bg-primary/20 border border-primary/10 shadow-sm" />
          </div>
        </div>
      </div>
    </section>
  )
}