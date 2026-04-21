"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  createLandingPage,
  deleteLandingPage,
  listLandingPages,
  setLandingPageActive,
} from "@/app/actions/landingPageActions";

export default function PageBuilderPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [rows, setRows] = useState([]);

  const origin = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.origin;
  }, []);

  const load = async () => {
    setIsLoading(true);
    const pages = await listLandingPages();
    setRows(Array.isArray(pages) ? pages : []);
    setIsLoading(false);
  };

  useEffect(() => {
    load();
     
  }, []);

  const handleCreate = async () => {
    setIsCreating(true);
    const res = await createLandingPage();
    setIsCreating(false);
    if (!res?.success) {
      alert(res?.error || "Nie udało się utworzyć strony.");
      return;
    }
    router.push(`/dashboard/pagebuilder/${res.page.id}`);
  };

  const handleDelete = async (id) => {
    const ok = window.confirm("Usunąć tę stronę? Tej operacji nie da się cofnąć.");
    if (!ok) return;
    const res = await deleteLandingPage(id);
    if (!res?.success) {
      alert(res?.error || "Nie udało się usunąć strony.");
      return;
    }
    await load();
  };

  const copyLink = async (slug) => {
    const url = `${origin}/${slug}`;
    await navigator.clipboard.writeText(url);
  };

  const handleToggleActive = async (id, nextValue) => {
    // optimistic update
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isActive: nextValue } : r))
    );

    const res = await setLandingPageActive(id, nextValue);
    if (!res?.success) {
      // revert on error
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, isActive: !nextValue } : r))
      );
      alert(res?.error || "Nie udało się zmienić statusu.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Menedżer Landing Page’y
            </h1>
            <p className="text-gray-600">
              Twórz, publikuj i zarządzaj stronami sprzedażowymi w jednym miejscu.
            </p>
          </div>
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? "Tworzenie..." : "Stwórz nową stronę"}
          </Button>
        </div>

        <div className="rounded-xl border bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tytuł</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Utworzono</TableHead>
                <TableHead>URL</TableHead>
                <TableHead className="text-right">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-gray-500">
                    Ładowanie…
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-gray-500">
                    Brak stron. Kliknij „Stwórz nową stronę”, aby zacząć.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((p) => {
                  const url = `${origin}/${p.slug}`;
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="max-w-[320px] whitespace-normal">
                        <div className="font-medium text-gray-900">{p.title}</div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs text-gray-700">{p.slug}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={Boolean(p.isActive)}
                            onCheckedChange={(v) => handleToggleActive(p.id, Boolean(v))}
                            aria-label="Przełącz status publikacji"
                          />
                          <span
                            className={
                              p.isActive
                                ? "inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700"
                                : "inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700"
                            }
                          >
                            {p.isActive ? "Publiczny" : "Szkic"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {new Date(p.createdAt).toLocaleDateString("pl-PL")}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/${p.slug}`}
                          target="_blank"
                          className="text-sm font-medium text-blue-600 hover:underline"
                        >
                          Otwórz
                        </Link>
                        <div className="text-xs text-gray-500">{url}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/dashboard/pagebuilder/${p.id}`)}
                          >
                            Edytuj
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyLink(p.slug)}
                          >
                            Kopiuj link
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(p.id)}
                          >
                            Usuń
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
