"use client"; // <-- DODAJEMY TĘ LINIJKĘ NA SAMEJ GÓRZE

import dynamic from "next/dynamic";

// Dynamicznie importujemy nasz komponent GrapesEditor i wyłączamy SSR
const GrapesEditor = dynamic(
  () => import("../../components/features/builder/GrapesEditor"),
  { 
    ssr: false,
    loading: () => <div className="p-8 text-center text-gray-500 font-bold">Ładowanie potężnego kreatora stron... 🚀</div>
  }
);

export default function BuilderPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Zbuduj swój lejek sprzedaży</h1>
          <p className="text-gray-600">Skorzystaj z edytora przeciągnij i upuść, aby zaprojektować Landing Page.</p>
        </div>
        
        {/* Renderujemy bezpieczny, dynamiczny komponent */}
        <GrapesEditor />
      </div>
    </div>
  );
}