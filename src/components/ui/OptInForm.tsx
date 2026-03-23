"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { createLead } from "@/app/actions/leadActions";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const formSchema = z.object({
  name: z.string().min(2, { message: "Imię musi mieć co najmniej 2 znaki." }),
  lastName: z.string().min(2, { message: "Nazwisko musi mieć co najmniej 2 znaki." }),
  phone: z.string().min(9, { message: "Podaj poprawny numer telefonu." }),
  email: z.string().email({ message: "Nieprawidłowy format adresu e-mail." }),
});

type FormValues = z.infer<typeof formSchema>;

export default function OptInForm() {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      lastName: "",
      phone: "",
      email: "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      const formData = new FormData();
      formData.append("firstName", data.name);
      formData.append("lastName", data.lastName);
      formData.append("email", data.email);
      formData.append("phone", data.phone);

      const result = await createLead(formData);

      if (result.success) {
        alert("Sukces! Lead został zapisany.");
        form.reset();
      } else {
        alert(`Błąd: ${result.error}`);
      }
    } catch (error) {
      console.error("Błąd podczas wysyłania:", error);
      alert("Wystąpił nieoczekiwany błąd połączenia.");
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md text-black">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Zapisz się</h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700">Imię</FormLabel>
                <FormControl>
                  <Input placeholder="Twoje imię" {...field} />
                </FormControl>
                <FormMessage className="text-red-500 text-xs" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700">Nazwisko</FormLabel>
                <FormControl>
                  <Input placeholder="Twoje nazwisko" {...field} />
                </FormControl>
                <FormMessage className="text-red-500 text-xs" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700">Telefon</FormLabel>
                <FormControl>
                  <Input placeholder="Twój numer telefonu" {...field} />
                </FormControl>
                <FormMessage className="text-red-500 text-xs" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700">E-mail</FormLabel>
                <FormControl>
                  <Input placeholder="Twój adres e-mail" {...field} />
                </FormControl>
                <FormMessage className="text-red-500 text-xs" />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full mt-2">
            Wyślij
          </Button>
        </form>
      </Form>
    </div>
  );
}