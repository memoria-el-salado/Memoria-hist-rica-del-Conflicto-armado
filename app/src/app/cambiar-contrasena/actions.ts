"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { auth, unstable_update } from "@/auth";
import { prisma } from "@/lib/prisma";
import { evaluarContrasena } from "@/lib/politica-contrasena";
import { INICIO_POR_ROL } from "@/lib/navegacion";

/**
 * La persona elige su propia contraseña.
 *
 * Se usa en dos momentos: obligatoriamente la primera vez que entra, para
 * sustituir la provisional que le entregaron, y después cuantas veces quiera.
 * En ambos casos hay que confirmar la contraseña vigente, de modo que una
 * sesión abierta y olvidada no baste para tomar la cuenta.
 */
export async function cambiarContrasena(_prev: unknown, formData: FormData) {
  const sesion = await auth();
  if (!sesion?.user) return { error: "Tu sesión expiró. Vuelve a entrar." };

  const actual = String(formData.get("actual") ?? "");
  const nueva = String(formData.get("nueva") ?? "");
  const confirmacion = String(formData.get("confirmacion") ?? "");

  const usuario = await prisma.user.findUnique({ where: { id: sesion.user.id } });
  if (!usuario) return { error: "No encontramos tu cuenta." };

  if (!(await bcrypt.compare(actual, usuario.passwordHash))) {
    return { error: "La contraseña actual no es correcta." };
  }

  const revision = evaluarContrasena(nueva, [usuario.nombre, usuario.usuario]);
  if (!revision.valida) return { error: revision.errores[0] };

  if (nueva !== confirmacion) {
    return { error: "La confirmación no coincide con la nueva contraseña." };
  }
  if (await bcrypt.compare(nueva, usuario.passwordHash)) {
    return { error: "La nueva contraseña debe ser distinta de la actual." };
  }

  await prisma.user.update({
    where: { id: usuario.id },
    data: {
      passwordHash: await bcrypt.hash(nueva, 10),
      debeCambiarContrasena: false,
      contrasenaCambiadaEn: new Date(),
    },
  });

  // El token guarda la marca, así que hay que refrescarlo o el proxy seguiría
  // devolviendo a esta misma pantalla.
  await unstable_update({ user: { debeCambiar: false } });

  redirect(INICIO_POR_ROL[usuario.rol]);
}
