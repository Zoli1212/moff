'use client'

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import * as z from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { exportProposalToExcelAsBase64 } from "./excel-export";
import { Proposal } from "@/types/proposal";

const fileSchema = z.object({
  filename: z.string(),
  content: z.any(), // zod doesn't work well with instanceof(File) or FileList
});

const formSchema = z.object({
  email: z.string().min(2).max(50),
  attachments: z.array(fileSchema).optional(),
})

export default function EmailSender({ email, proposal }: { email: string, proposal: Proposal }) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: email,
      attachments: undefined,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    let attachments = values.attachments;

    if (!attachments || attachments.length === 0) {
      const excelBase64 = exportProposalToExcelAsBase64(proposal);
      attachments = [{
        filename: "ajanlat-koltsegvetes.xlsx",
        content: excelBase64,
      }];
    }

    const response = await fetch('/api/send', {
      method: 'POST',
      body: JSON.stringify({
        email: values.email,
        attachments,
      }),
    });

    if (response.ok) {
      toast.success("Email sikeresen elküldve!");
    } else {
      toast.error("Hiba történt az email küldésekor!");
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
        <div className="flex flex-row gap-2 items-end">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Ügyfél email cím</FormLabel>
                <FormControl>
                  <Input placeholder="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="attachments"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Csatolmány</FormLabel>
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
          <Button type="submit" className="h-10">Elküld</Button>
        </div>
      </form>
    </Form>
  );
}
