"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

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

// Importujemy Twoją akcję z backendu
import { registerUser } from "./actions";

// ------------------------------------------------------------------
// Tła
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
// Główny Komponent Strony Rejestracji
// ------------------------------------------------------------------
export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState(null); // 'teacher' | 'student' | null
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Front-endowa walidacja UX
    if (!role) {
      return toast({
        variant: "destructive",
        title: "Wybierz rolę",
        description: "Zaznacz, czy jesteś uczniem, czy chcesz tworzyć kursy.",
      });
    }
    if (password !== confirmPassword) {
      return toast({
        variant: "destructive",
        title: "Błąd hasła",
        description: "Podane hasła nie są identyczne.",
      });
    }

    setIsLoading(true);

    try {
      // Mapujemy UI roles na Prisma Enums
      const dbRole = role === "teacher" ? "KREATOR" : "UCZESTNIK";

      // Przygotowujemy dane do akcji serwerowej
      const formData = new FormData();
      formData.append("name", name);
      formData.append("email", email);
      formData.append("password", password);
      formData.append("role", dbRole);

      // Wywołanie Twojego backendu
      const result = await registerUser(formData);

      if (result?.error) {
        toast({
          variant: "destructive",
          title: "Błąd rejestracji",
          description: result.error, // Treść błędu prosto z backendu/zod
        });
      } else if (result?.success) {
        toast({
          title: "Sukces!",
          description: "Konto zostało utworzone. Możesz się teraz zalogować.",
        });
        router.push("/login"); // Przekierowanie na logowanie
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Krytyczny błąd",
        description: "Brak połączenia z serwerem bazy danych.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="relative flex-grow flex items-center justify-center py-20 px-4 w-full overflow-hidden">
      <BlurredBlobBackground />
      <LineChartBackground />

      <Card className="w-full max-w-lg relative z-10 border-slate-100 shadow-2xl rounded-3xl p-6 sm:p-10">
        <CardHeader className="text-center space-y-4 pt-0">
          <CardTitle className="text-4xl sm:text-5xl font-extrabold tracking-tighter text-slate-950">
            Utwórz konto
          </CardTitle>
          <CardDescription className="text-lg text-slate-600">
            Dołącz do nas, aby rozpocząć swoją przygodę.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="flex flex-col gap-4">
              {/* NOWE POLE: Imię (wymagane przez backend) */}
              <div className="space-y-2.5">
                <Label
                  htmlFor="name"
                  className="text-sm font-semibold text-slate-900"
                >
                  Imię
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Twoje imię"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isLoading}
                  className="font-medium px-4 py-3"
                />
              </div>

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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2.5">
                  <Label
                    htmlFor="password"
                    className="text-sm font-semibold text-slate-900"
                  >
                    Hasło
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="font-medium px-4 py-3"
                  />
                </div>

                <div className="space-y-2.5">
                  <Label
                    htmlFor="confirmPassword"
                    className="text-sm font-semibold text-slate-900"
                  >
                    Powtórz hasło
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="font-medium px-4 py-3"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <Label className="text-sm font-semibold text-slate-900">
                Kim jesteś?
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant={role === "student" ? "default" : "outline"}
                  onClick={() => setRole("student")}
                  className="h-12 font-semibold"
                >
                  Jestem uczniem
                </Button>
                <Button
                  type="button"
                  variant={role === "teacher" ? "default" : "outline"}
                  onClick={() => setRole("teacher")}
                  className="h-12 font-semibold"
                >
                  Chcę tworzyć kursy
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-14 mt-2 text-base font-semibold"
            >
              {isLoading ? "Rejestracja..." : "Zarejestruj się"}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center pt-2 pb-0">
          <p className="text-base text-slate-600">
            Masz już konto?{" "}
            <Link
              href="/login"
              className="font-semibold text-slate-950 hover:underline hover:text-primary transition-all"
            >
              Zaloguj się
            </Link>
          </p>
        </CardFooter>
      </Card>
    </section>
  );
}
