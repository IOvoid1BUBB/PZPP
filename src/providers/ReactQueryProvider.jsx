"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export default function ReactQueryProvider({ children }) {
  // Trzymamy instancję w stanie, aby nie tworzyła się na nowo przy każdym renderze
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // Dane uznawane za "świeże" przez 1 minutę
            refetchOnWindowFocus: false, // Nie odświeża przy zmianie zakładki
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}