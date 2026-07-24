import {
  socioRepository,
  type ActualizarSocioData,
  type CrearSocioData,
} from "@/lib/repositories/socioRepository";
import { NotFoundError, ValidationError } from "@/lib/errors/AppError";
import type { Socio } from "@/types";

export const socioService = {
  listar(): Socio[] {
    return socioRepository.findAll();
  },

  /** Lista todos, o filtra por DNI/nombre/apellido si hay término de búsqueda. */
  buscar(termino: string): Socio[] {
    const limpio = termino.trim();
    return limpio ? socioRepository.buscar(limpio) : socioRepository.findAll();
  },

  obtener(id: number): Socio {
    const socio = socioRepository.findById(id);
    if (!socio) throw new NotFoundError("El socio no existe");
    return socio;
  },

  crear(data: CrearSocioData): Socio {
    if (socioRepository.findByDni(data.dni)) {
      throw new ValidationError(`Ya existe un socio con el DNI ${data.dni}`);
    }
    return socioRepository.create(data);
  },

  actualizar(id: number, data: ActualizarSocioData): Socio {
    this.obtener(id); // valida existencia
    const actualizado = socioRepository.update(id, data);
    if (!actualizado) throw new NotFoundError("El socio no existe");
    return actualizado;
  },

  eliminar(id: number): void {
    this.obtener(id); // valida existencia
    socioRepository.delete(id);
  },
};
