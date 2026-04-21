import { Lock } from "lucide-react";

export default function AccessDeniedOverlay({ message }: { message?: string }) {
  return (
    <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-destructive/20 bg-destructive/5 p-6">
      <div className="text-center">
        <div className="mx-auto mb-3 inline-flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <Lock className="size-5" />
        </div>
        <h3 className="text-lg font-semibold">Brak dostępu do odtwarzacza</h3>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          {message || "Nie masz aktywnego dostępu do tego kursu lub lekcji."}
        </p>
      </div>
    </div>
  );
}
