"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import grapesjs from "grapesjs";
// Domyślny preset (używamy do ładowania stylów)
import grapesjsWebpage from "grapesjs-preset-webpage";
// Dodatkowe, zaawansowane wtyczki
import grapesjsTabs from "grapesjs-tabs";
import grapesjsCustomCode from "grapesjs-custom-code";
import grapesjsTyped from "grapesjs-typed";
import grapesjsTooltip from "grapesjs-tooltip";

import {
  checkLandingSlugAvailability,
  getLandingPageForEditor,
  saveLandingPage,
} from "@/app/actions/landingPageActions";
import { getCourses } from "@/app/actions/courseActions";
import { Button } from "@/components/ui/button";

export default function GrapesEditor({ landingId }) {
  const router = useRouter();
  const editorRef = useRef(null);
  const [editorInstance, setEditorInstance] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [slug, setSlug] = useState("moj-landing");
  const [title, setTitle] = useState("Nowa strona");
  const [isActive, setIsActive] = useState(false);
  const [slugStatus, setSlugStatus] = useState({ checking: false, ok: true, available: true });
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    if (!editorRef.current) {
      // Rozpakowujemy funkcje wtyczek, ignorując "opakowanie" .default przez Webpack
      const pWebpage = grapesjsWebpage.default || grapesjsWebpage;
      const pTabs = grapesjsTabs.default || grapesjsTabs;
      const pCustomCode = grapesjsCustomCode.default || grapesjsCustomCode;
      const pTyped = grapesjsTyped.default || grapesjsTyped;
      const pTooltip = grapesjsTooltip.default || grapesjsTooltip;

      (async () => {
        // Pobieramy kursy kreatora do traitów "Kup Teraz"
        const loadedCourses = await getCourses().catch(() => []);
        const coursesForTraits = Array.isArray(loadedCourses) ? loadedCourses : [];
        setCourses(coursesForTraits);

        const editor = grapesjs.init({
        container: "#gjs",
        height: "85vh",
        width: "100%",
        fromElement: false,
        storageManager: false,
        selectorManager: { componentFirst: true },
        
        // 1. Podajemy zaimportowane wtyczki
        plugins: [
          pWebpage,
          pTabs,
          pCustomCode,
          pTyped,
          pTooltip
        ],
        
        // 2. JAWNA KONFIGURACJA DLA EFEKTU "DEMOVILLE"
        // Konfiguracja Style Managera (prawa kolumna)
        styleManager: {
          sectors: [
            {
              name: "General",
              open: true,
              buildProps: ["float", "display", "position", "top", "right", "bottom", "left", "width", "height", "max-width", "min-height", "margin", "padding"],
            },
            {
              name: "Flex",
              open: false,
              buildProps: ["flex-direction", "flex-wrap", "justify-content", "align-items", "align-content", "order", "flex-basis", "flex-grow", "flex-shrink", "align-self"],
            },
            {
              name: "Typography",
              open: false,
              buildProps: ["font-family", "font-size", "font-weight", "letter-spacing", "color", "line-height", "text-align", "text-shadow"],
            },
            {
              name: "Decorations",
              open: false,
              buildProps: ["border-collapse", "border-spacing", "background-color", "border-radius", "border", "background", "box-shadow"],
            },
            {
              name: "Extra",
              open: false,
              buildProps: ["opacity", "transition", "transform", "z-index"],
            },
          ],
        },

        // Konfiguracja Opcji dla Wtyczek (aby jawniewstrzyknąć bloki i kategorie)
        pluginsOpts: {
          [pWebpage]: {
            // Jawnie włączamy potężne bloki Flexbox Columns
            blocksBasicOpts: { flexGrid: true },
            // Jawnie włączamy CAŁĄ kategorię Formularzy (Forms)
            formsOpts: true,
            // Navbar i countdown
            navbarOpts: true,
            countdownOpts: true,
          },
          // Dodatkowe wtyczki same wstrzykują bloki do kategorii "Extra"
          [pTabs]: {},
          [pCustomCode]: {},
          [pTyped]: {},
          [pTooltip]: {}
        },
      });

      editor.BlockManager.add("booking-widget", {
        label: "Widget rezerwacji",
        category: "Forms",
        attributes: { class: "fa fa-calendar" },
        content: `
          <section style="padding: 24px; background: #f8fafc; border-radius: 12px;">
            <h2 style="margin: 0 0 12px; font-size: 28px; color: #0f172a;">Umów rozmowę</h2>
            <p style="margin: 0 0 16px; color: #475569;">
              Sprawdź dostępne terminy i zarezerwuj spotkanie online.
            </p>
            <iframe
              src="/rezerwacja"
              title="Widget rezerwacji"
              style="width: 100%; min-height: 760px; border: 0; border-radius: 10px; background: #ffffff;"
              loading="lazy">
            </iframe>
          </section>
        `,
      });

      // =========================
      // Stripe "Kup Teraz" block
      // =========================
      editor.DomComponents.addType("stripe-checkout-button", {
        model: {
          defaults: {
            tagName: "a",
            classes: ["pzpp-checkout-btn"],
            attributes: {
              href: "/api/stripe/checkout?courseId=",
              "data-course-id": "",
            },
            content: "Kup teraz",
            traits: [
              {
                type: "select",
                name: "courseId",
                label: "Kurs",
                options: [{ id: "", name: "— wybierz kurs —" }].concat(
                  coursesForTraits.map((c) => ({ id: c.id, name: c.title }))
                ),
              },
              { type: "text", name: "buttonText", label: "Tekst przycisku" },
            ],
            script: function () {
              const courseId = this.getAttribute("data-course-id");
              const base = "/api/stripe/checkout?courseId=";
              this.setAttribute("href", `${base}${encodeURIComponent(courseId || "")}`);
            },
          },

          init() {
            const sync = () => {
              const courseId = this.get("courseId") || "";
              const text = this.get("buttonText");
              this.addAttributes({ "data-course-id": courseId });
              if (typeof text === "string" && text.trim().length) {
                this.components(text);
              }
            };
            this.on("change:courseId change:buttonText", sync);
            sync();
          },
        },
      });

      editor.BlockManager.add("stripe-checkout", {
        label: "Kup Teraz (Stripe)",
        category: "E-commerce",
        attributes: { class: "fa fa-shopping-cart" },
        content: `
          <a class="pzpp-checkout-btn" data-gjs-type="stripe-checkout-button" data-course-id="">
            Kup teraz
          </a>
          <style>
            .pzpp-checkout-btn{
              display:inline-flex;
              align-items:center;
              justify-content:center;
              gap:10px;
              padding:12px 18px;
              border-radius:999px;
              background:#0f172a;
              color:#fff;
              font-weight:700;
              text-decoration:none;
              cursor:pointer;
              transition:transform .08s ease, opacity .2s ease;
              max-width:100%;
            }
            .pzpp-checkout-btn:hover{ opacity:.92; }
            .pzpp-checkout-btn:active{ transform:scale(.98); }
          </style>
        `,
      });

      setEditorInstance(editor);
      editorRef.current = editor;

      // Opcjonalnie: Ustawiamy domyślny język UI na polski (jeśli GrapesJS go załaduje)
      // editor.I18n.setLocale('pl');
      })();
    }

    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, []);

  // Load landing by id (editor mode)
  useEffect(() => {
    if (!landingId) return;
    if (!editorInstance) return;

    (async () => {
      const res = await getLandingPageForEditor(landingId);
      if (!res?.success) {
        alert(res?.error || "Nie udało się pobrać strony.");
        router.push("/dashboard/pagebuilder");
        return;
      }

      const landing = res.landing;
      setTitle(landing.title || "Landing");
      setSlug(landing.slug || "landing");
      setIsActive(Boolean(landing.isActive));

      editorInstance.setComponents(landing.htmlData || "");
      editorInstance.setStyle(landing.cssData || "");
    })();
  }, [landingId, editorInstance, router]);

  // Debounced slug validation
  useEffect(() => {
    if (!landingId) return;
    const handle = setTimeout(async () => {
      setSlugStatus((s) => ({ ...s, checking: true }));
      const res = await checkLandingSlugAvailability(slug, landingId);
      if (!res?.ok) {
        setSlugStatus({ checking: false, ok: false, available: false, error: res?.error });
        return;
      }
      setSlugStatus({
        checking: false,
        ok: true,
        available: Boolean(res.available),
        normalized: res.normalized,
        error: res.error,
      });
    }, 350);
    return () => clearTimeout(handle);
  }, [slug, landingId]);

  const save = async ({ publish }) => {
    if (!editorInstance) return;
    setIsSaving(true);

    const htmlData = editorInstance.getHtml();
    const cssData = editorInstance.getCss();

    const result = await saveLandingPage({
      id: landingId,
      title,
      slug,
      htmlData,
      cssData,
      isActive: Boolean(publish),
    });

    if (result.success) {
      setIsActive(Boolean(result.page.isActive));
      setSlug(result.page.slug);
      setTitle(result.page.title);
      alert(`Zapisano. URL: ${window.location.origin}/${result.page.slug}`);
    } else {
      alert(result.error);
    }
    
    setIsSaving(false);
  };

  return (
    <div className="flex flex-col w-full border border-gray-300 rounded-lg overflow-hidden shadow-2xl bg-white min-h-[90vh]">
      {/* ⚠️ Workaround z Turn 13 - dociągamy style kreatora z ominięciem Next.js ⚠️ */}
      <link rel="stylesheet" href="https://unpkg.com/grapesjs/dist/css/grapes.min.css" />
      {/* FontAwesome dla piktogramów */}
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css" />
      
      {/* Branding GrapesJS pod dashboard */}
      <style>{`
        .gjs-one-bg{ background:#0b1220 !important; }
        .gjs-two-color{ color:#e2e8f0 !important; }
        .gjs-three-bg{ background:#111827 !important; }
        .gjs-four-color, .gjs-four-color-h:hover{ color:#ffffff !important; }
        .gjs-pn-panel{ border-color: rgba(148,163,184,.25) !important; }
        .gjs-block{ border-radius: 12px !important; }
        .gjs-block:hover{ border-color: rgba(59,130,246,.55) !important; }
        .gjs-title{ font-weight:700 !important; }
      `}</style>

      {/* Topbar systemowy */}
      <div className="bg-white p-3 flex flex-col gap-3 md:flex-row md:justify-between md:items-center z-50 relative border-b">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/pagebuilder")}>
            Powrót
          </Button>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-900 truncate">{title}</div>
            <div className="text-xs text-gray-500 truncate">
              {isActive ? "Publiczny" : "Szkic"} • URL: /{slug || "…"}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Slug</span>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="border rounded-md px-2 py-1 text-sm w-64 bg-white"
              placeholder="moj-super-landing"
            />
          </div>
          <div className="text-xs text-gray-500 md:ml-2">
            {slugStatus.checking
              ? "Sprawdzanie sluga…"
              : slugStatus.error
              ? slugStatus.error
              : landingId
              ? slugStatus.available
                ? "Slug dostępny"
                : "Slug zajęty"
              : null}
          </div>
          <div className="flex items-center gap-2 md:ml-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => editorInstance?.runCommand("preview")}
            >
              Podgląd
            </Button>
            <Button variant="secondary" size="sm" disabled={isSaving} onClick={() => save({ publish: false })}>
              Zapisz jako szkic
            </Button>
            <Button size="sm" disabled={isSaving} onClick={() => save({ publish: true })}>
              Publikuj
            </Button>
          </div>
        </div>
      </div>
      
      {/* Czysty kontener, w którym GrapesJS samodzielnie wybuduje swój pełny interfejs Demoville */}
      <div id="gjs" className="gjs-editor-cont">
        <div />
      </div>
    </div>
  );
}