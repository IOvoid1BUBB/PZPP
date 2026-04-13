// src/lib/scoring.js

// Tabela punktacji (możesz tu w przyszłości łatwo zmieniać wagi)
export const SCORING_RULES = {
  DOWNLOAD_EBOOK: 10,
  PRICING_VISIT: 25,
  EMAIL_OPEN: 5,
  EMAIL_CLICK: 15,
  MEETING_SCHEDULED: 50,
  MEETING_NOSHOW: -30,
  MANUAL_BONUS: 20,
  SMS_SENT: 10, // Np. gdy handlowiec ręcznie podbija ocenę po dobrym telefonie
};

// Funkcja pomocnicza: Klasyfikuje leada na podstawie jego punktów
export function getLeadTemperature(score) {
  if (score >= 71) return 'HOT';   // Gorący (gotowy na sprzedaż)
  if (score >= 31) return 'WARM';  // Ciepły (wymaga dalszego marketingu)
  return 'COLD';                   // Zimny (dopiero poznaje markę)
}