"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  changePassword,
  getSettingsData,
  updateProfile,
  updateTimezone,
} from "@/app/actions/settingsActions";
import { getIntegrationsData } from "@/app/actions/integrationActions";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import IntegrationPanelClient from "./integracje/IntegrationPanelClient";

const TIMEZONE_OPTIONS = [
  { value: "Europe/Warsaw", label: "Europe/Warsaw (PL)" },
  { value: "Europe/London", label: "Europe/London (UK)" },
  { value: "Europe/Berlin", label: "Europe/Berlin (DE)" },
  { value: "America/New_York", label: "America/New_York (US East)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (US West)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (JP)" },
];

const profileSchema = z.object({
  firstName: z.string().trim().min(2, "Imię musi mieć co najmniej 2 znaki."),
  lastName: z.string().trim().optional(),
});

const passwordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Podaj aktualne hasło.")
      .min(8, "Hasło musi mieć co najmniej 8 znaków."),
    newPassword: z.string().min(8, "Nowe hasło musi mieć co najmniej 8 znaków."),
    confirmNewPassword: z
      .string()
      .min(8, "Powtórzone hasło musi mieć co najmniej 8 znaków."),
  })
  .refine((values) => values.currentPassword !== values.newPassword, {
    message: "Nowe hasło musi różnić się od aktualnego.",
    path: ["newPassword"],
  })
  .refine((values) => values.newPassword === values.confirmNewPassword, {
    message: "Pole 'Powtórz nowe hasło' musi być równe polu 'Nowe hasło'.",
    path: ["confirmNewPassword"],
  });

const preferencesSchema = z.object({
  timezone: z.string().min(1, "Wybierz strefę czasową."),
});

export default function SettingsPage() {
  const { toast } = useToast();
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [integrationsData, setIntegrationsData] = useState({
    connectedProviders: [],
    jiraProjects: [],
    jiraProjectsError: null,
    jiraSelectedProjectKey: null,
    jiraSelectedProjectName: null,
    jiraSelectedCloudId: null,
  });

  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
    },
  });

  const passwordForm = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  const preferencesForm = useForm({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      timezone: "Europe/Warsaw",
    },
  });

  useEffect(() => {
    async function loadSettings() {
      setIsInitialLoading(true);
      const [settingsResult, integrationsResult] = await Promise.all([
        getSettingsData(),
        getIntegrationsData(),
      ]);

      if (!settingsResult?.success) {
        toast({
          variant: "destructive",
          title: "Nie udało się pobrać ustawień",
          description: settingsResult?.message || "Spróbuj odświeżyć stronę.",
        });
        setIsInitialLoading(false);
        return;
      }

      profileForm.reset({
        firstName: settingsResult.data.firstName || "",
        lastName: settingsResult.data.lastName || "",
      });
      preferencesForm.reset({
        timezone: settingsResult.data.timezone || "Europe/Warsaw",
      });

      if (integrationsResult?.success) {
        setIntegrationsData({
          connectedProviders: integrationsResult.data.connectedProviders || [],
          jiraProjects: integrationsResult.data.jiraProjects || [],
          jiraProjectsError: integrationsResult.data.jiraProjectsError || null,
          jiraSelectedProjectKey: integrationsResult.data.jiraSelectedProjectKey || null,
          jiraSelectedProjectName: integrationsResult.data.jiraSelectedProjectName || null,
          jiraSelectedCloudId: integrationsResult.data.jiraSelectedCloudId || null,
        });
      } else {
        setIntegrationsData({
          connectedProviders: [],
          jiraProjects: [],
          jiraProjectsError: null,
          jiraSelectedProjectKey: null,
          jiraSelectedProjectName: null,
          jiraSelectedCloudId: null,
        });
      }
      setIsInitialLoading(false);
    }

    loadSettings();
  }, [profileForm, preferencesForm, toast]);

  async function onSubmitProfile(values) {
    const result = await updateProfile(values);

    toast({
      variant: result?.success ? "default" : "destructive",
      title: result?.success ? "Profil zapisany" : "Błąd aktualizacji profilu",
      description: result?.message || "Wystąpił nieoczekiwany błąd.",
    });
  }

  async function onSubmitPassword(values) {
    const result = await changePassword({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
      confirmNewPassword: values.confirmNewPassword,
    });

    toast({
      variant: result?.success ? "default" : "destructive",
      title: result?.success ? "Hasło zmienione" : "Błąd zmiany hasła",
      description: result?.message || "Wystąpił nieoczekiwany błąd.",
    });

    if (result?.success) {
      passwordForm.reset();
    }
  }

  async function onSubmitPreferences(values) {
    const result = await updateTimezone(values.timezone);

    toast({
      variant: result?.success ? "default" : "destructive",
      title: result?.success ? "Preferencje zapisane" : "Błąd zapisu preferencji",
      description: result?.message || "Wystąpił nieoczekiwany błąd.",
    });
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-6">
      <Toaster />

      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Ustawienia konta</h1>
        <p className="text-sm text-muted-foreground">
          Zarządzaj profilem, bezpieczeństwem, preferencjami i integracjami.
        </p>
      </div>

      <Tabs defaultValue="profil" className="w-full space-y-1">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-lg bg-muted/60 p-1 md:grid-cols-4">
          <TabsTrigger value="profil">Profil</TabsTrigger>
          <TabsTrigger value="bezpieczenstwo">Bezpieczeństwo</TabsTrigger>
          <TabsTrigger value="preferencje">Preferencje</TabsTrigger>
          <TabsTrigger value="integracje">Integracje</TabsTrigger>
        </TabsList>

        <TabsContent value="profil" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Edycja profilu</CardTitle>
              <CardDescription>
                Zaktualizuj podstawowe dane widoczne na Twoim koncie.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form
                  onSubmit={profileForm.handleSubmit(onSubmitProfile)}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField
                      control={profileForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem className="self-start">
                          <FormLabel>Imię</FormLabel>
                          <FormControl>
                            <Input placeholder="np. Jan" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem className="self-start">
                          <FormLabel>Nazwisko</FormLabel>
                          <FormControl>
                            <Input placeholder="np. Kowalski" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isInitialLoading || profileForm.formState.isSubmitting}
                  >
                    {profileForm.formState.isSubmitting
                      ? "Zapisywanie..."
                      : "Zapisz profil"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bezpieczenstwo" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Zmiana hasła</CardTitle>
              <CardDescription>
                Dla bezpieczeństwa podaj aktualne hasło, a następnie ustaw nowe.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...passwordForm}>
                <form
                  onSubmit={passwordForm.handleSubmit(onSubmitPassword)}
                  className="space-y-4"
                >
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Aktualne hasło</FormLabel>
                        <FormControl>
                          <Input type="password" autoComplete="current-password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField
                      control={passwordForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nowe hasło</FormLabel>
                          <FormControl>
                            <Input type="password" autoComplete="new-password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={passwordForm.control}
                      name="confirmNewPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Powtórz nowe hasło</FormLabel>
                          <FormControl>
                            <Input type="password" autoComplete="new-password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isInitialLoading || passwordForm.formState.isSubmitting}
                  >
                    {passwordForm.formState.isSubmitting
                      ? "Zapisywanie..."
                      : "Zmień hasło"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferencje" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Preferencje czasu</CardTitle>
              <CardDescription>
                Ustaw strefę czasową używaną do prezentowania dat i godzin.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...preferencesForm}>
                <form
                  onSubmit={preferencesForm.handleSubmit(onSubmitPreferences)}
                  className="space-y-4"
                >
                  <FormField
                    control={preferencesForm.control}
                    name="timezone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Strefa czasowa</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={isInitialLoading}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Wybierz strefę czasową" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {TIMEZONE_OPTIONS.map((tz) => (
                              <SelectItem key={tz.value} value={tz.value}>
                                {tz.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    disabled={isInitialLoading || preferencesForm.formState.isSubmitting}
                  >
                    {preferencesForm.formState.isSubmitting
                      ? "Zapisywanie..."
                      : "Zapisz preferencje"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integracje" className="pt-4">
          <IntegrationPanelClient
            connectedProviders={integrationsData.connectedProviders}
            jiraProjects={integrationsData.jiraProjects}
            jiraProjectsError={integrationsData.jiraProjectsError}
            jiraSelectedProjectKey={integrationsData.jiraSelectedProjectKey}
            jiraSelectedCloudId={integrationsData.jiraSelectedCloudId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
