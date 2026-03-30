import React from "react";
import { Button, Heading, Link, Section, Text } from "@react-email/components";
import Layout from "../components/Layout";

function formatDateTimePL(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Warsaw",
  }).format(d);
}

export function getSubject({ meetingTitle } = {}) {
  return `Przypomnienie: spotkanie${meetingTitle ? `: ${meetingTitle}` : ""}`;
}

export default function CalendarMeetingReminder(props) {
  const { meetingTitle, startTime, meetLink } = props || {};
  const formatted = formatDateTimePL(startTime);

  return (
    <Layout preheader="Przypomnienie o spotkaniu">
      <Section>
        <Heading style={{ fontSize: "22px", margin: "0 0 12px", color: "#101828" }}>
          Przypomnienie o spotkaniu
        </Heading>

        <Text style={{ fontSize: "14px", lineHeight: "22px", margin: 0, color: "#344054" }}>
          Godzinę przed spotkaniem przypominamy o terminie.
        </Text>

        <Text style={{ fontSize: "14px", lineHeight: "22px", margin: "12px 0 0", color: "#344054" }}>
          <strong>Spotkanie:</strong> {meetingTitle || "—"}
        </Text>
        <Text style={{ fontSize: "14px", lineHeight: "22px", margin: "10px 0 0", color: "#344054" }}>
          <strong>Termin:</strong> {formatted}
        </Text>

        {meetLink ? (
          <Section style={{ paddingTop: 18 }}>
            <Button
              href={meetLink}
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
              Dołącz teraz
            </Button>
            <Text style={{ fontSize: "12px", lineHeight: "18px", margin: "12px 0 0", color: "#667085" }}>
              Jeśli przycisk nie zadziała, użyj linku:{" "}
              <Link href={meetLink} style={{ color: "#5ec269", textDecoration: "underline" }}>
                {meetLink}
              </Link>
            </Text>
          </Section>
        ) : null}
      </Section>
    </Layout>
  );
}

