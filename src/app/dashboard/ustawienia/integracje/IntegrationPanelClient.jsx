"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, Calendar, ExternalLink, Mail, Ticket, PlugZap } from "lucide-react";
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
import {
  disconnectJiraIntegration,
  disconnectOAuthIntegration,
  disconnectGoogleIntegration,
  getGoogleContactsPreview,
  getGoogleEventsPreview,
  getOutlookEventsPreview,
  saveApiKeyIntegration,
  syncGoogleContactsNow,
  syncGoogleNow,
  syncJiraTicketsNow,
  syncOutlookNow,
} from "@/app/actions/integrationActions";
import {
  getJiraIssuesByProject,
  getJiraProjects,
  saveJiraProjectSelection,
} from "@/app/actions/jiraActions";
import { useToast } from "@/hooks/use-toast";
import { API_KEY_PROVIDER_CATALOG } from "@/lib/integrations/apiKeyProviders";

const OAUTH_INTEGRATIONS = [
  {
    id: "google",
    title: "Google Workspace",
    description: "Synchronizacja Gmail oraz Kalendarza Google.",
    provider: "google",
    connectLabel: "Połącz z Google",
    connectHref: "/api/integrations/google/start",
    icon: Calendar,
  },
  {
    id: "azure-ad",
    title: "Microsoft Outlook / Azure AD",
    description: "Odczyt wiadomości i kalendarza z Microsoft Graph.",
    provider: "azure-ad",
    connectLabel: "Przejdź do Outlook",
    connectHref: "https://www.microsoft.com/microsoft-365/outlook/",
    icon: Mail,
  },
  {
    id: "atlassian",
    title: "Jira / Atlassian",
    description: "Dostęp do ticketów i danych użytkownika Jira Cloud.",
    provider: "atlassian",
    connectLabel: "Połącz z Jira",
    connectHref: "/api/integrations/jira/start",
    icon: Ticket,
  },
];

export default function IntegrationPanelClient({
  connectedProviders = [],
  jiraSelectedProjectKey = null,
  googleLastSyncedAt = null,
  googleLastError = null,
  googleEmail = null,
  googleCalendarLastSyncedAt = null,
  googleContactsLastSyncedAt = null,
  jiraLastSyncedAt = null,
  jiraLastError = null,
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [providerId, setProviderId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [jiraProjects, setJiraProjects] = useState([]);
  const [jiraProjectsError, setJiraProjectsError] = useState(null);
  const [jiraCloudId, setJiraCloudId] = useState(null);
  const [jiraIssuesPreview, setJiraIssuesPreview] = useState([]);
  const [outlookEventsPreview, setOutlookEventsPreview] = useState([]);
  const [googleEventsPreview, setGoogleEventsPreview] = useState([]);
  const [googleContactsPreview, setGoogleContactsPreview] = useState([]);

  const connectedSet = new Set(connectedProviders);
  const isAtlassianConnected = connectedSet.has("atlassian");
  const isOutlookConnected = connectedSet.has("azure-ad");
  const isGoogleConnected = connectedSet.has("google");
  const selectedJiraProjectKey = jiraSelectedProjectKey || "";

  useEffect(() => {
    if (!isAtlassianConnected) {
      return;
    }

    let isCancelled = false;

    startTransition(async () => {
      const result = await getJiraProjects();
      if (isCancelled) return;

      if (!result?.success) {
        setJiraProjects([]);
        setJiraProjectsError(
          result?.message || "Nie udało się pobrać listy projektów Jira."
        );
        setJiraCloudId(null);
        return;
      }

      setJiraProjects(result.projects || []);
      setJiraProjectsError(null);
      setJiraCloudId(result.cloudId || null);
    });

    return () => {
      isCancelled = true;
    };
  }, [isAtlassianConnected]);

  useEffect(() => {
    if (!isGoogleConnected) {
      return;
    }

    let isCancelled = false;
    startTransition(async () => {
      const result = await getGoogleEventsPreview();
      if (isCancelled || !result?.success) return;
      setGoogleEventsPreview(result.events || []);
      const contactsResult = await getGoogleContactsPreview();
      if (!isCancelled && contactsResult?.success) {
        setGoogleContactsPreview(contactsResult.contacts || []);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [isGoogleConnected]);

  useEffect(() => {
    if (!isOutlookConnected) {
      return;
    }

    let isCancelled = false;
    startTransition(async () => {
      const result = await getOutlookEventsPreview();
      if (isCancelled || !result?.success) return;
      setOutlookEventsPreview(result.events || []);
    });

    return () => {
      isCancelled = true;
    };
  }, [isOutlookConnected]);

  useEffect(() => {
    if (!isAtlassianConnected || !selectedJiraProjectKey) {
      return;
    }

    let isCancelled = false;
    startTransition(async () => {
      const result = await getJiraIssuesByProject(selectedJiraProjectKey);
      if (isCancelled || !result?.success) return;
      setJiraIssuesPreview(result.issues || []);
    });

    return () => {
      isCancelled = true;
    };
  }, [isAtlassianConnected, selectedJiraProjectKey, startTransition]);

  function handleOpenIntegrationPage(url) {
    // OAuth providers (Google/Jira) refuse being opened inside iframes.
    // When this page is rendered inside an embed/preview iframe, force top-level navigation.
    if (typeof window !== "undefined") {
      try {
        if (window.top && window.top !== window.self) {
          window.top.location.href = url;
          return;
        }
      } catch {
        // If top navigation is blocked by browser policies, fallback to same-window navigation.
      }
      window.location.href = url;
      return;
    }

    router.push(url);
  }

  function handleDisconnect(provider) {
    startTransition(async () => {
      let result;
      if (provider === "google") {
        result = await disconnectGoogleIntegration();
      } else if (provider === "atlassian") {
        result = await disconnectJiraIntegration();
      } else {
        result = await disconnectOAuthIntegration(provider);
      }
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

  function handleSaveJiraProject(projectKey) {
    const project = jiraProjects.find((item) => item.key === projectKey);
    if (!project || !jiraCloudId) {
      toast({
        variant: "destructive",
        title: "Błąd projektu Jira",
        description: "Brakuje danych projektu lub instancji Jira.",
      });
      return;
    }

    startTransition(async () => {
      const result = await saveJiraProjectSelection({
        projectKey: project.key,
        projectName: project.name,
        cloudId: jiraCloudId,
      });

      toast({
        variant: result?.success ? "default" : "destructive",
        title: result?.success ? "Projekt Jira zapisany" : "Błąd zapisu projektu",
        description: result?.message,
      });

      if (result?.success) {
        const issuesPreviewResult = await getJiraIssuesByProject(projectKey);
        if (issuesPreviewResult?.success) {
          setJiraIssuesPreview(issuesPreviewResult.issues || []);
        }
        router.refresh();
      }
    });
  }

  function handleSyncNow(provider) {
    startTransition(async () => {
      if (provider === "atlassian") {
        const result = await syncJiraTicketsNow();
        toast({
          variant: result?.success ? "default" : "destructive",
          title: result?.success ? "Jira zsynchronizowana" : "Błąd synchronizacji Jira",
          description: result?.message,
        });
        if (result?.success) {
          setJiraIssuesPreview(result.issues || []);
          router.refresh();
        }
        return;
      }

      if (provider === "google") {
        const [calendarResult, contactsResult] = await Promise.all([
          syncGoogleNow(),
          syncGoogleContactsNow(),
        ]);
        const success = calendarResult?.success || contactsResult?.success;
        toast({
          variant: success ? "default" : "destructive",
          title: success ? "Google zsynchronizowane" : "Błąd synchronizacji Google",
          description:
            calendarResult?.message || contactsResult?.message || "Synchronizacja nie powiodła się.",
        });
        if (success) {
          if (calendarResult?.success) {
            setGoogleEventsPreview(calendarResult.events || []);
          }
          if (contactsResult?.success) {
            setGoogleContactsPreview(contactsResult.contacts || []);
          }
          router.refresh();
        }
        return;
      }

      if (provider === "azure-ad") {
        const result = await syncOutlookNow();
        toast({
          variant: result?.success ? "default" : "destructive",
          title: result?.success ? "Outlook zsynchronizowany" : "Błąd synchronizacji Outlook",
          description: result?.message,
        });
        if (result?.success) {
          setOutlookEventsPreview(result.events || []);
          router.refresh();
        }
      }
    });
  }

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {OAUTH_INTEGRATIONS.map((integration) => {
        const isConnected = connectedSet.has(integration.provider);
        const Icon = integration.icon;

        return (
          <Card key={integration.id} className="flex h-full min-h-[280px] flex-col">
            <CardHeader className="space-y-3 pb-2">
              <CardTitle className="flex items-start justify-between gap-2 text-base leading-6">
                <span className="flex min-w-0 items-center gap-2">
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  {integration.title}
                </span>
                {isConnected ? (
                  <Badge className="shrink-0 whitespace-nowrap bg-green-600 text-white hover:bg-green-600">
                    Połączono
                  </Badge>
                ) : (
                  <Badge variant="outline" className="shrink-0 whitespace-nowrap">
                    Niepołączono
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="min-h-[72px] text-sm leading-6">
                {integration.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-3">
              {integration.provider === "atlassian" && isConnected ? (
                <div className="space-y-2">
                  {jiraProjectsError ? (
                    <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
                      {jiraProjectsError}
                    </div>
                  ) : (
                    <>
                      <Label className="text-xs text-muted-foreground">
                        Wybierz projekt Jira
                      </Label>
                      <Select
                        value={selectedJiraProjectKey}
                        onValueChange={handleSaveJiraProject}
                        disabled={isPending || jiraProjects.length === 0}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Wybierz projekt Jira" />
                        </SelectTrigger>
                        <SelectContent>
                          {jiraProjects.map((project) => (
                            <SelectItem key={project.id} value={project.key}>
                              {project.name} ({project.key})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {jiraProjects.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          Brak projektów Jira dostępnych dla tego konta.
                        </p>
                      ) : null}
                    </>
                  )}
                </div>
              ) : null}

              {integration.provider === "atlassian" && isConnected && selectedJiraProjectKey ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Ostatni sync ticketów:{" "}
                    {jiraLastSyncedAt
                      ? new Date(jiraLastSyncedAt).toLocaleString("pl-PL")
                      : "jeszcze nie wykonano"}
                  </p>
                  {jiraLastError ? (
                    <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
                      {jiraLastError}
                    </div>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    Ostatnie tickety ({jiraIssuesPreview.length})
                  </p>
                  <div className="max-h-32 space-y-1 overflow-auto rounded-md border p-2">
                    {jiraIssuesPreview.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Brak ticketów dla wybranego projektu.
                      </p>
                    ) : (
                      jiraIssuesPreview.map((issue) => (
                        <a
                          key={issue.id}
                          href={issue.url || "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-start justify-between gap-2 rounded border bg-muted/40 p-2 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="font-medium">
                              {issue.key}: {issue.summary}
                            </div>
                            <div className="text-muted-foreground">Status: {issue.status}</div>
                          </div>
                          <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
                        </a>
                      ))
                    )}
                  </div>
                </div>
              ) : null}

              {integration.provider === "google" && isConnected ? (
                <div className="space-y-2">
                  {googleEmail ? (
                    <p className="text-xs text-muted-foreground">Konto: {googleEmail}</p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    Ostatnia synchronizacja:{" "}
                    {googleLastSyncedAt
                      ? new Date(googleLastSyncedAt).toLocaleString("pl-PL")
                      : "jeszcze nie wykonano"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Sync kalendarza:{" "}
                    {googleCalendarLastSyncedAt
                      ? new Date(googleCalendarLastSyncedAt).toLocaleString("pl-PL")
                      : "brak"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Sync kontaktów:{" "}
                    {googleContactsLastSyncedAt
                      ? new Date(googleContactsLastSyncedAt).toLocaleString("pl-PL")
                      : "brak"}
                  </p>
                  {googleLastError ? (
                    <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
                      {googleLastError}
                    </div>
                  ) : null}
                  <div className="max-h-32 space-y-1 overflow-auto rounded-md border p-2">
                    {googleEventsPreview.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Brak wydarzeń Google do podglądu.
                      </p>
                    ) : (
                      googleEventsPreview.map((event) => (
                        <a
                          key={event.id}
                          href={event.externalUrl || "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="block rounded border bg-muted/40 p-2 text-xs"
                        >
                          <div className="font-medium">{event.title}</div>
                          <div className="text-muted-foreground">
                            Start: {event.start ? new Date(event.start).toLocaleString("pl-PL") : "-"}
                          </div>
                        </a>
                      ))
                    )}
                  </div>
                  <div className="max-h-28 space-y-1 overflow-auto rounded-md border p-2">
                    {googleContactsPreview.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Brak kontaktów Google do podglądu.
                      </p>
                    ) : (
                      googleContactsPreview.map((contact) => (
                        <div key={contact.email} className="rounded border bg-muted/40 p-2 text-xs">
                          <div className="font-medium">
                            {contact.firstName} {contact.lastName || ""}
                          </div>
                          <div className="text-muted-foreground">{contact.email}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : null}

              {integration.provider === "azure-ad" && isConnected ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Nadchodzące wydarzenia ({outlookEventsPreview.length})
                  </p>
                  <div className="max-h-32 space-y-1 overflow-auto rounded-md border p-2">
                    {outlookEventsPreview.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Brak wydarzeń do podglądu.
                      </p>
                    ) : (
                      outlookEventsPreview.map((event) => (
                        <a
                          key={event.id}
                          href={event.webLink || "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="block rounded border bg-muted/40 p-2 text-xs"
                        >
                          <div className="font-medium">{event.subject}</div>
                          <div className="text-muted-foreground">
                            Start: {event.start ? new Date(event.start).toLocaleString("pl-PL") : "-"}
                          </div>
                        </a>
                      ))
                    )}
                  </div>
                </div>
              ) : null}
            </CardContent>
            <CardFooter className="pt-2">
              {isConnected ? (
                <div className="grid w-full grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleSyncNow(integration.provider)}
                    disabled={isPending}
                    className="w-full"
                  >
                    Sync now
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => handleDisconnect(integration.provider)}
                    disabled={isPending}
                    className="w-full"
                  >
                    Odłącz
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  onClick={() => handleOpenIntegrationPage(integration.connectHref)}
                  disabled={isPending}
                  className="w-full"
                >
                  {integration.connectLabel}
                </Button>
              )}
            </CardFooter>
          </Card>
        );
      })}

      <Card className="flex h-full min-h-[280px] flex-col">
        <CardHeader className="space-y-3 pb-2">
          <CardTitle className="flex items-center gap-2 text-base leading-6">
            <Briefcase className="size-4 text-muted-foreground" />
            Inna integracja (Klucz API)
          </CardTitle>
          <CardDescription className="min-h-[72px] text-sm leading-6">
            Dodaj własną integrację przez ręczny klucz API.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
            Dla integracji niestandardowych zapisujemy klucz API bezpiecznie po stronie serwera.
          </div>
        </CardContent>
        <CardFooter className="pt-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button type="button" variant="secondary" className="w-full">
                <PlugZap className="mr-1 size-4" />
                Dodaj klucz API
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nowa integracja API Key</DialogTitle>
                <DialogDescription>
                  Wybierz dostawcę z listy, a system automatycznie dobierze konfigurację API.
                  Klucz zostanie zapisany w postaci zaszyfrowanej.
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
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Anuluj
                </Button>
                <Button type="button" onClick={handleSaveApiKey} disabled={isPending}>
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
