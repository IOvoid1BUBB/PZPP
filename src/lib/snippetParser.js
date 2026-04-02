/**
 * Zamienia placeholdery w tekście na dane z obiektu.
 * @param {string} text - Treść z tagami, np. "Witaj {{name}}"
 * @param {Object} data - Obiekt z danymi, np. { name: "Jan" }
 */
export function parseSnippets(text, data) {
  if (!text) return "";
  
  // Szuka wszystkich wystąpień {{klucz}} i zamienia na wartość z obiektu data
  return text.replace(/\{\{(.*?)\}\}/g, (match, key) => {
    const value = data[key.trim()];
    return value !== undefined ? value : match;
  });
}