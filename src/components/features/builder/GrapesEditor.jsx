"use client";

import React, { useEffect, useRef, useState } from "react";
import grapesjs from "grapesjs";
//import "grapesjs/dist/css/grapes.min.css"; // Główne style edytora
import grapesjsWebpage from "grapesjs-preset-webpage"; // Gotowe bloki (drag & drop)
import { saveLandingPage } from "src/app/actions/landingPageActions";

export default function GrapesEditor() {
  const editorRef = useRef(null);
  const [editorInstance, setEditorInstance] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Inicjalizacja GrapesJS tylko po stronie klienta (w przeglądarce)
    if (!editorRef.current) {
      const editor = grapesjs.init({
        container: "#gjs", // ID diva, w którym ma się wyrenderować edytor
        height: "85vh",
        width: "100%",
        storageManager: false, // Wyłączamy local storage, bo zapisujemy do bazy PostgreSQL
        plugins: [grapesjsWebpage],
        pluginsOpts: {
          [grapesjsWebpage]: {
            // Konfiguracja bloków
            blocksBasicOpts: { flexGrid: true },
          },
        },
      });

      setEditorInstance(editor);
      editorRef.current = editor;
    }

    // Czyszczenie instancji przy odmontowaniu komponentu
    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, []);

  // Funkcja wyciągająca HTML i CSS z edytora i wysyłająca do naszej Server Action
  const handleSave = async () => {
    if (!editorInstance) return;
    setIsSaving(true);

    const htmlData = editorInstance.getHtml();
    const cssData = editorInstance.getCss();

    // W domyślnej wersji generujemy losowy slug, ale docelowo możecie tu dodać inputy dla użytkownika
    const result = await saveLandingPage({
      title: "Moja nowa strona z buildera",
      slug: `promo-${Math.floor(Math.random() * 10000)}`,
      htmlData,
      cssData,
    });

    if (result.success) {
      alert("Strona została pomyślnie zapisana w bazie!");
    } else {
      alert(result.error);
    }
    
    setIsSaving(false);
  };

  return (
    <div className="flex flex-col w-full border border-gray-300 rounded-lg overflow-hidden shadow-lg">
      
      {/* pobiera style bezpośrednio omijając kompilator Next.js */}
      <link rel="stylesheet" href="https://unpkg.com/grapesjs/dist/css/grapes.min.css" />
      
      <div className="bg-gray-800 p-3 flex justify-between items-center text-white">
        <h2 className="font-bold">Kreator Landing Page (GrapesJS)</h2>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded font-bold transition disabled:opacity-50"
        >
          {isSaving ? "Zapisywanie..." : "💾 Zapisz Stronę"}
        </button>
      </div>
      
      {/* Tutaj GrapesJS "wstrzyknie" swój interfejs drag&drop */}
      <div id="gjs">
        <h1>Witaj w kreatorze!</h1>
        <p>Przeciągnij elementy z prawego paska, aby zbudować swoją stronę.</p>
      </div>
    </div>
  );
}