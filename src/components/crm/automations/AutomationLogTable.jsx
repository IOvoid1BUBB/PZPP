"use client";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatDate(date) {
  return new Date(date).toLocaleString("pl-PL", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function AutomationLogTable({ logs = [] }) {
  if (logs.length === 0) {
    return (
      <p className="rounded-lg border bg-accent/30 px-4 py-6 text-center text-sm text-muted-foreground">
        Brak logow wykonania.
      </p>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-accent/20 hover:bg-accent/20">
            <TableHead>Regula</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Szczegoly</TableHead>
            <TableHead className="text-right">Data</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="font-medium">
                {log.automation?.name || log.automationId}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={
                    log.status === "SUCCESS"
                      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                      : "bg-red-100 text-red-700 border-red-200"
                  }
                >
                  {log.status === "SUCCESS" ? "Sukces" : "Blad"}
                </Badge>
              </TableCell>
              <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                {log.details || "—"}
              </TableCell>
              <TableCell className="text-right text-sm text-muted-foreground">
                {formatDate(log.executedAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
