// page.tsx
"use client"

import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import * as z from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const fileSchema = z.object({
  filename: z.string(),
  content: z.any(), // zod doesn't works well with instanceof(File) or FileList
});

const formSchema = z.object({
  email: z.string().min(2).max(50),
  attachments: z.array(fileSchema),
})

export default function EmailSender() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      attachments: undefined,

    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const response = await fetch('/api/send', {
      method: 'POST',
      body: JSON.stringify({
        email: values.email,
        attachments: values.attachments,

      }),
    });

    if (response.ok) {
      console.log("ok");
    } else {
      console.log("not ok");
    }
  }
  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ügyfél email</FormLabel>
                <FormControl>
                  <Input placeholder="email" {...field} />
                </FormControl>
                <FormDescription>
                  Ügyfél email cím
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="attachments"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Attachments</FormLabel>
                <FormControl>
                  <Input
                    type="file"
                    multiple
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files) {
                        Promise.all(
                          Array.from(files).map(async (file) => ({
                            filename: file.name,
                            content: Buffer.from(await file.arrayBuffer()).toString('base64'),
                          }))
                        ).then((filesArray) => {
                          field.onChange(filesArray);
                        });
                      }
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit">Elküld</Button>
        </form>
      </Form>

    </>
  );
}