"use client";

import { useEffect, useState, useTransition } from "react";
import { getJiraIssuesByProject } from "@/app/actions/jiraActions";

export default function JiraIssuesList({ projectKey }) {
  const [issues, setIssues] = useState([]);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!projectKey) {
      setIssues([]);
      setErrorMessage(null);
      return;
    }

    startTransition(async () => {
      const result = await getJiraIssuesByProject(projectKey);
      if (!result?.success) {
        setIssues([]);
        setErrorMessage(result?.message || "Nie udało się pobrać ticketów Jira.");
        return;
      }

      setIssues(result.issues || []);
      setErrorMessage(null);
    });
  }, [projectKey]);

  if (!projectKey) {
    return (
      <div className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
        Wybierz projekt, aby pobrać tickety Jira.
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
        Pobieranie ticketów Jira...
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
        {errorMessage}
      </div>
    );
  }

  if (issues.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
        Brak ticketów dla wybranego projektu.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Ostatnie tickety ({issues.length})</p>
      <div className="max-h-48 space-y-1 overflow-auto rounded-md border p-2">
        {issues.map((issue) => (
          <div key={issue.id} className="rounded border bg-muted/40 p-2 text-xs">
            <div className="font-medium">
              {issue.key}: {issue.summary}
            </div>
            <div className="text-muted-foreground">Status: {issue.status}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
