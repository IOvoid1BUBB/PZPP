"use client";

import { DragDropContext } from "@hello-pangea/dnd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getLeads, updateLeadStatus } from "@/app/actions/leadActions";
import KanbanColumn from "./KanbanColumn";

const KANBAN_COLUMNS = [
  { status: "NEW", title: "Nowe" },
  { status: "CONTACTED", title: "W trakcie uzgadniania" },
  { status: "WON", title: "Sprzedane" },
];

// Zwraca nowa tablice leadow po poprawnym przeniesieniu karty.
function optimisticallyMoveLead(leads, leadId, newStatus) {
  return (leads || []).map((lead) =>
    lead.id === leadId ? { ...lead, status: newStatus } : lead
  );
}

// Kontener glownej tablicy Kanban dla leadow.
export default function KanbanBoard() {
  const queryClient = useQueryClient();

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: () => getLeads(),
  });

  const mutation = useMutation({
    mutationFn: ({ leadId, newStatus }) => updateLeadStatus(leadId, newStatus),
    onMutate: async ({ leadId, newStatus }) => {
      await queryClient.cancelQueries({ queryKey: ["leads"] });

      const previousLeads = queryClient.getQueryData(["leads"]);
      queryClient.setQueryData(["leads"], (currentLeads) =>
        optimisticallyMoveLead(currentLeads, leadId, newStatus)
      );

      return { previousLeads };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousLeads) {
        queryClient.setQueryData(["leads"], context.previousLeads);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });

  // Obsluga zakonczenia DnD pomiedzy kolumnami.
  function handleDragEnd(result) {
    const { destination, source, draggableId } = result;
    if (!destination) return;

    const sourceStatus = source.droppableId;
    const destinationStatus = destination.droppableId;
    if (sourceStatus === destinationStatus) return;

    mutation.mutate({
      leadId: draggableId,
      newStatus: destinationStatus,
    });
  }

  if (isLoading) {
    return (
      <p className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-900/70">
        Ladowanie tablicy Kanban...
      </p>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm lg:p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Pipeline sprzedaży</h2>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            {leads.length} leadow
          </span>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {KANBAN_COLUMNS.map((column) => (
          <KanbanColumn
            key={column.status}
            status={column.status}
            title={column.title}
            leads={leads.filter((lead) => lead.status === column.status)}
          />
        ))}
        </div>
      </div>
    </DragDropContext>
  );
}
