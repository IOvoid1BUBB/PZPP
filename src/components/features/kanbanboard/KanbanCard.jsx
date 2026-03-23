"use client";

import { Draggable } from "@hello-pangea/dnd";

/**
 * Karta pojedynczego leada na tablicy Kanban.
 * @param {{
 * lead: { id: string, firstName: string, lastName?: string | null, email: string, status: string, source?: string | null },
 * index: number
 * }} props
 * @returns {JSX.Element}
 */
export default function KanbanCard({ lead, index }) {
  const fullName = [lead.firstName, lead.lastName].filter(Boolean).join(" ");

  return (
    <Draggable draggableId={lead.id} index={index}>
      {(provided, snapshot) => (
        <article
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={provided.draggableProps.style}
          className={`rounded-xl border border-white/80 bg-white/95 p-3.5 text-slate-900 shadow-sm transition-shadow ${
            snapshot.isDragging ? "ring-2 ring-emerald-300/70 shadow-md" : ""
          }`}
        >
          <h3 className="font-semibold text-slate-900">{fullName || "Bez imienia"}</h3>
          <p className="mt-1 text-sm text-slate-600">{lead.email}</p>
          <p className="mt-2 text-xs font-medium uppercase tracking-wide text-emerald-700/80">
            Zrodlo: {lead.source || "Nieznane"}
          </p>
        </article>
      )}
    </Draggable>
  );
}
