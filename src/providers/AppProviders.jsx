"use client";

import { SessionProvider } from "next-auth/react";

export default function AppProviders({ children }) {
  return <SessionProvider>{children}</SessionProvider>;
}

