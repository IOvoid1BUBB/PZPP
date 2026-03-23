"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
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
  phone: z.string().min(9, { message: "Podaj poprawny numer telefonu." }),
  email: z.email({ message: "Nieprawidłowy format adresu e-mail." }),
});

type FormValues = z.infer<typeof formSchema>;

export default function OptInForm() {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      phone: "",
      email: "",
    },
  });

  const onSubmit = async (data: FormValues) => {
   // tu logika zapisu danych do backendu
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Zapisz się</h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 text-black">
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