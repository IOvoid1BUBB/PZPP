"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { getTasks, getTasksDashboard, toggleTaskComplete, deleteTask } from "@/app/actions/taskActions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock,
  ListTodo,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PRIORITY_STYLES = {
  LOW: "bg-slate-100 text-slate-600 border-slate-200",
  MEDIUM: "bg-blue-100 text-blue-700 border-blue-200",
  HIGH: "bg-orange-100 text-orange-700 border-orange-200",
  URGENT: "bg-red-100 text-red-700 border-red-200",
};

const PRIORITY_LABELS = {
  LOW: "Niski",
  MEDIUM: "Sredni",
  HIGH: "Wysoki",
  URGENT: "Pilny",
};

const TYPE_LABELS = {
  FOLLOW_UP: "Follow-up",
  CALL: "Telefon",
  EMAIL: "Email",
  MEETING: "Spotkanie",
  OTHER: "Inne",
};

function formatDate(date) {
  return new Date(date).toLocaleString("pl-PL", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function TaskRow({ task, onToggle, onDelete }) {
  const leadName = task.lead
    ? [task.lead.firstName, task.lead.lastName].filter(Boolean).join(" ") || task.lead.email
    : "—";

  const isOverdue = !task.isCompleted && new Date(task.dueDate) < new Date();

  return (
    <div
      data-task-id={task.id}
      className={cn(
        "flex items-center gap-3 rounded-lg border p-3 transition-colors",
        task.isCompleted ? "bg-accent/30 opacity-70" : "bg-background",
        isOverdue && !task.isCompleted ? "border-red-200 bg-red-50/30" : ""
      )}
    >
      <Checkbox
        checked={task.isCompleted}
        onCheckedChange={() => onToggle(task.id)}
        className="shrink-0"
      />
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-medium", task.isCompleted && "line-through text-muted-foreground")}>
          {task.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <CalendarClock className="size-3" />
            {formatDate(task.dueDate)}
          </span>
          <span>Lead: {leadName}</span>
          {task.deal && <span>Deal: {task.deal.name}</span>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Badge variant="outline" className="text-[10px]">
          {TYPE_LABELS[task.type] || task.type}
        </Badge>
        <Badge variant="outline" className={cn("text-[10px]", PRIORITY_STYLES[task.priority] || "")}>
          {PRIORITY_LABELS[task.priority] || task.priority}
        </Badge>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground hover:text-red-600"
          onClick={() => onDelete(task.id)}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default function ZadaniaPage() {
  const [activeTab, setActiveTab] = useState("today");
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  const { data: stats } = useQuery({
    queryKey: ["tasks-dashboard"],
    queryFn: () => getTasksDashboard(),
  });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks", activeTab],
    queryFn: () => getTasks(activeTab),
  });

  const highlightedTaskId = useMemo(() => searchParams?.get("taskId") || null, [searchParams]);

  useEffect(() => {
    if (!highlightedTaskId || isLoading) return;
    const el = document.querySelector(`[data-task-id="${CSS.escape(highlightedTaskId)}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ring-2", "ring-primary/50");
    const timer = window.setTimeout(() => {
      el.classList.remove("ring-2", "ring-primary/50");
    }, 3500);
    return () => window.clearTimeout(timer);
  }, [highlightedTaskId, isLoading, tasks]);

  const toggleMutation = useMutation({
    mutationFn: (taskId) => toggleTaskComplete(taskId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks-dashboard"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (taskId) => deleteTask(taskId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks-dashboard"] });
    },
  });

  const statCards = [
    { title: "Dzisiaj", value: stats?.todayTasks ?? 0, icon: ListTodo, color: "text-blue-600" },
    { title: "Zaległe", value: stats?.overdueTasks ?? 0, icon: AlertTriangle, color: "text-red-600" },
    { title: "Nadchodzace", value: stats?.upcomingTasks ?? 0, icon: Clock, color: "text-amber-600" },
    { title: "Ukonczono dzis", value: stats?.completedToday ?? 0, icon: CheckCircle2, color: "text-emerald-600" },
  ];

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Zadania i follow-upy</h1>
        <p className="text-sm text-muted-foreground">
          Zarzadzaj zadaniami przypisanymi do leadow. Nie przegap zadnego follow-upu.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="border-primary/40 bg-accent/50 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Icon className={cn("size-4", card.color)} />
                  {card.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">{card.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="today">Dzisiaj</TabsTrigger>
          <TabsTrigger value="overdue">
            Zaległe
            {(stats?.overdueTasks ?? 0) > 0 && (
              <Badge variant="destructive" className="ml-1.5 h-5 min-w-5 px-1 text-[10px]">
                {stats.overdueTasks}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="upcoming">Nadchodzace</TabsTrigger>
          <TabsTrigger value="completed">Zakonczone</TabsTrigger>
          <TabsTrigger value="all">Wszystkie</TabsTrigger>
        </TabsList>

        {["today", "overdue", "upcoming", "completed", "all"].map((tab) => (
          <TabsContent key={tab} value={tab} className="space-y-2">
            {isLoading ? (
              <p className="rounded-lg border bg-accent/30 px-4 py-8 text-center text-sm text-muted-foreground">
                Ladowanie zadan...
              </p>
            ) : tasks.length === 0 ? (
              <p className="rounded-lg border bg-accent/30 px-4 py-8 text-center text-sm text-muted-foreground">
                Brak zadan w tej kategorii.
              </p>
            ) : (
              tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onToggle={(id) => toggleMutation.mutate(id)}
                  onDelete={(id) => deleteMutation.mutate(id)}
                />
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}
