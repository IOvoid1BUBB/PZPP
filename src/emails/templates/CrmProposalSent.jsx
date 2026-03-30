import React from "react";
import { Button, Heading, Link, Section, Text } from "@react-email/components";
import Layout from "../components/Layout";

export function getSubject({ leadName } = {}) {
  return leadName ? `Oferta dla ${leadName} (PROPOSAL)` : "Oferta (PROPOSAL)";
}

export default function CrmProposalSent(props) {
  const { leadName, proposalTitle, proposalUrl } = props || {};

  return (
    <Layout preheader="Oferta jest gotowa do zapoznania się">
      <Section>
        <Heading style={{ fontSize: "22px", margin: "0 0 12px", color: "#101828" }}>
          Oferta ({proposalTitle || "Tytuł"})
        </Heading>

        <Text style={{ fontSize: "14px", lineHeight: "22px", margin: 0, color: "#344054" }}>
          {leadName ? (
            <>
              Dla <strong>{leadName}</strong> przygotowaliśmy ofertę.
            </>
          ) : (
            <>Przygotowaliśmy ofertę.</>
          )}
        </Text>

        {proposalUrl ? (
          <Section style={{ paddingTop: 18 }}>
            <Button
              href={proposalUrl}
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
              Zobacz ofertę
            </Button>

            <Text style={{ fontSize: "12px", lineHeight: "18px", margin: "12px 0 0", color: "#667085" }}>
              Jeśli przycisk nie zadziała, użyj linku:{" "}
              <Link href={proposalUrl} style={{ color: "#5ec269", textDecoration: "underline" }}>
                {proposalUrl}
              </Link>
            </Text>
          </Section>
        ) : (
          <Text style={{ fontSize: "14px", lineHeight: "22px", margin: "14px 0 0", color: "#344054" }}>
            Wkrótce otrzymasz dalsze informacje.
          </Text>
        )}
      </Section>
    </Layout>
  );
}

