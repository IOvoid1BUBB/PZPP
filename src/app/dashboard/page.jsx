"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  UserPlus,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getLeads, getDashboardStats } from "@/app/actions/leadActions";

const STATUS_LABELS = {
  NEW: "Nowy",
  CONTACTED: "W kontakcie",
  QUALIFIED: "Zakwalifikowany",
  PROPOSAL: "Propozycja",
  WON: "Sprzedany",
  LOST: "Utracony",
};

const STATUS_COLORS = {
  NEW: "bg-amber-400/90 text-white border-amber-500",
  CONTACTED: "bg-sky-500/90 text-white border-sky-600",
  QUALIFIED: "bg-primary text-primary-foreground border-primary",
  PROPOSAL: "bg-violet-500/90 text-white border-violet-600",
  WON: "bg-primary text-primary-foreground border-primary",
  LOST: "bg-gray-400/90 text-white border-gray-500",
};

/**
 * Strona główna dashboardu CRM – startowy ekran podsumowania (Home/Statystyki).
 * @returns {JSX.Element}
 */
export default function DashboardPage() {
  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: () => getLeads(),
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => getDashboardStats(),
  });

  const totalLeads = stats?.totalLeads ?? 0;
  const conversionRate = stats?.conversionRate ?? "0%";
  const activeCourses = stats?.activeCourses ?? 0;
  const pendingSignatures = stats?.pendingSignatures ?? 0;

  const statCards = [
    {
      title: "Łącznie leadów",
      value: totalLeads.toLocaleString("pl-PL"),
      subtext: "Wszystkie leady w systemie",
    },
    {
      title: "Konwersja lejków",
      value: conversionRate,
      subtext: "Procent sprzedanych leadów",
    },
    {
      title: "Aktywne kursy",
      value: String(activeCourses),
      subtext: "Opublikowane kursy w ofercie",
    },
    {
      title: "Oczekujące podpisy",
      value: String(pendingSignatures),
      subtext: "Dokumenty do podpisania",
    },
  ];

  const displayedLeads = leads;

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Strona główna</h1>
        <p className="text-sm text-muted-foreground">
          Przegląd statystyk i lista leadów. Przeciągaj karty na tablicy Kanban,
          aby zarządzać statusem.
        </p>
      </header>

      {/* Karty statystyk z danych z bazy */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card
            key={card.title}
            className="border-primary/40 bg-accent/50 shadow-sm"
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-foreground">
                {card.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">
                {statsLoading ? "—" : card.value}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{card.subtext}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sekcja Twoje leady */}
      <div className="rounded-xl border border-primary/30 bg-accent/30 p-6">
        <h2 className="mb-4 text-xl font-bold">Twoje leady</h2>

        {/* Pasek wyszukiwania i akcji */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Input
              placeholder="Wyszukaj leada"
              className="max-w-sm rounded-lg border-primary/40 bg-background pr-10"
            />
            <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          </div>
          <Button
            variant="outline"
            size="default"
            className="w-fit rounded-lg border-primary/40"
          >
            <UserPlus className="mr-2 size-4" />
            Dodaj leada
          </Button>
          <Select defaultValue="all">
            <SelectTrigger className="w-[180px] rounded-lg border-primary/40">
              <SelectValue placeholder="Wszystkie leady" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie leady</SelectItem>
              <SelectItem value="NEW">Nowe</SelectItem>
              <SelectItem value="CONTACTED">W kontakcie</SelectItem>
              <SelectItem value="QUALIFIED">Zakwalifikowane</SelectItem>
              <SelectItem value="PROPOSAL">Propozycja</SelectItem>
              <SelectItem value="WON">Sprzedane</SelectItem>
              <SelectItem value="LOST">Utracone</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tabela leadów z bazy */}
        <div className="rounded-lg border border-primary/20 bg-background/80 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-primary/20 bg-accent/20 hover:bg-accent/20">
                <TableHead className="w-12"></TableHead>
                <TableHead>Imię i nazwisko</TableHead>
                <TableHead>Adres email</TableHead>
                <TableHead>Numer telefonu</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leadsLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Ładowanie…
                  </TableCell>
                </TableRow>
              ) : displayedLeads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Brak leadów. Dodaj pierwszego leada.
                  </TableCell>
                </TableRow>
              ) : (
                displayedLeads.map((lead, index) => {
                  const fullName = [lead.firstName, lead.lastName]
                    .filter(Boolean)
                    .join(" ");
                  const statusLabel = STATUS_LABELS[lead.status] ?? lead.status;
                  const statusColor = STATUS_COLORS[lead.status] ?? STATUS_COLORS.NEW;

                  return (
                    <TableRow
                      key={lead.id}
                      className={cn(
                        "border-primary/10",
                        index % 2 === 0 ? "bg-accent/20" : "bg-background"
                      )}
                    >
                      <TableCell className="font-medium text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell>{fullName || lead.email}</TableCell>
                      <TableCell>{lead.email}</TableCell>
                      <TableCell>{lead.phone || "—"}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "rounded-full border font-medium",
                            statusColor
                          )}
                        >
                          {statusLabel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="h-8 w-8 rounded-md"
                        >
                          <ChevronDown className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </section>
  );
}
