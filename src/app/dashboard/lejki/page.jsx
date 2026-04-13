import Link from "next/link";
import {
  createFunnel,
  deleteFunnel,
  getFunnelsWithDetails,
} from "@/app/actions/funnelActions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_LABEL = {
  DRAFT: "Szkic",
  ACTIVE: "Aktywny",
  ARCHIVED: "Archiwalny",
};

export default async function FunnelsPage() {
  let funnels = [];
  let prismaSyncWarning = "";

  try {
    funnels = await getFunnelsWithDetails();
  } catch (error) {
    prismaSyncWarning =
      error instanceof Error ? error.message : "Nie udalo sie pobrac lejkow.";
  }

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Lejki</h1>
        <p className="text-sm text-muted-foreground">
          Zarzadzaj lejkami, krokami i testami A/B.
        </p>
        {prismaSyncWarning ? (
          <p className="mt-2 text-sm text-amber-600">{prismaSyncWarning}</p>
        ) : null}
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Nowy lejek</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createFunnel} className="grid gap-3 md:grid-cols-4">
            <Input name="name" placeholder="Nazwa lejka" required />
            <Input name="slug" placeholder="Slug (np. webinar-maj)" required />
            <select
              name="status"
              defaultValue="DRAFT"
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              <option value="DRAFT">Szkic</option>
              <option value="ACTIVE">Aktywny</option>
              <option value="ARCHIVED">Archiwalny</option>
            </select>
            <Button type="submit">Utworz lejek</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista lejkow</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nazwa</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Kroki</TableHead>
                <TableHead className="text-right">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {funnels.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Brak lejkow.
                  </TableCell>
                </TableRow>
              ) : (
                funnels.map((funnel) => (
                  <TableRow key={funnel.id}>
                    <TableCell>{funnel.name}</TableCell>
                    <TableCell>{funnel.slug}</TableCell>
                    <TableCell>{STATUS_LABEL[funnel.status] ?? funnel.status}</TableCell>
                    <TableCell>{funnel.steps.length}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/dashboard/lejki/${funnel.id}`}>Szczegoly</Link>
                        </Button>
                        <form action={deleteFunnel}>
                          <input type="hidden" name="id" value={funnel.id} />
                          <Button type="submit" variant="destructive" size="sm">
                            Usun
                          </Button>
                        </form>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}
