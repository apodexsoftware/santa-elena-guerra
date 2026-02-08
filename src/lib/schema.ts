// lib/schema.ts
import { z } from "zod";

const MAX_FILE_SIZE = 5000000; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export const contactSchema = z.object({
  nombre: z.string().min(2, "El nombre es muy corto"),
  apellido: z.string().min(2, "El apellido es muy corto"),
  documento: z.string().min(5, "Documento requerido"),
  email: z.string().email("Correo inválido"),
  entidadSalud: z.string().min(1, "Selecciona una EPS"),
  diocesis: z.string().min(1, "Selecciona tu jurisdicción"),
  segmentacion: z.string().min(1, "Selecciona tu tipo de participación"),
  hospedaje: z.enum(["si", "no"], {
    error: "Selecciona si requieres hospedaje",
  }),
  imagen: z
    .any()
    .refine((files) => files?.length == 1, "El comprobante es obligatorio.")
    .refine((files) => files?.[0]?.size <= MAX_FILE_SIZE, `El archivo debe pesar menos de 5MB.`)
    .refine(
      (files) => ACCEPTED_IMAGE_TYPES.includes(files?.[0]?.type),
      "Solo se aceptan formatos .jpg, .jpeg, .png y .webp."
    ),
});

export type ContactFormData = z.infer<typeof contactSchema>;