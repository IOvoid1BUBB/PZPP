import { getCertificateHtml } from "@/lib/templates/certificateTemplate";

export async function sendCertificateEmail({
  to,
  studentName,
  courseName,
  issueDate,
  certificateNumber,
}) {
  const subject = `Gratulacje! Otrzymujesz certyfikat za kurs: ${courseName}`;
  const html = `
    <div style="font-family: Inter, Arial, sans-serif; color: #0f172a; line-height: 1.55;">
      <h2 style="margin: 0 0 12px;">Gratulacje, ${studentName || "Kursancie"}!</h2>
      <p style="margin: 0 0 10px;">
        Ukończyłeś(aś) kurs <strong>${courseName}</strong>. Twój certyfikat jest gotowy.
      </p>
      <p style="margin: 0 0 6px;">Numer certyfikatu: <strong>${certificateNumber}</strong></p>
      <p style="margin: 0;">Data wystawienia: <strong>${new Date(issueDate).toLocaleDateString("pl-PL")}</strong></p>
    </div>
  `;

  // Mock wysyłki maila (np. do podmiany na transporter w środowisku produkcyjnym).
  console.info("sendCertificateEmail:mock", {
    to,
    subject,
    previewLength: html.length,
    certificateNumber,
  });

  return {
    success: true,
    to,
    subject,
    html,
    certificateHtml: getCertificateHtml({
      studentName,
      courseName,
      issueDate,
      certificateNumber,
    }),
  };
}
