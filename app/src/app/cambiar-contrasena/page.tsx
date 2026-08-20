import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { INICIO_POR_ROL } from "@/lib/navegacion";
import { FormularioCambio } from "./formulario-cambio";

export const metadata = { title: "Cambiar contraseña · Memoria El Salado" };

export default async function CambiarContrasenaPage() {
  const sesion = await auth();
  if (!sesion?.user) redirect("/login");

  const usuario = await prisma.user.findUnique({
    where: { id: sesion.user.id },
    select: { nombre: true, usuario: true, rol: true, debeCambiarContrasena: true },
  });
  if (!usuario) redirect("/login");

  return (
    <FormularioCambio
      nombre={usuario.nombre}
      usuario={usuario.usuario}
      primeraVez={usuario.debeCambiarContrasena}
      volverA={INICIO_POR_ROL[usuario.rol]}
    />
  );
}
