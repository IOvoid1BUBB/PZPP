"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { sendTemplatedEmail } from "@/app/actions/messageActions";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TEMPLATE_OPTIONS = [
  { id: "CrmWelcomeLead", label: "CrmWelcomeLead" },
  { id: "CrmCustomMessage", label: "CrmCustomMessage" },
  { id: "CalendarMeetingInvitation", label: "CalendarMeetingInvitation" },
  { id: "CalendarMeetingReminder", label: "CalendarMeetingReminder" },
  { id: "CrmProposalSent", label: "CrmProposalSent" },
];

function leadLabel(lead) {
  const name = [lead.firstName, lead.lastName].filter(Boolean).join(" ").trim();
  return `${name || "Lead"} <${lead.email}>`;
}

function userLabel(user) {
  const name = typeof user.name === "string" && user.name.trim() ? user.name.trim() : "Użytkownik";
  return `${name} <${user.email}> (${user.role})`;
}

export default function MailTestClient({ recipients = [], leads = [] }) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState(null);

  const [selectedRecipientId, setSelectedRecipientId] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [templateName, setTemplateName] = useState("CrmWelcomeLead");

  const recipient = useMemo(
    () => recipients.find((r) => r.id === selectedRecipientId) || null,
    [recipients, selectedRecipientId]
  );
  const lead = useMemo(
    () => leads.find((l) => l.id === selectedLeadId) || null,
    [leads, selectedLeadId]
  );

  useEffect(() => {
    if (!selectedRecipientId && recipients[0]?.id) setSelectedRecipientId(recipients[0].id);
  }, [recipients, selectedRecipientId]);

  useEffect(() => {
    if (!selectedLeadId && leads[0]?.id) setSelectedLeadId(leads[0].id);
  }, [leads, selectedLeadId]);

  const [simEmail, setSimEmail] = useState("");
  const [simText, setSimText] = useState("");
  const [simLoading, setSimLoading] = useState(false);

  const handleSend = () => {
    if (!recipient?.email) {
      toast({
        variant: "destructive",
        title: "Brak odbiorcy",
        description: "Wybierz odbiorcę z bazy (kreator/admin).",
      });
      return;
    }
    if (!lead?.id) {
      toast({
        variant: "destructive",
        title: "Brak leada",
        description: "Wybierz leada z bazy, żeby powiązać maila z historią.",
      });
      return;
    }

    startTransition(async () => {
      const res = await sendTemplatedEmail(lead.id, recipient.email, templateName, {
        leadName: [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "Lead",
        source: "Dev MailTest",
        message: "To jest wiadomość testowa z dev/mail-test.",
      });
      setResult(res);
    });
  };

  const handleSimulateWebhook = async () => {
    const email = simEmail.trim();
    const text = simText.trim();
    if (!email || !text) {
      toast({
        variant: "destructive",
        title: "Uzupełnij pola",
        description: "Podaj e-mail leada i treść wiadomości.",
      });
      return;
    }
    setSimLoading(true);
    try {
      const res = await fetch("/api/webhooks/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender: email,
          text,
          subject: "Nowa wiadomość",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        toast({
          title: "Webhook zapisany",
          description: "Symulacja odpowiedzi INBOUND została przyjęta.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Błąd webhooka",
          description: typeof data.error === "string" ? data.error : `HTTP ${res.status}`,
        });
      }
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Błąd sieci",
        description: e instanceof Error ? e.message : "Nie udało się wysłać żądania.",
      });
    } finally {
      setSimLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6">
      <Toaster />

      <Card>
        <CardHeader>
          <CardTitle>Test wysyłki e-mail (MailDev)</CardTitle>
          <CardDescription>
            Wybierz odbiorcę z bazy (kreator/admin) i leada, a następnie wyślij maila. Wiadomość
            powinna pojawić się w MailDev na{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">http://localhost:8025</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <div className="space-y-2">
              <Label>Odbiorca (z bazy)</Label>
              <Select value={selectedRecipientId} onValueChange={setSelectedRecipientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz odbiorcę" />
                </SelectTrigger>
                <SelectContent>
                  {recipients.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {userLabel(u)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Lead (powiązanie w historii)</Label>
              <Select value={selectedLeadId} onValueChange={setSelectedLeadId}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz leada" />
                </SelectTrigger>
                <SelectContent>
                  {leads.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {leadLabel(l)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Template</Label>
              <Select value={templateName} onValueChange={setTemplateName}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz template" />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_OPTIONS.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleSend} disabled={isPending}>
            {isPending ? "Wysyłam…" : "Wyślij maila do wybranego odbiorcy"}
          </Button>

          {result ? (
            <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs text-muted-foreground">
              {JSON.stringify(result, null, 2)}
            </pre>
          ) : null}
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Symulator Webhooka (INBOUND)</CardTitle>
          <CardDescription>
            Symuluje żądanie POST tak jak zewnętrzny dostawca — zapisuje wiadomość dla leada o podanym
            adresie e-mail.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sim-email">E-mail leada</Label>
            <Input
              id="sim-email"
              type="email"
              autoComplete="email"
              placeholder="lead@example.com"
              value={simEmail}
              onChange={(e) => setSimEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sim-text">Treść</Label>
            <Textarea
              id="sim-text"
              placeholder="Treść symulowanej odpowiedzi…"
              rows={5}
              value={simText}
              onChange={(e) => setSimText(e.target.value)}
            />
          </div>
          <Button type="button" onClick={handleSimulateWebhook} disabled={simLoading}>
            {simLoading ? "Wysyłam…" : "Symuluj odpowiedź"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

