import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // 1. Jeśli ktoś próbuje wejść do Panelu Kreatora (Dashboard)
    if (
      path.startsWith("/dashboard") &&
      token?.role !== "KREATOR" &&
      token?.role !== "ADMIN"
    ) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // 2. Jeśli ktoś próbuje wejść do Portalu Studenta
    if (path.startsWith("/student") && token?.role !== "UCZESTNIK") {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  },
  {
    callbacks: {
      // Middleware odpali się tylko, jeśli użytkownik jest zalogowany (ma token)
      authorized: ({ token }) => !!token,
    },
  }
);

// KROK 3: Konfiguracja - które ścieżki ma sprawdzać bramkarz?
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/student/:path*",
    // Tu dodaj inne chronione ścieżki
  ],
};
