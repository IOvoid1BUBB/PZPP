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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Plus } from "lucide-react";

const STAGES = [
  { value: "DISCOVERY", label: "Odkrywanie" },
  { value: "PROPOSAL", label: "Propozycja" },
  { value: "NEGOTIATION", label: "Negocjacje" },
  { value: "WON", label: "Wygrana" },
  { value: "LOST", label: "Przegrana" },
];

export default function DealFormDialog({ leads = [], onSubmit }) {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    value: "",
    currency: "PLN",
    probability: "50",
    expectedCloseDate: "",
    stage: "DISCOVERY",
    notes: "",
    leadId: "",
  });

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSaving(true);
    const result = await onSubmit(form);
    setIsSaving(false);

    if (!result?.success) {
      setError(result?.error || "Nie udalo sie utworzyc deala.");
      return;
    }

    setForm({
      name: "",
      value: "",
      currency: "PLN",
      probability: "50",
      expectedCloseDate: "",
      stage: "DISCOVERY",
      notes: "",
      leadId: "",
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="default" className="rounded-lg border-primary/40">
          <Plus className="mr-2 size-4" />
          Nowy deal
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Nowy deal</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="deal-name">Nazwa deala</Label>
            <Input
              id="deal-name"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Np. Wdrozenie platformy XYZ"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deal-lead">Lead</Label>
            <Select value={form.leadId} onValueChange={(v) => handleChange("leadId", v)}>
              <SelectTrigger id="deal-lead">
                <SelectValue placeholder="Wybierz leada" />
              </SelectTrigger>
              <SelectContent>
                {leads.map((lead) => (
                  <SelectItem key={lead.id} value={lead.id}>
                    {[lead.firstName, lead.lastName].filter(Boolean).join(" ") || lead.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="deal-value">Kwota</Label>
              <Input
                id="deal-value"
                type="number"
                min="0"
                step="0.01"
                value={form.value}
                onChange={(e) => handleChange("value", e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deal-probability">Prawdop. (%)</Label>
              <Input
                id="deal-probability"
                type="number"
                min="0"
                max="100"
                value={form.probability}
                onChange={(e) => handleChange("probability", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="deal-stage">Etap</Label>
              <Select value={form.stage} onValueChange={(v) => handleChange("stage", v)}>
                <SelectTrigger id="deal-stage">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="deal-close-date">Planowane zamkniecie</Label>
              <Input
                id="deal-close-date"
                type="date"
                value={form.expectedCloseDate}
                onChange={(e) => handleChange("expectedCloseDate", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deal-notes">Notatki</Label>
            <Textarea
              id="deal-notes"
              value={form.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="Dodatkowe informacje..."
              className="min-h-16"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" disabled={isSaving || !form.name || !form.leadId} className="w-full">
            {isSaving ? <Spinner className="mr-2" /> : null}
            Utworz deal
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
