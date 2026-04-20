import { listDocuments } from "@/app/actions/documentActions";
import { getLeadsForSelect } from "@/app/actions/leadActions";
import DocumentUploadModal from "@/components/crm/DocumentUploadModal";

export const dynamic = "force-dynamic";

function formatLeadName(lead) {
  const first = lead?.firstName || "";
  const last = lead?.lastName || "";
  const full = `${first} ${last}`.trim();
  return full || lead?.email || "Lead";
}

export default async function DokumentyPage() {
  const documents = await listDocuments();
  const leads = await getLeadsForSelect();

  return (
    <section className="space-y-4 pb-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dokumenty</h1>
          <p className="text-sm text-muted-foreground">
            Lista dokumentów przypisanych do Twoich leadów.
          </p>
        </div>
        <DocumentUploadModal leads={leads} />
      </header>

      <div className="overflow-hidden rounded-xl border bg-background">
        <div className="grid grid-cols-[1.5fr_1fr_auto] gap-3 border-b px-4 py-3 text-xs font-semibold text-muted-foreground">
          <div>Tytuł</div>
          <div>Lead</div>
          <div className="text-right">Status</div>
        </div>

        <div className="divide-y">
          {(documents || []).map((d) => (
            <div
              key={d.id}
              className="grid grid-cols-[1.5fr_1fr_auto] items-center gap-3 px-4 py-3 text-sm"
            >
              <div className="min-w-0">
                <div className="truncate font-medium">{d.title}</div>
                <div className="truncate text-xs text-muted-foreground">{d.fileUrl}</div>
              </div>
              <div className="truncate text-muted-foreground">{formatLeadName(d.lead)}</div>
              <div className="text-right text-xs">
                <span
                  className={[
                    "inline-flex items-center rounded-full px-2 py-1 font-semibold",
                    d.isSigned
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700",
                  ].join(" ")}
                >
                  {d.isSigned ? "Podpisany" : "Do podpisu"}
                </span>
              </div>
            </div>
          ))}

          {(!documents || documents.length === 0) && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Brak dokumentów.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

