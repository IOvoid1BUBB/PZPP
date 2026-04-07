"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Briefcase, Calendar, Mail, Ticket, PlugZap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { disconnectOAuthIntegration, saveApiKeyIntegration } from "@/app/actions/integrationActions";
import { useToast } from "@/hooks/use-toast";
import { API_KEY_PROVIDER_CATALOG } from "@/lib/integrations/apiKeyProviders";

const OAUTH_INTEGRATIONS = [
  {
    id: "google",
    title: "Google Workspace",
    description: "Synchronizacja Gmail oraz Kalendarza Google.",
    provider: "google",
    icon: Calendar,
  },
  {
    id: "azure-ad",
    title: "Microsoft Outlook / Azure AD",
    description: "Odczyt wiadomości i kalendarza z Microsoft Graph.",
    provider: "azure-ad",
    icon: Mail,
  },
  {
    id: "atlassian",
    title: "Jira / Atlassian",
    description: "Dostęp do ticketów i danych użytkownika Jira Cloud.",
    provider: "atlassian",
    icon: Ticket,
  },
];

export default function IntegrationPanelClient({ connectedProviders = [] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [providerId, setProviderId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const connectedSet = new Set(connectedProviders);

  async function handleConnect(provider) {
    try {
      await signIn(provider);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Błąd połączenia",
        description: "Nie udało się rozpocząć procesu OAuth.",
      });
    }
  }

  function handleDisconnect(provider) {
    startTransition(async () => {
      const result = await disconnectOAuthIntegration(provider);
      toast({
        variant: result?.success ? "default" : "destructive",
        title: result?.success ? "Odłączono integrację" : "Błąd odłączania",
        description: result?.message,
      });
      if (result?.success) {
        router.refresh();
      }
    });
  }

  function handleSaveApiKey() {
    startTransition(async () => {
      const result = await saveApiKeyIntegration({ providerId, apiKey });
      toast({
        variant: result?.success ? "default" : "destructive",
        title: result?.success ? "Zapisano klucz API" : "Błąd zapisu klucza",
        description: result?.message,
      });

      if (result?.success) {
        setProviderId("");
        setApiKey("");
        setIsDialogOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {OAUTH_INTEGRATIONS.map((integration) => {
          const isConnected = connectedSet.has(integration.provider);
          const Icon = integration.icon;

          return (
            <Card key={integration.id} className="flex h-full min-h-[260px] flex-col">
              <CardHeader className="space-y-3 pb-3">
                <CardTitle className="flex items-start justify-between gap-3 text-base leading-6">
                  <span className="flex items-center gap-2">
                    <Icon className="size-4 text-muted-foreground" />
                    {integration.title}
                  </span>
                  {isConnected ? (
                    <Badge className="shrink-0 bg-green-600 text-white hover:bg-green-600">
                      Połączono
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="shrink-0">
                      Niepołączono
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-sm leading-6">
                  {integration.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1" />
              <CardFooter className="pt-0">
                {isConnected ? (
                  <Button
                    variant="destructive"
                    onClick={() => handleDisconnect(integration.provider)}
                    disabled={isPending}
                    className="w-full"
                  >
                    Odłącz
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleConnect(integration.provider)}
                    disabled={isPending}
                    className="w-full"
                  >
                    Połącz
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}

        <Card className="flex h-full min-h-[260px] flex-col">
          <CardHeader className="space-y-3 pb-3">
            <CardTitle className="flex items-center gap-2 text-base leading-6">
              <Briefcase className="size-4 text-muted-foreground" />
              Inna integracja (Klucz API)
            </CardTitle>
            <CardDescription className="text-sm leading-6">
              Dodaj własną integrację przez ręczny klucz API.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
              Dla integracji niestandardowych zapisujemy klucz API bezpiecznie po stronie serwera.
            </div>
          </CardContent>
          <CardFooter className="pt-0">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary" className="w-full">
                  <PlugZap className="mr-1 size-4" />
                  Dodaj klucz API
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nowa integracja API Key</DialogTitle>
                  <DialogDescription>
                    Wybierz dostawcę z listy, a system automatycznie dobierze
                    konfigurację API. Klucz zostanie zapisany w postaci zaszyfrowanej.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Dostawca integracji</Label>
                    <Select
                      value={providerId}
                      onValueChange={setProviderId}
                      disabled={isPending}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Wybierz dostawcę" />
                      </SelectTrigger>
                      <SelectContent>
                        {API_KEY_PROVIDER_CATALOG.map((provider) => (
                          <SelectItem key={provider.id} value={provider.id}>
                            {provider.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="apiKey">Klucz API</Label>
                    <Input
                      id="apiKey"
                      type="password"
                      placeholder="Wklej klucz API"
                      value={apiKey}
                      onChange={(event) => setApiKey(event.target.value)}
                      disabled={isPending}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Anuluj
                  </Button>
                  <Button onClick={handleSaveApiKey} disabled={isPending}>
                    {isPending ? "Zapisywanie..." : "Zapisz"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardFooter>
        </Card>
      </div>
  );
}
