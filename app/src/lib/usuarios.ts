import type { Rol } from "@prisma/client";
import { z } from "zod";
import { evaluarContrasena } from "./politica-contrasena";

/**
 * Reglas comunes al alta de usuarios. El administrador crea docentes y cada
 * docente crea a sus estudiantes, así que la validación es la misma y solo
 * cambia el rol resultante.
 */

export const usuarioSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(3, "Escribe el nombre completo.")
    .max(80, "El nombre es demasiado largo."),
  usuario: z
    .string()
    .trim()
    .toLowerCase()
    .min(4, "El usuario debe tener al menos 4 caracteres.")
    .max(40, "El usuario es demasiado largo.")
    .regex(
      /^[a-z0-9._-]+$/,
      "El usuario solo admite letras, números, punto, guion y guion bajo."
    ),
  contrasena: z.string(),
  subpoblacion: z.string().trim().max(60).optional(),
});

export type DatosUsuario = z.infer<typeof usuarioSchema>;

/** Iniciales para el avatar, a partir del nombre. */
export function calcularIniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "??";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export const SUBPOBLACIONES = [
  "Víctimas directas",
  "Población desplazada",
  "Retornados",
  "Sin vínculo directo",
];

export const ETIQUETA_ROL_PLURAL: Record<Rol, string> = {
  ESTUDIANTE: "estudiantes",
  DOCENTE: "docentes",
  ADMIN: "administradores",
};

/**
 * Valida los datos del formulario y la política de contraseñas a la vez.
 * Devuelve el primer error legible, o los datos ya normalizados.
 */
export function validarAltaUsuario(entrada: unknown):
  | { error: string }
  | { datos: DatosUsuario & { iniciales: string; email: string } } {
  const parsed = usuarioSchema.safeParse(entrada);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { nombre, usuario, contrasena, subpoblacion } = parsed.data;

  const revision = evaluarContrasena(contrasena, [nombre, usuario]);
  if (!revision.valida) return { error: revision.errores[0] };

  return {
    datos: {
      nombre,
      usuario,
      contrasena,
      subpoblacion,
      iniciales: calcularIniciales(nombre),
      email: `${usuario}@memoriaelsalado.edu.co`,
    },
  };
}
