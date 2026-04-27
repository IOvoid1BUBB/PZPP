"use client";

import { useRef, useState, useTransition } from "react";
import { sendInternalChatMessage, sendTemplatedEmail } from "@/app/actions/messageActions";
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
import { useQueryClient } from "@tanstack/react-query";

const TEMPLATE_OPTIONS = TEMPLATE_REGISTRY_KEYS.filter(
  (k) => k !== "CrmCustomMessage"
);

/**
 * @param {{ leadId: string; leadEmail: string; disabled?: boolean; teamId?: string | null }} props
 */
export default function MessageInput({
  leadId,
  leadEmail,
  disabled,
  teamId = null,
}) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const textareaRef = useRef(null);
  const chatRef = useRef(null);
  const [chatText, setChatText] = useState("");
  const [manualText, setManualText] = useState("");
  const [manualSubject, setManualSubject] = useState("Wiadomość");
  const [templateName, setTemplateName] = useState(TEMPLATE_OPTIONS[0] ?? "");

  const handleInput = (e) => {
    const target = e.target;
    target.style.height = "auto";
    target.style.height = `${target.scrollHeight}px`;
  };

  const handleManualTextChange = (e) => {
    setManualText(e.target.value);
    handleInput(e);
  };

  const handleChatTextChange = (e) => {
    setChatText(e.target.value);
    handleInput(e);
  };

  const queryClient = useQueryClient();
  const sendChat = () => {
    const text = chatText.trim();
    if (!text || !leadId) {
      toast({ variant: "destructive", title: "Uzupełnij treść wiadomości." });
      return;
    }
    startTransition(async () => {
      const res = await sendInternalChatMessage(leadId, text, {
        teamId: typeof teamId === "string" ? teamId : null,
      });
      if (res?.success) {
        setChatText("");
        queryClient.invalidateQueries({ queryKey: ["lead-messages"] });
        if (chatRef.current) chatRef.current.style.height = "auto";
        toast({ title: "Wysłano", description: "Wiadomość wewnętrzna została zapisana." });
        return;
      }
      toast({
        variant: "destructive",
        title: "Błąd",
        description: res?.error || "Nie udało się wysłać wiadomości.",
      });
    });
  };

  const sendManual = () => {
    const text = manualText.trim();
    if (!text || !leadId || !leadEmail) {
      toast({ variant: "destructive", title: "Uzupełnij treść wiadomości." });
      return;
    }
    startTransition(async () => {
      const res = await sendTemplatedEmail(
        leadId,
        leadEmail,
        "CrmCustomMessage",
        {
          customSubject: manualSubject.trim() || "Wiadomość",
          content: manualText,
        },
        {
          messageType: "EMAIL",
          teamId,
        }
      );
      if (res.success) {
        toast({
          title: "Wysłano",
          description: "Wiadomość e-mail została wysłana.",
        });
        setManualText("");
        queryClient.invalidateQueries({ queryKey: ["lead-messages"] });

        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
        }
      } else {
        toast({
          variant: "destructive",
          title: "Błąd",
          description: res.error,
        });
      }
    });
  };

  const sendTemplate = () => {
    if (!templateName || !leadId || !leadEmail) return;
    startTransition(async () => {
      const res = await sendTemplatedEmail(
        leadId,
        leadEmail,
        templateName,
        {},
        { messageType: "EMAIL", teamId }
      );
      if (res.success) {
        toast({ title: "Wysłano", description: "Szablon został wysłany." });
        queryClient.invalidateQueries({ queryKey: ["lead-messages"] });
      } else {
        toast({
          variant: "destructive",
          title: "Błąd",
          description: res.error,
        });
      }
    });
  };

  return (
    <div className="shrink-0 border-t border-border bg-muted/20 px-4 pt-4 pb-6">
      <Tabs defaultValue="chat" className="w-full">
        <TabsList className="mb-3 grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="manual">E-mail</TabsTrigger>
          <TabsTrigger value="template">Szablon</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="mt-0 space-y-3">
          <div className="space-y-2">
            <Label htmlFor="inbox-chat">Wiadomość wewnętrzna</Label>
            <Textarea
              ref={chatRef}
              id="inbox-chat"
              value={chatText}
              onChange={handleChatTextChange}
              placeholder={teamId ? "Napisz wiadomość do zespołu…" : "Napisz wiadomość wewnętrzną…"}
              rows={1}
              disabled={disabled || isPending}
              className="min-h-[44px] max-h-[200px] resize-none overflow-y-auto field-sizing-fixed"
            />
          </div>
          <Button type="button" onClick={sendChat} disabled={disabled || isPending}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Wyślij na chat
          </Button>
        </TabsContent>

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
              ref={textareaRef}
              id="inbox-body"
              value={manualText}
              onChange={handleManualTextChange}
              placeholder="Napisz wiadomość do leada…"
              rows={1}
              disabled={disabled || isPending}
              className="min-h-[44px] max-h-[200px] resize-none overflow-y-auto field-sizing-fixed"
            />
          </div>
          <Button
            type="button"
            onClick={sendManual}
            disabled={disabled || isPending}
            variant="secondary"
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Wyślij e-mail
          </Button>
        </TabsContent>

        <TabsContent value="template" className="mt-0 space-y-3">
          <div className="space-y-2">
            <Label>Szablon</Label>
            <Select
              value={templateName}
              onValueChange={setTemplateName}
              disabled={disabled || isPending}
            >
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
