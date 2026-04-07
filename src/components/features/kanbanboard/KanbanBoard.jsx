"use client";

import { DragDropContext } from "@hello-pangea/dnd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Ticket } from "lucide-react";
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
export default function KanbanBoard({ jiraIssues = [] }) {
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

        <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/40 p-3">
          {/* TODO: Rozszerzyć o dwukierunkową synchronizację statusów między Kanban a Jira. */}
          <div className="mb-2 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Ticket className="size-4 text-blue-700" />
              Zadania Jira (read-only)
            </h3>
            <span className="rounded-full border border-blue-200 bg-white px-2.5 py-1 text-xs font-medium text-blue-700">
              {jiraIssues.length}
            </span>
          </div>

          {jiraIssues.length < 1 ? (
            <p className="text-xs text-slate-600">
              Brak zadań do wyświetlenia lub brak aktywnej integracji Jira.
            </p>
          ) : (
            <div className="space-y-2">
              {jiraIssues.map((issue) => (
                <a
                  key={issue.id}
                  href={issue.url || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-start justify-between gap-3 rounded-lg border border-blue-100 bg-white px-3 py-2 text-sm hover:bg-blue-50"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-slate-900">
                      {issue.key}: {issue.summary}
                    </div>
                    <div className="text-xs text-slate-600">Status: {issue.status}</div>
                  </div>
                  <ExternalLink className="size-4 shrink-0 text-blue-700" />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </DragDropContext>
  );
}
