"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";

import { actualizarSocio, crearSocio } from "@/lib/actions/socioActions";
import { socioSchema, type SocioInput } from "@/lib/validation/schemas";
import { ESTADOS_SOCIO, type Socio } from "@/lib/db/schema";
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

const SIN_PLAN = "0";

type PlanOpcion = { id: number; nombre: string };

interface Props {
  planes: PlanOpcion[];
  socio?: Socio;
  trigger: React.ReactElement;
}

export function SocioFormDialog({ planes, socio, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const editando = Boolean(socio);

  const form = useForm<z.input<typeof socioSchema>, unknown, SocioInput>({
    resolver: zodResolver(socioSchema),
    defaultValues: {
      dni: socio?.dni ?? "",
      nombre: socio?.nombre ?? "",
      apellido: socio?.apellido ?? "",
      telefono: socio?.telefono ?? "",
      email: socio?.email ?? "",
      planId: socio?.planId ?? null,
      estado: socio?.estado ?? "activo",
    },
  });

  async function onSubmit(values: SocioInput) {
    const res = editando
      ? await actualizarSocio(socio!.id, values)
      : await crearSocio(values);

    if (res.ok) {
      toast.success(editando ? "Socio actualizado" : "Socio creado");
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
          <DialogTitle>{editando ? "Editar socio" : "Nuevo socio"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nombre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="apellido"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Apellido</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="dni"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>DNI</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      inputMode="numeric"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="telefono"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="planId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan</FormLabel>
                    <Select
                      items={[
                        { value: SIN_PLAN, label: "Sin plan" },
                        ...planes.map((p) => ({
                          value: String(p.id),
                          label: p.nombre,
                        })),
                      ]}
                      value={field.value ? String(field.value) : SIN_PLAN}
                      onValueChange={(v) =>
                        field.onChange(v === SIN_PLAN ? null : Number(v))
                      }
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sin plan" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={SIN_PLAN}>Sin plan</SelectItem>
                        {planes.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="estado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ESTADOS_SOCIO.map((e) => (
                          <SelectItem key={e} value={e}>
                            {e}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={form.formState.isSubmitting}
            >
              {editando ? "Guardar cambios" : "Crear socio"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
