"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Plus } from "lucide-react";

const LEAD_STATUSES = [
  { value: "", label: "(dowolny)" },
  { value: "NEW", label: "Nowy" },
  { value: "CONTACTED", label: "W kontakcie" },
  { value: "QUALIFIED", label: "Zakwalifikowany" },
  { value: "PROPOSAL", label: "Propozycja" },
  { value: "WON", label: "Wygrany" },
  { value: "LOST", label: "Utracony" },
];

const DEAL_STAGES = [
  { value: "", label: "(dowolny)" },
  { value: "DISCOVERY", label: "Odkrywanie" },
  { value: "PROPOSAL", label: "Propozycja" },
  { value: "NEGOTIATION", label: "Negocjacje" },
  { value: "WON", label: "Wygrana" },
  { value: "LOST", label: "Przegrana" },
];

const TRIGGERS = [
  { value: "LEAD_STATUS_CHANGE", label: "Zmiana statusu leada" },
  { value: "DEAL_STAGE_CHANGE", label: "Zmiana etapu deala" },
];

const ACTIONS = [
  { value: "SEND_EMAIL_TEMPLATE", label: "Wyslij email (szablon)" },
  { value: "CREATE_TASK", label: "Utworz zadanie" },
];

const EMAIL_TEMPLATES = [
  { value: "CrmWelcomeLead", label: "Powitanie leada" },
  { value: "CrmProposalSent", label: "Wyslanie propozycji" },
  { value: "CrmCustomMessage", label: "Wiadomosc niestandardowa" },
];

const TASK_PRIORITIES = [
  { value: "LOW", label: "Niski" },
  { value: "MEDIUM", label: "Sredni" },
  { value: "HIGH", label: "Wysoki" },
  { value: "URGENT", label: "Pilny" },
];

export default function AutomationRuleForm({ onSubmit }) {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState("LEAD_STATUS_CHANGE");
  const [fromValue, setFromValue] = useState("");
  const [toValue, setToValue] = useState("");
  const [actionType, setActionType] = useState("CREATE_TASK");

  const [templateName, setTemplateName] = useState("CrmWelcomeLead");

  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueDays, setTaskDueDays] = useState("1");
  const [taskPriority, setTaskPriority] = useState("MEDIUM");

  const statusOptions = triggerType === "LEAD_STATUS_CHANGE" ? LEAD_STATUSES : DEAL_STAGES;
  const fromKey = triggerType === "LEAD_STATUS_CHANGE" ? "fromStatus" : "fromStage";
  const toKey = triggerType === "LEAD_STATUS_CHANGE" ? "toStatus" : "toStage";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const triggerConfig = {};
    if (fromValue) triggerConfig[fromKey] = fromValue;
    if (toValue) triggerConfig[toKey] = toValue;

    let actionConfig = {};
    if (actionType === "SEND_EMAIL_TEMPLATE") {
      actionConfig = { templateName };
    } else {
      actionConfig = {
        title: taskTitle || "Zadanie z automatyzacji",
        dueDays: parseInt(taskDueDays) || 1,
        priority: taskPriority,
        taskType: "FOLLOW_UP",
      };
    }

    setIsSaving(true);
    const result = await onSubmit({ name, triggerType, triggerConfig, actionType, actionConfig });
    setIsSaving(false);

    if (!result?.success) {
      setError(result?.error || "Nie udalo sie utworzyc reguly.");
      return;
    }

    setName("");
    setFromValue("");
    setToValue("");
    setTaskTitle("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-lg border-primary/40">
          <Plus className="mr-2 size-4" />
          Nowa regula
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Nowa regula automatyzacji</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          <div className="space-y-2">
            <Label>Nazwa reguly</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Np. Onboarding po wygranej"
              required
            />
          </div>

          <fieldset className="space-y-3 rounded-lg border p-3">
            <legend className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Trigger (jesli...)
            </legend>
            <div className="space-y-2">
              <Label>Typ triggera</Label>
              <Select value={triggerType} onValueChange={(v) => { setTriggerType(v); setFromValue(""); setToValue(""); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRIGGERS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Z (opcjonalnie)</Label>
                <Select value={fromValue} onValueChange={setFromValue}>
                  <SelectTrigger><SelectValue placeholder="Dowolny" /></SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((s) => (
                      <SelectItem key={s.value || "__any"} value={s.value || "__any"}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Na</Label>
                <Select value={toValue} onValueChange={setToValue}>
                  <SelectTrigger><SelectValue placeholder="Dowolny" /></SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((s) => (
                      <SelectItem key={s.value || "__any"} value={s.value || "__any"}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </fieldset>

          <fieldset className="space-y-3 rounded-lg border p-3">
            <legend className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Akcja (wtedy...)
            </legend>
            <div className="space-y-2">
              <Label>Typ akcji</Label>
              <Select value={actionType} onValueChange={setActionType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTIONS.map((a) => (
                    <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {actionType === "SEND_EMAIL_TEMPLATE" && (
              <div className="space-y-2">
                <Label>Szablon emaila</Label>
                <Select value={templateName} onValueChange={setTemplateName}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EMAIL_TEMPLATES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {actionType === "CREATE_TASK" && (
              <>
                <div className="space-y-2">
                  <Label>Tytul zadania</Label>
                  <Input
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="Np. Zadzwon do klienta"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Termin (dni od teraz)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={taskDueDays}
                      onChange={(e) => setTaskDueDays(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Priorytet</Label>
                    <Select value={taskPriority} onValueChange={setTaskPriority}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TASK_PRIORITIES.map((p) => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}
          </fieldset>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" disabled={isSaving || !name} className="w-full">
            {isSaving ? <Spinner className="mr-2" /> : null}
            Utworz regule
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
