import React from "react";
import { Button, Heading, Section, Text } from "@react-email/components";
import Layout from "../components/Layout";

export function getSubject({ courseTitle } = {}) {
  return courseTitle ? `Gratulacje! Certyfikat: ${courseTitle}` : "Gratulacje! Certyfikat";
}

export default function CourseCertificateAwarded(props) {
  const { userName, courseTitle, certificateUrl } = props || {};

  return (
    <Layout preheader="Gratulacje za 100% progresu">
      <Section>
        <Heading style={{ fontSize: "22px", margin: "0 0 12px", color: "#101828" }}>
          Gratulacje!
        </Heading>

        <Text style={{ fontSize: "14px", lineHeight: "22px", margin: 0, color: "#344054" }}>
          {userName ? (
            <>
              {`Cześć, `} <strong>{userName}</strong>!
            </>
          ) : (
            <>Cześć!</>
          )}{" "}
          Ukończyłeś kurs <strong>{courseTitle || "—"}</strong> w 100%.
        </Text>

        <Text style={{ fontSize: "14px", lineHeight: "22px", margin: "14px 0 0", color: "#344054" }}>
          Certyfikat jest gotowy do pobrania w Twoim panelu.
        </Text>

        {certificateUrl ? (
          <Section style={{ paddingTop: 18 }}>
            <Button
              href={certificateUrl}
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
              Pobierz certyfikat
            </Button>
          </Section>
        ) : null}
      </Section>
    </Layout>
  );
}

