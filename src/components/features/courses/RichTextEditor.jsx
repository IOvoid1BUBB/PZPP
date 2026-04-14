"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function normalizeHtml(value) {
  if (!value) return "";
  return String(value);
}

function stripHtmlToText(html) {
  return String(html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Wpisz treść lekcji…",
  className,
}) {
  const editorRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);

  const htmlValue = useMemo(() => normalizeHtml(value), [value]);
  const isEmpty = useMemo(() => !stripHtmlToText(htmlValue), [htmlValue]);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    // Avoid resetting cursor when typing: only sync when DOM differs materially.
    if (el.innerHTML !== htmlValue) {
      el.innerHTML = htmlValue || "";
    }
  }, [htmlValue]);

  const exec = (command, arg) => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    try {
      document.execCommand(command, false, arg);
    } catch {
      // ignore
    }
    onChange?.(el.innerHTML);
  };

  const handleInput = () => {
    const el = editorRef.current;
    if (!el) return;
    onChange?.(el.innerHTML);
  };

  return (
    <div className={cn("rounded-lg border", className)}>
      <div className="flex flex-wrap items-center gap-2 border-b bg-muted/30 p-2">
        <Button type="button" variant="outline" size="sm" onClick={() => exec("bold")} className="h-8 px-2">
          B
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => exec("italic")} className="h-8 px-2 italic">
          I
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => exec("underline")} className="h-8 px-2 underline">
          U
        </Button>
        <span className="mx-1 h-6 w-px bg-border" />
        <Button type="button" variant="outline" size="sm" onClick={() => exec("insertUnorderedList")} className="h-8 px-2">
          • Lista
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => exec("insertOrderedList")} className="h-8 px-2">
          1. Lista
        </Button>
        <span className="mx-1 h-6 w-px bg-border" />
        <Button type="button" variant="outline" size="sm" onClick={() => exec("removeFormat")} className="h-8 px-2">
          Wyczyść
        </Button>
      </div>

      <div className="relative">
        {isEmpty && !isFocused ? (
          <div className="pointer-events-none absolute left-3 top-3 text-sm text-muted-foreground">
            {placeholder}
          </div>
        ) : null}
        <div
          ref={editorRef}
          className="min-h-[140px] p-3 text-sm leading-relaxed outline-none"
          contentEditable
          role="textbox"
          aria-multiline="true"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onInput={handleInput}
          onKeyUp={handleInput}
          suppressContentEditableWarning
        />
      </div>
    </div>
  );
}

