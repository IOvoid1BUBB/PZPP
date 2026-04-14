"use client";

import { Draggable } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, Percent, User } from "lucide-react";

const STAGE_COLORS = {
  DISCOVERY: "bg-sky-100 text-sky-700 border-sky-200",
  PROPOSAL: "bg-violet-100 text-violet-700 border-violet-200",
  NEGOTIATION: "bg-amber-100 text-amber-700 border-amber-200",
  WON: "bg-emerald-100 text-emerald-700 border-emerald-200",
  LOST: "bg-gray-100 text-gray-600 border-gray-200",
};

function formatCurrency(value, currency = "PLN") {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function DealCard({ deal, index }) {
  const leadName = deal.lead
    ? [deal.lead.firstName, deal.lead.lastName].filter(Boolean).join(" ") || deal.lead.email
    : "—";

  return (
    <Draggable draggableId={deal.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`rounded-xl border bg-white p-3 shadow-xs transition ${
            snapshot.isDragging ? "shadow-md ring-2 ring-primary/30" : ""
          }`}
        >
          <div className="mb-2 flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900 leading-tight">
              {deal.name}
            </p>
            <Badge
              variant="outline"
              className={`shrink-0 text-[10px] ${STAGE_COLORS[deal.stage] || ""}`}
            >
              {formatCurrency(deal.value, deal.currency)}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <User className="size-3" />
              {leadName}
            </span>
            <span className="flex items-center gap-1">
              <Percent className="size-3" />
              {deal.probability}%
            </span>
            {deal.expectedCloseDate && (
              <span className="flex items-center gap-1">
                <CalendarClock className="size-3" />
                {new Date(deal.expectedCloseDate).toLocaleDateString("pl-PL")}
              </span>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}
