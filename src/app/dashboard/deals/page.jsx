"use client";

import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getDeals, getDealStats, updateDealStage, createDeal } from "@/app/actions/dealActions";
import { getLeads } from "@/app/actions/leadActions";
import DealCard from "@/components/crm/deals/DealCard";
import DealFormDialog from "@/components/crm/deals/DealFormDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PIPELINE_COLUMNS = [
  { stage: "DISCOVERY", title: "Odkrywanie", bg: "border-sky-100 bg-sky-50/55" },
  { stage: "PROPOSAL", title: "Propozycja", bg: "border-violet-100 bg-violet-50/55" },
  { stage: "NEGOTIATION", title: "Negocjacje", bg: "border-amber-100 bg-amber-50/55" },
  { stage: "WON", title: "Wygrana", bg: "border-emerald-100 bg-emerald-50/55" },
  { stage: "LOST", title: "Przegrana", bg: "border-gray-100 bg-gray-50/55" },
];

function formatCurrency(value) {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    minimumFractionDigits: 0,
  }).format(value);
}

export default function DealsPage() {
  const queryClient = useQueryClient();

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ["deals"],
    queryFn: () => getDeals(),
  });

  const { data: stats } = useQuery({
    queryKey: ["deal-stats"],
    queryFn: () => getDealStats(),
  });

  const { data: leads = [] } = useQuery({
    queryKey: ["leads"],
    queryFn: () => getLeads(),
  });

  const mutation = useMutation({
    mutationFn: ({ dealId, newStage }) => updateDealStage(dealId, newStage),
    onMutate: async ({ dealId, newStage }) => {
      await queryClient.cancelQueries({ queryKey: ["deals"] });
      const previous = queryClient.getQueryData(["deals"]);
      queryClient.setQueryData(["deals"], (old) =>
        (old || []).map((d) => (d.id === dealId ? { ...d, stage: newStage } : d))
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(["deals"], ctx.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["deal-stats"] });
    },
  });

  function handleDragEnd(result) {
    const { destination, source, draggableId } = result;
    if (!destination || source.droppableId === destination.droppableId) return;
    mutation.mutate({ dealId: draggableId, newStage: destination.droppableId });
  }

  async function handleCreateDeal(formData) {
    const result = await createDeal(formData);
    if (result.success) {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["deal-stats"] });
    }
    return result;
  }

  const statCards = [
    { title: "Wszystkie deale", value: stats?.totalDeals ?? 0 },
    { title: "Wartosc pipeline", value: formatCurrency(stats?.totalValue ?? 0) },
    { title: "Wazona wartosc", value: formatCurrency(stats?.weightedPipeline ?? 0) },
    { title: "Wygrane deale", value: stats?.wonDeals ?? 0 },
  ];

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Pipeline Deals</h1>
          <p className="text-sm text-muted-foreground">
            Przeciagaj deale miedzy etapami. Twórz nowe szanse sprzedazy.
          </p>
        </div>
        <DealFormDialog leads={leads} onSubmit={handleCreateDeal} />
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title} className="border-primary/40 bg-accent/50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-foreground">{card.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <p className="rounded-xl border bg-accent/30 px-4 py-3 text-sm text-muted-foreground">
          Ladowanie pipeline...
        </p>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            {PIPELINE_COLUMNS.map((col) => {
              const columnDeals = deals.filter((d) => d.stage === col.stage);
              return (
                <section
                  key={col.stage}
                  className={`rounded-2xl border p-3 shadow-xs ${col.bg}`}
                >
                  <header className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-semibold tracking-wide text-slate-900">
                      {col.title}
                    </h2>
                    <span className="rounded-full border border-white/70 bg-white/80 px-2.5 py-1 text-xs font-medium text-slate-600">
                      {columnDeals.length}
                    </span>
                  </header>
                  <Droppable droppableId={col.stage}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`min-h-28 space-y-2 rounded-xl p-1.5 transition ${
                          snapshot.isDraggingOver ? "bg-white/45 ring-1 ring-primary/30" : ""
                        }`}
                      >
                        {columnDeals.map((deal, idx) => (
                          <DealCard key={deal.id} deal={deal} index={idx} />
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </section>
              );
            })}
          </div>
        </DragDropContext>
      )}
    </section>
  );
}
