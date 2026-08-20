import type { NextAuthConfig } from "next-auth";
import type { Rol } from "@prisma/client";

/**
 * Configuración compartida sin acceso a base de datos, para que el proxy
 * (que corre en Edge) pueda leer la sesión sin cargar Prisma.
 */
export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.rol = user.rol;
        token.iniciales = user.iniciales;
        token.usuario = user.usuario;
        token.debeCambiar = user.debeCambiar;
      }
      // Al elegir su propia contraseña, la persona deja de estar obligada a
      // cambiarla; sin esto el token seguiría mandándola a la misma pantalla.
      if (trigger === "update" && session?.user?.debeCambiar === false) {
        token.debeCambiar = false;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub!;
      session.user.rol = token.rol as Rol;
      session.user.iniciales = token.iniciales as string;
      session.user.usuario = token.usuario as string;
      session.user.debeCambiar = token.debeCambiar === true;
      return session;
    },
  },
} satisfies NextAuthConfig;
