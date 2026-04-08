"use client";

import { useRef } from "react";
import { createLead } from "@/app/actions/leadActions";

export default function LeadForm() {
  const formRef = useRef(null);

  async function handleSubmit(formData) {
    const result = await createLead(formData);
    if (result.success) {
      alert("Lead zapisany bezpiecznie w bazie!");
      formRef.current.reset();
    } else {
      alert(result.error);
    }
  }

  return (
    <form ref={formRef} action={handleSubmit} className="flex flex-col gap-3 max-w-sm p-4 border rounded shadow-sm">
      <h3 className="font-bold">Dodaj Leada</h3>
      <input name="firstName" placeholder="Imię *" required className="border p-2 rounded" />
      <input name="lastName" placeholder="Nazwisko" className="border p-2 rounded" />
      <input name="email" type="email" placeholder="E-mail *" required className="border p-2 rounded" />
      <input name="phone" placeholder="Telefon" className="border p-2 rounded" />
      <button type="submit" className="bg-blue-600 text-white font-bold p-2 rounded hover:bg-blue-700">
        Wyślij
      </button>
    </form>
  );
}