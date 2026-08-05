"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";

import { registrarPago } from "@/lib/actions/pagoActions";
import { pagoSchema, type PagoInput } from "@/lib/validation/schemas";
import { METODOS_PAGO } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SocioOpcion = { id: number; nombre: string; apellido: string; dni: string };

interface Props {
  socios: SocioOpcion[];
  socioId?: number;
  trigger: React.ReactElement;
}

export function PagoFormDialog({ socios, socioId, trigger }: Props) {
  const [open, setOpen] = useState(false);

  const form = useForm<z.input<typeof pagoSchema>, unknown, PagoInput>({
    resolver: zodResolver(pagoSchema),
    defaultValues: {
      socioId: socioId ?? 0,
      monto: 0,
      metodo: "efectivo",
      diasCobertura: 30,
    },
  });

  async function onSubmit(values: PagoInput) {
    const res = await registrarPago(values);
    if (res.ok) {
      toast.success("Pago registrado");
      setOpen(false);
      form.reset({ socioId: socioId ?? 0, monto: 0, metodo: "efectivo", diasCobertura: 30 });
    } else {
      toast.error(res.error);
    }
  }

  const socioFijo = socios.find((s) => s.id === socioId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar pago</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="socioId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Socio</FormLabel>
                  {socioFijo ? (
                    <Input
                      disabled
                      value={`${socioFijo.apellido}, ${socioFijo.nombre} (${socioFijo.dni})`}
                    />
                  ) : (
                    <Select
                      items={socios.map((s) => ({
                        value: String(s.id),
                        label: `${s.apellido}, ${s.nombre} (${s.dni})`,
                      }))}
                      value={field.value ? String(field.value) : ""}
                      onValueChange={(v) => field.onChange(Number(v))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Elegí un socio" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {socios.map((s) => (
                          <SelectItem key={s.id} value={String(s.id)}>
                            {s.apellido}, {s.nombre} ({s.dni})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="monto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="1"
                        value={field.value}
                        onChange={(e) =>
                          field.onChange(e.target.valueAsNumber)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="diasCobertura"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Días que cubre</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="1"
                        value={field.value}
                        onChange={(e) =>
                          field.onChange(e.target.valueAsNumber)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="metodo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Método</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {METODOS_PAGO.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full"
              disabled={form.formState.isSubmitting}
            >
              Registrar pago
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
