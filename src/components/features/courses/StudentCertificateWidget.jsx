"use client";

import { useEffect, useState } from "react";
import { Award } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { getStudentCertificateProgress } from "@/app/actions/courseActions";

function CertificateWidgetSkeleton() {
  return (
    <div className="mt-3 rounded-lg border border-sidebar-border/80 bg-sidebar-accent/30 px-3 py-3">
      <div className="h-3 w-28 animate-pulse rounded bg-sidebar-accent" />
      <div className="mt-2 h-1.5 w-full animate-pulse rounded bg-sidebar-accent" />
      <div className="mt-2 h-3 w-20 animate-pulse rounded bg-sidebar-accent" />
    </div>
  );
}

export default function StudentCertificateWidget({ courseId }) {
  const [state, setState] = useState({
    isLoading: true,
    shouldRender: false,
    progress: 0,
    completedLessons: 0,
    totalLessons: 0,
    isCompleted: false,
  });

  useEffect(() => {
    if (!courseId) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        shouldRender: true,
      }));
      return;
    }

    let isActive = true;

    const fetchProgress = async () => {
      setState((prev) => ({ ...prev, isLoading: true }));
      const result = await getStudentCertificateProgress(courseId);
      if (!isActive) return;

      if (!result?.success || !result?.shouldRender) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          shouldRender: false,
        }));
        return;
      }

      setState({
        isLoading: false,
        shouldRender: true,
        progress: result.progress ?? 0,
        completedLessons: result.completedLessons ?? 0,
        totalLessons: result.totalLessons ?? 0,
        isCompleted: Boolean(result.isCompleted),
      });
    };

    fetchProgress();

    return () => {
      isActive = false;
    };
  }, [courseId]);

  if (!courseId) {
    return (
      <div className="mt-3 rounded-lg border border-sidebar-border/80 bg-sidebar-accent/30 px-3 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Certyfikat
        </p>
        <p className="mt-1 text-xs leading-relaxed text-sidebar-foreground/80">
          Wejdź do konkretnego kursu, aby zobaczyć postęp i status certyfikatu.
        </p>
      </div>
    );
  }
  if (state.isLoading) return <CertificateWidgetSkeleton />;
  if (!state.shouldRender) return null;

  return (
    <div className="mt-3 rounded-lg border border-sidebar-border/80 bg-sidebar-accent/30 px-3 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Certyfikat
        </p>
        {state.isCompleted ? <Award className="size-4 text-emerald-600" /> : null}
      </div>

      <Progress
        value={state.progress}
        className={`mt-3 ${
          state.isCompleted
            ? "h-1.5 bg-emerald-100 [&>[data-slot=progress-indicator]]:bg-emerald-600"
            : "h-1.5"
        }`}
      />

      <div className="mt-2 flex items-center justify-between text-xs text-sidebar-foreground/80">
        <span className="font-medium">{state.progress}%</span>
        <span>
          {state.completedLessons}/{state.totalLessons} lekcji
        </span>
      </div>
    </div>
  );
}
