function formatIssueDate(issueDate) {
  try {
    return new Date(issueDate).toLocaleDateString("pl-PL");
  } catch {
    return String(issueDate ?? "");
  }
}

export function getCertificateHtml({
  studentName,
  courseName,
  issueDate,
  certificateNumber,
}) {
  return `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Certyfikat ukończenia kursu</title>
  <style>
    @page { size: A4 landscape; margin: 0; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      width: 297mm;
      height: 210mm;
      font-family: "Inter", "Segoe UI", Arial, sans-serif;
      color: #0f172a;
      background: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .certificate {
      width: 277mm;
      height: 190mm;
      border: 2px solid #0f172a;
      background: #ffffff;
      padding: 22mm 20mm;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      gap: 12px;
    }
    .badge {
      letter-spacing: 0.18em;
      font-size: 13px;
      text-transform: uppercase;
      color: #475569;
      margin-bottom: 8px;
    }
    .title {
      font-size: 48px;
      font-weight: 700;
      margin: 0;
      line-height: 1.1;
    }
    .subtitle {
      font-size: 22px;
      color: #334155;
      margin: 0;
    }
    .student {
      font-size: 38px;
      font-weight: 600;
      margin: 4px 0;
    }
    .course {
      font-size: 28px;
      font-weight: 500;
      color: #111827;
      max-width: 85%;
      margin: 0;
    }
    .meta {
      margin-top: 20px;
      display: flex;
      gap: 36px;
      font-size: 15px;
      color: #334155;
    }
  </style>
</head>
<body>
  <main class="certificate">
    <p class="badge">Certificate of Completion</p>
    <h1 class="title">Certyfikat</h1>
    <p class="subtitle">Niniejszym potwierdza się, że</p>
    <p class="student">${studentName || "Uczestnik kursu"}</p>
    <p class="subtitle">ukończył(a) kurs</p>
    <p class="course">${courseName || "Nazwa kursu"}</p>
    <div class="meta">
      <span>Data wydania: ${formatIssueDate(issueDate)}</span>
      <span>Nr certyfikatu: ${certificateNumber || "-"}</span>
    </div>
  </main>
</body>
</html>`;
}
