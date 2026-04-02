import React from "react";
import { Heading, Text, Section } from "@react-email/components";
import Layout from "../components/Layout";

export function getSubject({ customSubject } = {}) {
  return customSubject ? String(customSubject) : "Wiadomość";
}

export default function CrmCustomMessage({ customSubject, content } = {}) {
  const safeContent = content != null ? String(content) : "";
  const lines = safeContent.split("\n");

  return (
    <Layout preheader={customSubject ? String(customSubject) : "Wiadomość z CRM"}>
      <Section>
        {customSubject ? (
          <Heading style={{ fontSize: "20px", margin: "0 0 16px", color: "#101828" }}>
            {String(customSubject)}
          </Heading>
        ) : null}

        {lines.map((line, i) => (
          <Text
            key={i}
            style={{
              fontSize: "14px",
              lineHeight: "22px",
              margin: i === 0 ? 0 : "8px 0 0",
              color: "#344054",
              whiteSpace: "pre-wrap",
            }}
          >
            {line.length ? line : "\u00a0"}
          </Text>
        ))}
      </Section>
    </Layout>
  );
}
