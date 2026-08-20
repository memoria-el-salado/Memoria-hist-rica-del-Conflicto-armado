import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";
import { INICIO_POR_ROL, PREFIJO_POR_ROL } from "@/lib/navegacion";

const { auth } = NextAuth(authConfig);

/** Única pantalla accesible mientras la contraseña siga siendo la provisional. */
const RUTA_CAMBIO = "/cambiar-contrasena";

export default auth((req) => {
  const { nextUrl } = req;
  const sesion = req.auth;
  const ruta = nextUrl.pathname;

  const esRutaProtegida =
    ruta === RUTA_CAMBIO || ["/estudiante", "/docente", "/admin"].some((p) => ruta.startsWith(p));

  if (!sesion?.user) {
    if (esRutaProtegida) {
      const url = new URL("/login", nextUrl);
      url.searchParams.set("redirigir", ruta);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Quien todavía usa la contraseña que le entregaron no llega a ninguna otra
  // parte de la plataforma hasta elegir la suya.
  if (sesion.user.debeCambiar) {
    return ruta === RUTA_CAMBIO
      ? NextResponse.next()
      : NextResponse.redirect(new URL(RUTA_CAMBIO, nextUrl));
  }

  const inicio = INICIO_POR_ROL[sesion.user.rol];

  // Un usuario autenticado no vuelve al login ni entra al área de otro rol.
  if (ruta === "/login" || ruta === "/") {
    return NextResponse.redirect(new URL(inicio, nextUrl));
  }

  if (
    ruta !== RUTA_CAMBIO &&
    esRutaProtegida &&
    !ruta.startsWith(PREFIJO_POR_ROL[sesion.user.rol])
  ) {
    return NextResponse.redirect(new URL(inicio, nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/",
    "/login",
    "/cambiar-contrasena",
    "/estudiante/:path*",
    "/docente/:path*",
    "/admin/:path*",
  ],
};
