import React from "react";
import {
  Body,
  Container,
  Head,
  Html,
  Font,
  Section,
  Text,
  Link,
  Hr,
} from "@react-email/components";

const layoutBg = "#E8FBEE";

const blobBackground = {
  backgroundColor: layoutBg,
  backgroundImage:
    "radial-gradient(circle at 12% 18%, rgba(94, 194, 105, 0.26) 0, rgba(94, 194, 105, 0) 52%)," +
    "radial-gradient(circle at 78% 28%, rgba(226, 251, 232, 0.7) 0, rgba(226, 251, 232, 0) 46%)," +
    "radial-gradient(circle at 22% 82%, rgba(103, 115, 137, 0.22) 0, rgba(103, 115, 137, 0) 54%)," +
    "radial-gradient(circle at 86% 78%, rgba(60, 126, 68, 0.22) 0, rgba(60, 126, 68, 0) 50%)",
  backgroundRepeat: "no-repeat",
  backgroundSize: "cover",
};

export default function Layout({
  children,
  companyName = process.env.NEXT_PUBLIC_APP_NAME || "IMS",
  unsubscribeUrl,
  supportEmail = process.env.SUPPORT_EMAIL || "support@example.com",
  preheader,
  footerNote = "Dbamy o Twoją prywatność.",
  year = new Date().getFullYear(),
}) {
  const finalUnsubscribeUrl =
    unsubscribeUrl || process.env.EMAIL_UNSUBSCRIBE_URL || "https://example.com/unsubscribe";

  return (
    <Html lang="pl">
      <Head>
        <Font
          fontFamily="Geist"
          fallbackFontFamily="Arial, sans-serif"
          webFont={{
            url: "https://cdn.jsdelivr.net/fontsource/fonts/geist@latest/geist-latin-400-normal.woff2",
            format: "woff2",
          }}
          fontWeight={400}
          fontStyle="normal"
        />
      </Head>

      <Body bgcolor={layoutBg} style={{ ...blobBackground, fontFamily: "Geist, Arial, sans-serif", margin: 0, padding: 0 }}>
        {/* Preheader is hidden but visible in email previews */}
        {preheader ? (
          <div style={{ display: "none", fontSize: 1, color: layoutBg, lineHeight: "1px", maxHeight: 0, maxWidth: 0, opacity: 0, overflow: "hidden" }}>
            {preheader}
          </div>
        ) : null}

        <Section style={{ padding: "24px 12px" }}>
          <Container
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              padding: "24px",
              maxWidth: "600px",
              margin: "0 auto",
              boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
            }}
          >
            {children}
            <Hr style={{ borderColor: "#E6EBF2", margin: "24px 0" }} />

            <Text style={{ fontSize: "12px", lineHeight: "18px", color: "#667085", margin: 0 }}>
              {footerNote} Administratorem danych jest <strong>{companyName}</strong>.
            </Text>

            <Text style={{ fontSize: "12px", lineHeight: "18px", color: "#667085", margin: "8px 0 0" }}>
              Aby zrezygnować z otrzymywania wiadomości,{" "}
              <Link href={finalUnsubscribeUrl} style={{ color: "#5ec269", textDecoration: "underline" }}>
                kliknij tutaj
              </Link>
              .
            </Text>

            <Text style={{ fontSize: "12px", lineHeight: "18px", color: "#667085", margin: "8px 0 0" }}>
              Kontakt:{" "}
              <Link href={`mailto:${supportEmail}`} style={{ color: "#5ec269", textDecoration: "underline" }}>
                {supportEmail}
              </Link>
              {" • "}
              © {year} {companyName}
            </Text>
          </Container>
        </Section>
      </Body>
    </Html>
  );
}

