import React from "react";
import { Button, Heading, Section, Text } from "@react-email/components";
import Layout from "../components/Layout";

export function getSubject({ docTitle } = {}) {
  return docTitle ? `Prośba o podpis: ${docTitle}` : "Prośba o podpis dokumentu";
}

export default function DocSignatureRequest(props) {
  const { recipientName, docTitle, signatureUrl } = props || {};

  return (
    <Layout preheader="Czekamy na Twoje podpisanie dokumentu">
      <Section>
        <Heading style={{ fontSize: "22px", margin: "0 0 12px", color: "#101828" }}>
          Prośba o podpis dokumentu
        </Heading>

        <Text style={{ fontSize: "14px", lineHeight: "22px", margin: 0, color: "#344054" }}>
          {recipientName ? (
            <>
              Witaj <strong>{recipientName}</strong>!
            </>
          ) : (
            <>Dzień dobry!</>
          )}{" "}
          Mamy do podpisu dokument: <strong>{docTitle || "—"}</strong>.
        </Text>

        {signatureUrl ? (
          <Section style={{ paddingTop: 18 }}>
            <Button
              href={signatureUrl}
              style={{
                backgroundColor: "#5ec269",
                borderRadius: "10px",
                color: "#ffffff",
                fontSize: "14px",
                fontWeight: 600,
                padding: "12px 16px",
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              Kliknij, aby podpisać dokument {docTitle ? String(docTitle) : "Z"}
            </Button>
          </Section>
        ) : null}

        <Text style={{ fontSize: "12px", lineHeight: "18px", margin: "14px 0 0", color: "#667085" }}>
          Jeśli nie możesz kliknąć przycisku, skontaktuj się z nami lub sprawdź treść w panelu.
        </Text>
      </Section>
    </Layout>
  );
}

