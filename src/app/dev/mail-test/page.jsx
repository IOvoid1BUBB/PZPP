"use client";

import { useState, useTransition } from "react";
import { sendTemplatedEmail } from "@/app/actions/messageActions";

export default function MailTestPage() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState(null);

  const handleSend = () => {
    startTransition(async () => {
      const res = await sendTemplatedEmail(
        "cmmp8nqqx0000m3w4dhnl8cxu",
        "jkowalski@gmail.com",
        "CrmWelcomeLead",
        {
          leadName: "Jan",
          source: "Test MailDev",
        }
      );
      setResult(res);
    });
  };

  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Test wysyłki e-mail (MailDev)</h1>
      <p style={{ marginTop: 8, color: "#475467" }}>
        Kliknij przycisk poniżej — mail powinien pojawić się w MailDev na{" "}
        <code>http://localhost:8025</code>.
      </p>

      <button
        onClick={handleSend}
        disabled={isPending}
        style={{
          marginTop: 14,
          padding: "10px 14px",
          borderRadius: 10,
          border: "none",
          background: "#5ec269",
          color: "#fff",
          cursor: isPending ? "not-allowed" : "pointer",
          fontWeight: 600,
        }}
      >
        {isPending ? "Wysyłam..." : "Wyślij testowego maila"}
      </button>

      {result ? (
        <pre
          style={{
            marginTop: 16,
            fontSize: 12,
            background: "#0b1220",
            color: "#e6edf3",
            padding: 12,
            borderRadius: 12,
            overflowX: "auto",
          }}
        >
          {JSON.stringify(result, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}

