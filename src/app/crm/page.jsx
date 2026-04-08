import { prisma } from "@/lib/prisma";

// Importujemy Twoje zagubione komponenty z ich faktycznej ścieżki
import  LeadsTable  from "@/components/crm/LeadsTable"; 
import  LeadForm  from "@/components/crm/LeadForm";

// Zapobiegamy cache'owaniu - chcemy widzieć świeże dane przy każdym wejściu
export const dynamic = "force-dynamic";

export default async function CrmPage() {
  // 1. Serwer pobiera listę kontaktów z bazy danych
  const leads = await prisma.lead.findMany({
    orderBy: {
      createdAt: "desc", // Najnowsze na górze
    },
  });

  // 2. Serwer renderuje stronę i wstrzykuje dane do Twoich komponentów
  return (
    <div className="container mx-auto py-10 px-4">
      
      {/* Nagłówek i Formularz (np. w modalu lub po prostu na górze) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Panel CRM</h1>
          <p className="text-gray-500">Zarządzaj swoimi leadami i kontaktami.</p>
        </div>
        
        {/* Tu wpinamy Twój formularz (zakładam, że ma wbudowany przycisk/modal) */}
        <LeadForm />
      </div>

      {/* Tabela TanStack - przekazujemy jej pobrane dane */}
      <div className="bg-white rounded-lg shadow">
        <LeadsTable data={leads} />
      </div>
      
    </div>
  );
}