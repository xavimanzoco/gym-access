import { planRepository } from "@/lib/repositories/planRepository";
import type { Plan } from "@/types";

export const planService = {
  listar(): Plan[] {
    return planRepository.findAll();
  },

  listarActivos(): Plan[] {
    return planRepository.findActivos();
  },
};
