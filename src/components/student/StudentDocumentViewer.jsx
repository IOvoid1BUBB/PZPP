"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { signStudentDocument } from "@/app/actions/documentActions";

function isPdfUrl(url) {
  return String(url || "").toLowerCase().includes(".pdf");
}

export default function StudentDocumentViewer({ document }) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(Boolean(document?.isSigned));
  const sigRef = useRef(null);
  const sigWrapRef = useRef(null);
  const SIG_HEIGHT = 220;

  const canSign = useMemo(() => {
    if (!document?.requiresSignature) return false;
    if (saved) return false;
    if (!isPdfUrl(document?.fileUrl)) return false;
    return true;
  }, [document?.fileUrl, document?.requiresSignature, saved]);

  const handleClear = () => {
    sigRef.current?.clear?.();
  };

  useEffect(() => {
    if (!sigWrapRef.current) return;

    const resize = () => {
      const pad = sigRef.current;
      const wrap = sigWrapRef.current;
      if (!pad?.getCanvas || !wrap) return;

      const canvas = pad.getCanvas();
      if (!canvas) return;

      const cssWidth = wrap.clientWidth || 0;
      if (!cssWidth) return;

      const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

      // Set internal bitmap size to match CSS size (fixes cursor offset).
      const nextW = Math.max(1, Math.floor(cssWidth * dpr));
      const nextH = Math.max(1, Math.floor(SIG_HEIGHT * dpr));

      if (canvas.width === nextW && canvas.height === nextH) return;

      canvas.width = nextW;
      canvas.height = nextH;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      // Canvas resize clears content; that's OK for initial mount/resize.
      pad.clear();
    };

    resize();

    const ro = new ResizeObserver(() => resize());
    ro.observe(sigWrapRef.current);
    return () => ro.disconnect();
  }, []);

  const handleSave = () => {
    if (!document?.id) return;
    const pad = sigRef.current;
    if (!pad || typeof pad.isEmpty !== "function" || pad.isEmpty()) {
      toast({ variant: "destructive", title: "Złóż podpis", description: "Podpis nie może być pusty." });
      return;
    }

    const dataUrl = pad.toDataURL("image/png");
    startTransition(async () => {
      const res = await signStudentDocument(document.id, dataUrl);
      if (res?.success) {
        setSaved(true);
        toast({ title: "Zapisano", description: "Dokument został podpisany." });
        return;
      }
      toast({
        variant: "destructive",
        title: "Błąd",
        description: res?.error || "Nie udało się zapisać podpisu.",
      });
    });
  };

  return (
    <section className="space-y-4 pb-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{document?.title || "Dokument"}</h1>
        <p className="text-sm text-muted-foreground">
          {document?.requiresSignature
            ? saved
              ? "Status: Podpisano"
              : "Status: Do podpisu"
            : "Status: Bez podpisu"}
        </p>
      </header>

      <div className="overflow-hidden rounded-xl border bg-background">
        <div className="border-b px-4 py-3 text-xs font-semibold text-muted-foreground">
          Podgląd
        </div>
        <div className="bg-muted/10">
          {document?.fileUrl ? (
            <iframe
              title={document?.title || "PDF"}
              src={`/api/documents/${encodeURIComponent(document.id)}/file`}
              className="h-[70vh] w-full"
            />
          ) : (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Brak pliku do wyświetlenia.
            </div>
          )}
        </div>
      </div>

      {document?.requiresSignature && saved ? (
        <div className="rounded-xl border bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Dokument został podpisany.
        </div>
      ) : null}

      {canSign ? (
        <div className="space-y-3 rounded-xl border bg-background p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Podpis</div>
              <div className="text-xs text-muted-foreground">Złóż podpis poniżej i zapisz.</div>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" onClick={handleClear} disabled={isPending}>
                Wyczyść
              </Button>
              <Button type="button" onClick={handleSave} disabled={isPending}>
                {isPending ? "Zapisywanie..." : "Zapisz podpis"}
              </Button>
            </div>
          </div>
          <div ref={sigWrapRef} className="overflow-hidden rounded-lg border bg-white">
            <SignatureCanvas
              ref={sigRef}
              penColor="#111827"
              canvasProps={{
                className: "w-full h-[220px] touch-none",
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Podpis zostanie zapisany w systemie jako potwierdzenie akceptacji dokumentu.
          </p>
        </div>
      ) : null}
    </section>
  );
}

