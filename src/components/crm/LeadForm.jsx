"use client";

import { useRef, useState } from "react";
import { User, Mail, Phone, Tag } from "lucide-react";
import { createLead } from "@/app/actions/leadActions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DialogClose } from "@/components/ui/dialog";

export default function LeadForm() {
  const formRef = useRef(null);
  const [status, setStatus] = useState("NEW");

  async function handleSubmit(formData) {
    const result = await createLead(formData);
    if (result.success) {
      alert("Lead zapisany bezpiecznie w bazie!");
      formRef.current.reset();
      setStatus("NEW");
    } else {
      alert(result.error);
    }
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-6">
      <input type="hidden" name="status" value={status} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="firstName" className="inline-flex items-center gap-2">
            <User className="size-4 text-muted-foreground" />
            Imię *
          </Label>
          <Input
            id="firstName"
            name="firstName"
            placeholder="np. Jan"
            required
            className="focus-visible:ring-primary/70 focus-visible:ring-offset-2"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName" className="inline-flex items-center gap-2">
            <User className="size-4 text-muted-foreground" />
            Nazwisko
          </Label>
          <Input
            id="lastName"
            name="lastName"
            placeholder="np. Kowalski"
            className="focus-visible:ring-primary/70 focus-visible:ring-offset-2"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="inline-flex items-center gap-2">
            <Mail className="size-4 text-muted-foreground" />
            E-mail *
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="np. jan.kowalski@email.com"
            required
            className="focus-visible:ring-primary/70 focus-visible:ring-offset-2"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone" className="inline-flex items-center gap-2">
            <Phone className="size-4 text-muted-foreground" />
            Telefon
          </Label>
          <Input
            id="phone"
            name="phone"
            placeholder="+48 123 456 789"
            className="focus-visible:ring-primary/70 focus-visible:ring-offset-2"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="inline-flex items-center gap-2">
          <Tag className="size-4 text-muted-foreground" />
          Status leada
        </Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="focus-visible:ring-primary/70 focus-visible:ring-offset-2">
            <SelectValue placeholder="Wybierz status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NEW">Nowy</SelectItem>
            <SelectItem value="CONTACTED">W kontakcie</SelectItem>
            <SelectItem value="QUALIFIED">Zakwalifikowany</SelectItem>
            <SelectItem value="PROPOSAL">Propozycja</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
        <DialogClose asChild>
          <Button type="button" variant="outline" className="sm:w-auto">
            Anuluj
          </Button>
        </DialogClose>
        <Button type="submit" className="sm:w-auto">
          Zapisz
        </Button>
      </div>
    </form>
  );
}