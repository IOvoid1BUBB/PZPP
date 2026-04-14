"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAutomationRules,
  createAutomationRule,
  toggleAutomationRule,
  deleteAutomationRule,
  getAutomationLogs,
} from "@/app/actions/automationActions";
import AutomationRuleForm from "@/components/crm/automations/AutomationRuleForm";
import AutomationLogTable from "@/components/crm/automations/AutomationLogTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Power, Trash2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const TRIGGER_LABELS = {
  LEAD_STATUS_CHANGE: "Zmiana statusu leada",
  DEAL_STAGE_CHANGE: "Zmiana etapu deala",
};

const ACTION_LABELS = {
  SEND_EMAIL_TEMPLATE: "Wyslij email",
  CREATE_TASK: "Utworz zadanie",
};

function describeTriggerConfig(rule) {
  const cfg = rule.triggerConfig || {};
  const parts = [];
  if (rule.triggerType === "LEAD_STATUS_CHANGE") {
    if (cfg.fromStatus) parts.push(`z ${cfg.fromStatus}`);
    if (cfg.toStatus) parts.push(`na ${cfg.toStatus}`);
  } else {
    if (cfg.fromStage) parts.push(`z ${cfg.fromStage}`);
    if (cfg.toStage) parts.push(`na ${cfg.toStage}`);
  }
  return parts.length > 0 ? parts.join(" ") : "dowolna zmiana";
}

function describeActionConfig(rule) {
  const cfg = rule.actionConfig || {};
  if (rule.actionType === "SEND_EMAIL_TEMPLATE") {
    return `Szablon: ${cfg.templateName || "—"}`;
  }
  if (rule.actionType === "CREATE_TASK") {
    return `"${cfg.title || "Zadanie"}" za ${cfg.dueDays || 1} dni`;
  }
  return "—";
}

export default function AutomatyzacjePage() {
  const queryClient = useQueryClient();

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["automation-rules"],
    queryFn: () => getAutomationRules(),
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["automation-logs"],
    queryFn: () => getAutomationLogs(),
  });

  const toggleMutation = useMutation({
    mutationFn: (ruleId) => toggleAutomationRule(ruleId),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["automation-rules"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (ruleId) => deleteAutomationRule(ruleId),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["automation-rules"] }),
  });

  async function handleCreate(data) {
    const result = await createAutomationRule(data);
    if (result.success) {
      queryClient.invalidateQueries({ queryKey: ["automation-rules"] });
    }
    return result;
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Automatyzacje</h1>
          <p className="text-sm text-muted-foreground">
            Twórz reguly &quot;jesli -&gt; wtedy&quot;, które automatycznie reaguja na zmiany statusow.
          </p>
        </div>
        <AutomationRuleForm onSubmit={handleCreate} />
      </header>

      <Tabs defaultValue="rules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rules">Reguly ({rules.length})</TabsTrigger>
          <TabsTrigger value="logs">Historia wykonan</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-3">
          {isLoading ? (
            <p className="rounded-lg border bg-accent/30 px-4 py-8 text-center text-sm text-muted-foreground">
              Ladowanie regul...
            </p>
          ) : rules.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center gap-2 py-10">
                <Zap className="size-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Brak regul automatyzacji. Dodaj pierwsza regule.
                </p>
              </CardContent>
            </Card>
          ) : (
            rules.map((rule) => (
              <Card key={rule.id} className={cn("transition-opacity", !rule.isActive && "opacity-60")}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Power className={cn("size-4", rule.isActive ? "text-emerald-500" : "text-muted-foreground")} />
                      {rule.name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={rule.isActive}
                        onCheckedChange={() => toggleMutation.mutate(rule.id)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-red-600"
                        onClick={() => deleteMutation.mutate(rule.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 text-sm">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      Jesli: {TRIGGER_LABELS[rule.triggerType] || rule.triggerType}
                    </Badge>
                    <Badge variant="secondary">{describeTriggerConfig(rule)}</Badge>
                    <span className="text-muted-foreground">→</span>
                    <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200">
                      Wtedy: {ACTION_LABELS[rule.actionType] || rule.actionType}
                    </Badge>
                    <Badge variant="secondary">{describeActionConfig(rule)}</Badge>
                  </div>
                  {rule._count?.logs > 0 && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Wykonano {rule._count.logs} razy
                    </p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="logs">
          <AutomationLogTable logs={logs} />
        </TabsContent>
      </Tabs>
    </section>
  );
}
