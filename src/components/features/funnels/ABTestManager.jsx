"use client";

import { useState } from "react";
import { createABTestForStep } from "@/app/actions/funnelActions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";

export default function ABTestManager({ funnelId, stepId, landingPages }) {
  const [weightA, setWeightA] = useState(50);

  return (
    <Card className="mt-3">
      <CardHeader>
        <CardTitle className="text-base">Nowy test A/B</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={createABTestForStep} className="space-y-4">
          <input type="hidden" name="funnelId" value={funnelId} />
          <input type="hidden" name="funnelStepId" value={stepId} />
          <input type="hidden" name="variantAWeight" value={weightA} />
          <input type="hidden" name="variantBWeight" value={100 - weightA} />

          <div className="grid gap-3 md:grid-cols-3">
            <Input name="name" placeholder="Nazwa testu (np. Hero copy v1 vs v2)" required />
            <select
              name="status"
              defaultValue="DRAFT"
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              <option value="DRAFT">Szkic</option>
              <option value="ACTIVE">Aktywny</option>
              <option value="PAUSED">Pauza</option>
              <option value="COMPLETED">Zakonczony</option>
            </select>
            <Input name="startsAt" type="datetime-local" />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm text-muted-foreground">Wariant A</span>
              <select
                name="variantALandingPageId"
                required
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="">Wybierz strone</option>
                {landingPages.map((page) => (
                  <option key={page.id} value={page.id}>
                    {page.title} ({page.slug})
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm text-muted-foreground">Wariant B</span>
              <select
                name="variantBLandingPageId"
                required
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="">Wybierz strone</option>
                {landingPages.map((page) => (
                  <option key={page.id} value={page.id}>
                    {page.title} ({page.slug})
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Podzial ruchu: A {weightA}% / B {100 - weightA}%
            </p>
            <Slider
              value={[weightA]}
              min={0}
              max={100}
              step={1}
              onValueChange={(value) => setWeightA(value[0] ?? 50)}
            />
          </div>

          <Button type="submit">Utworz test A/B</Button>
        </form>
      </CardContent>
    </Card>
  );
}
