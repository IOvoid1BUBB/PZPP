import React from "react";
import { Heading, Text, Section } from "@react-email/components";
import Layout from "../components/Layout";

export function getSubject({ leadName, source } = {}) {
  const safeLead = leadName ? String(leadName) : "Twój zespół";
  const safeSource = source ? String(source) : "formularza";
  return `Witamy! Dziękujemy za kontakt (${safeSource})`;
}

export default function CrmWelcomeLead(props) {
  const { leadName, source } = props || {};

  return (
    <Layout
      preheader={leadName ? `Witamy, ${leadName}!` : "Witamy w naszym CRM"}
    >
      <Section>
        <Heading style={{ fontSize: "22px", margin: "0 0 12px", color: "#101828" }}>
          Witamy{leadName ? `, ${leadName}` : ""}!
        </Heading>

        <Text style={{ fontSize: "14px", lineHeight: "22px", margin: 0, color: "#344054" }}>
          Dziękujemy za kontakt ze źródła <strong>{source || "Twojego formularza"}</strong>. Nasz zespół
          wróci do Ciebie z odpowiedzią tak szybko, jak to możliwe.
        </Text>

        <Text style={{ fontSize: "14px", lineHeight: "22px", margin: "14px 0 0", color: "#344054" }}>
          Jeśli masz pytania, po prostu odpisz na tę wiadomość.
        </Text>
      </Section>
    </Layout>
  );
}

