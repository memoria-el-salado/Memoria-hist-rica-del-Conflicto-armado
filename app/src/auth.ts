import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";

const credencialesSchema = z.object({
  usuario: z.string().min(1),
  password: z.string().min(1),
  rol: z.enum(["ESTUDIANTE", "DOCENTE", "ADMIN"]),
});

export const { handlers, signIn, signOut, auth, unstable_update } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { usuario: {}, password: {}, rol: {} },
      async authorize(raw) {
        const parsed = credencialesSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { usuario, password, rol } = parsed.data;
        const user = await prisma.user.findFirst({
          where: { OR: [{ usuario }, { email: usuario }] },
        });
        if (!user) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        // El rol elegido en el login debe coincidir con el rol real del usuario.
        if (user.rol !== rol) return null;

        return {
          id: user.id,
          name: user.nombre,
          email: user.email,
          rol: user.rol,
          iniciales: user.iniciales,
          usuario: user.usuario,
          debeCambiar: user.debeCambiarContrasena,
        };
      },
    }),
  ],
});
