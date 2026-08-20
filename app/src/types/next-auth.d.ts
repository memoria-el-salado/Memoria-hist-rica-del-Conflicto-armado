import type { Rol } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    rol: Rol;
    iniciales: string;
    usuario: string;
    /** La cuenta sigue con la contraseña provisional que entregó quien la creó. */
    debeCambiar: boolean;
  }

  interface Session {
    user: {
      id: string;
      rol: Rol;
      iniciales: string;
      usuario: string;
      debeCambiar: boolean;
    } & DefaultSession["user"];
  }
}
