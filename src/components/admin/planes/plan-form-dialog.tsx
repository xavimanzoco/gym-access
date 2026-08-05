"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";

import { actualizarPlan, crearPlan } from "@/lib/actions/planActions";
import { planSchema, type PlanInput } from "@/lib/validation/schemas";
import { type Plan } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
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

const DIAS = [
  { n: 1, label: "Lun" },
  { n: 2, label: "Mar" },
  { n: 3, label: "Mié" },
  { n: 4, label: "Jue" },
  { n: 5, label: "Vie" },
  { n: 6, label: "Sáb" },
  { n: 7, label: "Dom" },
];

interface Props {
  plan?: Plan;
  trigger: React.ReactElement;
}

export function PlanFormDialog({ plan, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const editando = Boolean(plan);

  const form = useForm<z.input<typeof planSchema>, unknown, PlanInput>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      nombre: plan?.nombre ?? "",
      precio: plan?.precio ?? 0,
      diasAcceso: plan?.diasAcceso ?? [1, 2, 3, 4, 5, 6, 7],
      horaDesde: plan?.horaDesde ?? null,
      horaHasta: plan?.horaHasta ?? null,
      activo: plan?.activo ?? true,
    },
  });

  async function onSubmit(values: PlanInput) {
    const res = editando
      ? await actualizarPlan(plan!.id, values)
      : await crearPlan(values);
    if (res.ok) {
      toast.success(editando ? "Plan actualizado" : "Plan creado");
      setOpen(false);
      if (!editando) form.reset();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editando ? "Editar plan" : "Nuevo plan"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="precio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio mensual</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="1"
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="diasAcceso"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Días habilitados</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {DIAS.map(({ n, label }) => {
                      const activo = field.value?.includes(n);
                      return (
                        <button
                          key={n}
                          type="button"
                          onClick={() =>
                            field.onChange(
                              activo
                                ? field.value.filter((d) => d !== n)
                                : [...field.value, n]
                            )
                          }
                          className={cn(
                            "h-9 w-12 rounded-md border text-sm transition-colors",
                            activo
                              ? "border-primary bg-primary text-primary-foreground"
                              : "bg-background hover:bg-accent"
                          )}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="horaDesde"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora desde</FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="horaHasta"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora hasta</FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="activo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado</FormLabel>
                  <Select
                    value={field.value ? "si" : "no"}
                    onValueChange={(v) => field.onChange(v === "si")}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="si">Activo</SelectItem>
                      <SelectItem value="no">Inactivo</SelectItem>
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
              {editando ? "Guardar cambios" : "Crear plan"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
