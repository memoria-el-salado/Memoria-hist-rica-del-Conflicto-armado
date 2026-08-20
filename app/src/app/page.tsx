import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { INICIO_POR_ROL } from "@/lib/navegacion";

export default async function Home() {
  const sesion = await auth();
  redirect(sesion?.user ? INICIO_POR_ROL[sesion.user.rol] : "/login");
}
