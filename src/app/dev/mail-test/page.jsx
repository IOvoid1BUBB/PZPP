"use client";

import { useState, useTransition } from "react";
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

export default function MailTestPage() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState(null);

  const [simEmail, setSimEmail] = useState("");
  const [simText, setSimText] = useState("");
  const [simLoading, setSimLoading] = useState(false);

  const handleSend = () => {
    startTransition(async () => {
      const res = await sendTemplatedEmail(
        "cmmp8nqqx0000m3w4dhnl8cxu",
        "jkowalski@gmail.com",
        "CrmWelcomeLead",
        {
          leadName: "Jan",
          source: "Test MailDev",
        }
      );
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
            Kliknij przycisk poniżej — mail powinien pojawić się w MailDev na{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">http://localhost:8025</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleSend} disabled={isPending}>
            {isPending ? "Wysyłam…" : "Wyślij testowego maila"}
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
