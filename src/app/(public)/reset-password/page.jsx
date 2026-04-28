"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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

const BlurredBlobBackground = () => (
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
    <svg
      className="absolute w-full h-full blur-[64px]"
      viewBox="0 0 1301 674"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
    >
      <path d="M1300.5 0C788.038 121.171 503.664 111.376 0 0V674H1300.5V0Z" fill="#53F059" />
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

const MIN_PASSWORD_LENGTH = 8;

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token")?.trim() || "", [searchParams]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({
    token: null,
    password: null,
    confirmPassword: null,
  });
  const [formError, setFormError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    if (!token) {
      setFieldErrors((prev) => ({
        ...prev,
        token: "Brakuje tokenu resetującego. Otwórz link z wiadomości e-mail.",
      }));
    }
  }, [token]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = { token: null, password: null, confirmPassword: null };
    if (!token) nextErrors.token = "Brakuje tokenu resetującego. Otwórz link z wiadomości e-mail.";
    if (!password) nextErrors.password = "Nowe hasło jest wymagane.";
    if (password && password.length < MIN_PASSWORD_LENGTH) {
      nextErrors.password = `Hasło musi mieć co najmniej ${MIN_PASSWORD_LENGTH} znaków.`;
    }
    if (!confirmPassword) nextErrors.confirmPassword = "Potwierdzenie hasła jest wymagane.";
    if (password && confirmPassword && password !== confirmPassword) {
      nextErrors.confirmPassword = "Podane hasła muszą być identyczne.";
    }

    setFieldErrors(nextErrors);
    setFormError(null);
    setSuccessMessage(null);

    if (nextErrors.token || nextErrors.password || nextErrors.confirmPassword) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });
      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        setFieldErrors({
          token: payload?.fieldErrors?.token ?? null,
          password: payload?.fieldErrors?.password ?? null,
          confirmPassword: payload?.fieldErrors?.confirmPassword ?? null,
        });
        setFormError(payload?.error || "Nie udało się zmienić hasła.");
        return;
      }

      setSuccessMessage(payload?.message || "Hasło zostało zmienione. Trwa przekierowanie...");
      setTimeout(() => {
        router.push("/login");
      }, 1200);
    } catch (_error) {
      setFormError("Brak odpowiedzi od serwera.");
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
            Ustaw nowe hasło
          </CardTitle>
          <CardDescription className="text-lg text-slate-600">
            Wpisz nowe hasło i potwierdź je, aby zakończyć reset.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8 pt-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
            {formError ? (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {formError}
              </div>
            ) : null}
            {successMessage ? (
              <div
                role="status"
                className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
              >
                {successMessage}
              </div>
            ) : null}
            {fieldErrors.token ? (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {fieldErrors.token}
              </div>
            ) : null}

            <div className="space-y-2.5">
              <Label htmlFor="password" className="text-sm font-semibold text-slate-900">
                Nowe hasło
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-errormessage={fieldErrors.password ? "reset-password-password-error" : undefined}
                disabled={isLoading}
                className="font-medium px-4 py-3"
              />
              {fieldErrors.password ? (
                <p id="reset-password-password-error" className="text-red-500 text-sm mt-1">
                  {fieldErrors.password}
                </p>
              ) : null}
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="confirmPassword" className="text-sm font-semibold text-slate-900">
                Potwierdź nowe hasło
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                aria-invalid={Boolean(fieldErrors.confirmPassword)}
                aria-errormessage={
                  fieldErrors.confirmPassword ? "reset-password-confirm-password-error" : undefined
                }
                disabled={isLoading}
                className="font-medium px-4 py-3"
              />
              {fieldErrors.confirmPassword ? (
                <p id="reset-password-confirm-password-error" className="text-red-500 text-sm mt-1">
                  {fieldErrors.confirmPassword}
                </p>
              ) : null}
            </div>

            <Button type="submit" disabled={isLoading} className="w-full h-14 mt-4 text-base font-semibold">
              {isLoading ? "Zapisywanie..." : "Zapisz hasło"}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center pt-8 pb-0">
          <p className="text-base text-slate-600">
            Wróć do{" "}
            <Link
              href="/login"
              className="font-semibold text-slate-950 hover:underline hover:text-primary transition-all"
            >
              logowania
            </Link>
          </p>
        </CardFooter>
      </Card>
    </section>
  );
}
