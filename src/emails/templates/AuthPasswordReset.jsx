import React from "react";
import { Button, Heading, Section, Text } from "@react-email/components";
import Layout from "../components/Layout";

export function getSubject({ email } = {}) {
  return email ? `Reset hasła dla ${email}` : "Reset hasła";
}

export default function AuthPasswordReset(props) {
  const { userName, email, resetUrl } = props || {};

  return (
    <Layout preheader="Otrzymaliśmy prośbę o reset hasła">
      <Section>
        <Heading style={{ fontSize: "22px", margin: "0 0 12px", color: "#101828" }}>
          Reset hasła
        </Heading>

        <Text style={{ fontSize: "14px", lineHeight: "22px", margin: 0, color: "#344054" }}>
          {userName ? (
            <>
              Cześć <strong>{userName}</strong>,
            </>
          ) : (
            <>Cześć,</>
          )}{" "}
          otrzymaliśmy prośbę o zmianę hasła{email ? ` dla ${email}` : ""}.
        </Text>

        <Text style={{ fontSize: "14px", lineHeight: "22px", margin: "14px 0 0", color: "#344054" }}>
          Kliknij przycisk poniżej, aby ustawić nowe hasło. Jeśli to nie Ty, zignoruj wiadomość.
        </Text>

        {resetUrl ? (
          <Section style={{ paddingTop: 18 }}>
            <Button
              href={resetUrl}
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
              Zresetuj hasło
            </Button>
          </Section>
        ) : null}
      </Section>
    </Layout>
  );
}

