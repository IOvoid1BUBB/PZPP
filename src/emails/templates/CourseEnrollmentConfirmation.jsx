import React from "react";
import { Button, Heading, Section, Text } from "@react-email/components";
import Layout from "../components/Layout";

export function getSubject({ courseTitle } = {}) {
  return courseTitle ? `Potwierdzenie dostępu: ${courseTitle}` : "Potwierdzenie dostępu do kursu";
}

export default function CourseEnrollmentConfirmation(props) {
  const { userName, courseTitle, loginUrl } = props || {};

  return (
    <Layout preheader="Potwierdzamy dostęp do kursu">
      <Section>
        <Heading style={{ fontSize: "22px", margin: "0 0 12px", color: "#101828" }}>
          Potwierdzenie dostępu
        </Heading>

        <Text style={{ fontSize: "14px", lineHeight: "22px", margin: 0, color: "#344054" }}>
          {userName ? (
            <>
              Cześć <strong>{userName}</strong>!
            </>
          ) : (
            <>Cześć!</>
          )}{" "}
          Otrzymałeś dostęp do kursu <strong>{courseTitle || "—"}</strong>.
        </Text>

        <Text style={{ fontSize: "14px", lineHeight: "22px", margin: "14px 0 0", color: "#344054" }}>
          Zaloguj się, aby rozpocząć naukę.
        </Text>

        {loginUrl ? (
          <Section style={{ paddingTop: 18 }}>
            <Button
              href={loginUrl}
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
              Zaloguj się
            </Button>
          </Section>
        ) : null}
      </Section>
    </Layout>
  );
}

