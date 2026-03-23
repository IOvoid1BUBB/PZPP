"use client";

import { Droppable } from "@hello-pangea/dnd";
import KanbanCard from "./KanbanCard";

const COLUMN_BG_CLASS = {
  NEW: "border-emerald-100 bg-emerald-50/55",
  CONTACTED: "border-emerald-200 bg-emerald-100/65",
  WON: "border-emerald-300 bg-emerald-200/75",
};

/**
 * Kolumna Kanban jako obszar drop dla danego statusu.
 * @param {{
 * status: "NEW" | "CONTACTED" | "WON",
 * title: string,
 * leads: Array<{ id: string, firstName: string, lastName?: string | null, email: string, source?: string | null }>
 * }} props
 * @returns {JSX.Element}
 */
export default function KanbanColumn({ status, title, leads }) {
  const columnBgClass = COLUMN_BG_CLASS[status] || "border-slate-200 bg-slate-50";

  return (
    <section className={`rounded-2xl border p-3 shadow-xs ${columnBgClass}`}>
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wide text-slate-900">{title}</h2>
        <span className="rounded-full border border-white/70 bg-white/80 px-2.5 py-1 text-xs font-medium text-slate-600">
          {leads.length}
        </span>
      </header>

      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`min-h-28 space-y-2 rounded-xl p-1.5 transition ${
              snapshot.isDraggingOver ? "bg-white/45 ring-1 ring-emerald-300/60" : ""
            }`}
          >
            {leads.map((lead, index) => (
              <KanbanCard key={lead.id} lead={lead} index={index} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </section>
  );
}
