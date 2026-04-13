import { notFound } from "next/navigation";
import {
  addFunnelStep,
  getFunnelById,
  getLandingPagesForVariants,
  moveFunnelStepDown,
  moveFunnelStepUp,
  updateFunnel,
} from "@/app/actions/funnelActions";
import ABTestManager from "@/components/features/funnels/ABTestManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function FunnelDetailsPage({ params }) {
  const { funnelId } = params;
  const [funnel, landingPages] = await Promise.all([
    getFunnelById(funnelId),
    getLandingPagesForVariants(),
  ]);

  if (!funnel) notFound();

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{funnel.name}</h1>
        <p className="text-sm text-muted-foreground">
          Konfiguracja krokow lejka i testow A/B.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Ustawienia lejka</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateFunnel} className="grid gap-3 md:grid-cols-4">
            <input type="hidden" name="id" value={funnel.id} />
            <Input name="name" defaultValue={funnel.name} required />
            <Input name="slug" defaultValue={funnel.slug} required />
            <select
              name="status"
              defaultValue={funnel.status}
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              <option value="DRAFT">Szkic</option>
              <option value="ACTIVE">Aktywny</option>
              <option value="ARCHIVED">Archiwalny</option>
            </select>
            <Button type="submit">Zapisz</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dodaj krok lejka</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={addFunnelStep} className="grid gap-3 md:grid-cols-5">
            <input type="hidden" name="funnelId" value={funnel.id} />
            <Input name="name" placeholder="Nazwa kroku" required />
            <Input name="slug" placeholder="Slug kroku" required />
            <Input
              name="order"
              type="number"
              min={1}
              defaultValue={funnel.steps.length + 1}
              placeholder="Kolejnosc"
            />
            <select
              name="stepType"
              defaultValue="LANDING"
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              <option value="LANDING">Landing</option>
              <option value="CHECKOUT">Checkout</option>
              <option value="THANK_YOU">Thank you</option>
              <option value="CUSTOM">Custom</option>
            </select>
            <select
              name="landingPageId"
              className="h-10 rounded-md border bg-background px-3 text-sm md:col-span-4"
            >
              <option value="">Domyslna strona (opcjonalnie)</option>
              {landingPages.map((page) => (
                <option key={page.id} value={page.id}>
                  {page.title} ({page.slug})
                </option>
              ))}
            </select>
            <Button type="submit" className="md:col-span-1">
              Dodaj krok
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kroki lejka</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {funnel.steps.length === 0 ? (
            <p className="text-sm text-muted-foreground">Brak krokow w lejku.</p>
          ) : (
            funnel.steps.map((step) => (
              <div key={step.id} className="rounded-lg border p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      #{step.order} {step.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      slug: {step.slug} | typ: {step.stepType}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <form action={moveFunnelStepUp}>
                      <input type="hidden" name="funnelId" value={funnel.id} />
                      <input type="hidden" name="stepId" value={step.id} />
                      <Button type="submit" variant="outline" size="sm">
                        W gore
                      </Button>
                    </form>
                    <form action={moveFunnelStepDown}>
                      <input type="hidden" name="funnelId" value={funnel.id} />
                      <input type="hidden" name="stepId" value={step.id} />
                      <Button type="submit" variant="outline" size="sm">
                        W dol
                      </Button>
                    </form>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Test</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Warianty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {step.abTests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-muted-foreground">
                          Brak testow A/B dla kroku.
                        </TableCell>
                      </TableRow>
                    ) : (
                      step.abTests.map((test) => (
                        <TableRow key={test.id}>
                          <TableCell>{test.name}</TableCell>
                          <TableCell>{test.status}</TableCell>
                          <TableCell>
                            {test.variants
                              .map(
                                (variant) =>
                                  `${variant.name}: ${variant.trafficWeight}% (${variant.views} views)`
                              )
                              .join(" | ")}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                <ABTestManager
                  funnelId={funnel.id}
                  stepId={step.id}
                  landingPages={landingPages}
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </section>
  );
}
