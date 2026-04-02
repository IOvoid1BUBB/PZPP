"use client";

import { useState, useTransition } from "react";
import { sendTemplatedEmail } from "@/app/actions/messageActions";
import { TEMPLATE_REGISTRY_KEYS } from "@/lib/emailTemplateKeys";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const TEMPLATE_OPTIONS = TEMPLATE_REGISTRY_KEYS.filter((k) => k !== "CrmCustomMessage");

/**
 * @param {{ leadId: string; leadEmail: string; disabled?: boolean }} props
 */
export default function MessageInput({ leadId, leadEmail, disabled }) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [manualText, setManualText] = useState("");
  const [manualSubject, setManualSubject] = useState("Wiadomość");
  const [templateName, setTemplateName] = useState(TEMPLATE_OPTIONS[0] ?? "");

  const sendManual = () => {
    const text = manualText.trim();
    if (!text || !leadId || !leadEmail) {
      toast({ variant: "destructive", title: "Uzupełnij treść wiadomości." });
      return;
    }
    startTransition(async () => {
      const res = await sendTemplatedEmail(leadId, leadEmail, "CrmCustomMessage", {
        customSubject: manualSubject.trim() || "Wiadomość",
        content: manualText,
      });
      if (res.success) {
        toast({ title: "Wysłano", description: "Wiadomość e-mail została wysłana." });
        setManualText("");
      } else {
        toast({
          variant: "destructive",
          title: "Błąd",
          description: res.error || "Nie udało się wysłać.",
        });
      }
    });
  };

  const sendTemplate = () => {
    if (!templateName || !leadId || !leadEmail) return;
    startTransition(async () => {
      const res = await sendTemplatedEmail(leadId, leadEmail, templateName, {});
      if (res.success) {
        toast({ title: "Wysłano", description: "Szablon został wysłany." });
      } else {
        toast({
          variant: "destructive",
          title: "Błąd",
          description: res.error || "Nie udało się wysłać szablonu.",
        });
      }
    });
  };

  return (
    <div className="border-t border-border bg-muted/20 p-4">
      <Tabs defaultValue="manual" className="w-full">
        <TabsList className="mb-3 grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="manual">Ręczna wiadomość</TabsTrigger>
          <TabsTrigger value="template">Użyj szablonu</TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="mt-0 space-y-3">
          <div className="space-y-2">
            <Label htmlFor="inbox-subject">Temat</Label>
            <Input
              id="inbox-subject"
              value={manualSubject}
              onChange={(e) => setManualSubject(e.target.value)}
              placeholder="Temat wiadomości"
              disabled={disabled || isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inbox-body">Treść</Label>
            <Textarea
              id="inbox-body"
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="Napisz wiadomość do leada…"
              rows={4}
              disabled={disabled || isPending}
              className="resize-y min-h-[100px]"
            />
          </div>
          <Button type="button" onClick={sendManual} disabled={disabled || isPending}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Wyślij e-mail
          </Button>
        </TabsContent>

        <TabsContent value="template" className="mt-0 space-y-3">
          <div className="space-y-2">
            <Label>Szablon</Label>
            <Select value={templateName} onValueChange={setTemplateName} disabled={disabled || isPending}>
              <SelectTrigger className="max-w-md">
                <SelectValue placeholder="Wybierz szablon" />
              </SelectTrigger>
              <SelectContent>
                {TEMPLATE_OPTIONS.map((key) => (
                  <SelectItem key={key} value={key}>
                    {key}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" variant="secondary" onClick={sendTemplate} disabled={disabled || isPending}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Wyślij szablon
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
