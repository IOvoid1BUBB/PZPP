"use client";

import React, { useEffect } from "react";

export default function LandingRuntime(props: { htmlData: string; cssData: string }) {
  const { htmlData, cssData } = props;

  useEffect(() => {
    const onClick = async (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const btn = target?.closest?.(".pzpp-checkout-btn") as HTMLElement | null;
      if (!btn) return;

      e.preventDefault();

      const courseId = btn.getAttribute("data-course-id") || "";
      if (!courseId) {
        alert("Wybierz kurs (courseId).");
        return;
      }

      try {
        btn.setAttribute("aria-busy", "true");
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.url) {
          const msg = data?.details ? `${data?.error || "Błąd"}\n\n${data.details}` : data?.error || "Nie udało się rozpocząć płatności.";
          alert(msg);
          return;
        }
        window.location.href = data.url;
      } catch (err) {
        console.error("checkout click error", err);
        alert("Błąd sieci. Spróbuj ponownie.");
      } finally {
        btn.removeAttribute("aria-busy");
      }
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return (
    <div style={{ width: "100vw", minHeight: "100vh", margin: 0, padding: 0 }}>
      <style
         
        dangerouslySetInnerHTML={{
          __html: `
            html, body { margin: 0; padding: 0; height: 100%; width: 100%; }
            body { overflow-x: hidden; }
            ${cssData}
          `,
        }}
      />
      <main
        style={{ width: "100%", minHeight: "100vh" }}
         
        dangerouslySetInnerHTML={{ __html: htmlData }}
      />
    </div>
  );
}

