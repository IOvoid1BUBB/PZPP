"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useToast } from "@/hooks/use-toast";

// Importujemy gotowe klocki z Waszego repozytorium (shadcn/ui)
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// ------------------------------------------------------------------
// Tła (Zostawiamy bez zmian - realizują design)
// ------------------------------------------------------------------
const BlurredBlobBackground = () => (
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
    <svg
      className="absolute w-full h-full blur-[64px]"
      viewBox="0 0 1301 674"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
    >
      <path
        d="M1300.5 0C788.038 121.171 503.664 111.376 0 0V674H1300.5V0Z"
        fill="#53F059"
      />
    </svg>
  </div>
);

const LineChartBackground = () => (
  <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-0 overflow-hidden opacity-50">
    <svg
      className="absolute w-full h-full"
      viewBox="0 0 1356 692"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
    >
      <path
        d="M361.9 324.2L365.9 320.3L361.9 316.4L358 320.3L361.9 324.2ZM526.5 491.4L522.6 495.2L526.5 499.2L530.4 495.2L526.5 491.4ZM820 193.1L824 189.3L820 185.3L816.1 189.3L820 193.1ZM992.9 368.8L989 372.6L992.9 376.6L996.8 372.6L992.9 368.8ZM1356 0L1294.7 16.9L1340 61.4L1356 0ZM0 692L3.9 695.8L365.9 328.1L361.9 324.2L358 320.3L-3.9 688.1L0 692ZM361.9 324.2L358 328.1L522.6 495.2L526.5 491.4L530.4 487.5L365.9 320.3L361.9 324.2ZM526.5 491.4L530.4 495.2L824 197L820 193.1L816.1 189.3L522.6 487.5L526.5 491.4ZM820 193.1L816.1 197L989 372.6L992.9 368.8L996.8 364.9L824 189.3L820 193.1ZM992.9 368.8L996.8 372.6L1325.2 39.1L1321.2 35.2L1317.3 31.4L989 364.9L992.9 368.8Z"
        fill="white"
        stroke="white"
        strokeWidth="11"
      />
    </svg>
  </div>
);

// ------------------------------------------------------------------
// Główny Komponent Strony
// ------------------------------------------------------------------
export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (response?.error) {
        toast({
          variant: "destructive",
          title: "Błąd logowania",
          description: "Nieprawidłowy adres email lub hasło.",
        });
      } else if (response?.ok) {
        toast({
          title: "Sukces",
          description: "Zalogowano pomyślnie. Trwa przekierowanie...",
        });
        router.push("/dashboard");
        router.refresh();
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Wystąpił błąd",
        description: "Brak odpowiedzi od serwera.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="relative flex-grow flex items-center justify-center py-20 px-4 w-full overflow-hidden">
      {/* Tła */}
      <BlurredBlobBackground />
      <LineChartBackground />

      {/* Karta formularza */}
      <Card className="w-full max-w-lg relative z-10 border-slate-100 shadow-2xl rounded-3xl p-6 sm:p-10">
        {/* Nagłówek karty z powiększonym tytułem i opisem */}
        <CardHeader className="text-center space-y-4 pt-0">
          <CardTitle className="text-4xl sm:text-5xl font-extrabold tracking-tighter text-slate-950">
            Witamy z powrotem
          </CardTitle>
          <CardDescription className="text-lg text-slate-600">
            Wprowadź swoje dane, aby uzyskać dostęp do konta.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8 pt-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="flex flex-col gap-4">
              {/* Grupa Email */}
              <div className="space-y-2.5">
                <Label
                  htmlFor="email"
                  className="text-sm font-semibold text-slate-900"
                >
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="twoj@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="font-medium px-4 py-3"
                />
              </div>

              {/* Grupa Hasło */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <Label
                    htmlFor="password"
                    className="text-sm font-semibold text-slate-900"
                  >
                    Hasło
                  </Label>
                  <Link
                    href="/forgot-password"
                    className="text-sm font-medium text-slate-500 hover:text-primary hover:underline transition-all"
                  >
                    Zapomniałeś hasła?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)} // Poprawiono błąd z setEmail na setPassword
                  required
                  disabled={isLoading}
                  className="font-medium px-4 py-3"
                />
              </div>
            </div>

            {/* Przycisk logowania - powiększony do 12px paddingu i font-semibold */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-14 mt-4 text-base font-semibold"
            >
              {isLoading ? "Logowanie..." : "Zaloguj się"}
            </Button>
          </form>
        </CardContent>

        {/* Stopka karty z poprawionymi spacingami i typography */}
        <CardFooter className="justify-center pt-8 pb-0">
          <p className="text-base text-slate-600">
            Nie masz jeszcze konta?{" "}
            <Link
              href="/register"
              className="font-semibold text-slate-950 hover:underline hover:text-primary transition-all"
            >
              Zarejestruj się
            </Link>
          </p>
        </CardFooter>
      </Card>
    </section>
  );
}
