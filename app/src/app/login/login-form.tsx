"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

const ROLES = [
  {
    valor: "ESTUDIANTE" as const,
    label: "Estudiante",
    icon: "M22 10 12 5 2 10l10 5 10-5zM6 12v5c3 2 9 2 12 0v-5",
    ayuda: "Tu docente te entrega el usuario y la contraseña.",
  },
  {
    valor: "DOCENTE" as const,
    label: "Docente",
    icon: "M3 3h18v13H3zM8 21h8M12 16v5",
    ayuda: "La administración de la plataforma crea tu cuenta.",
  },
  {
    valor: "ADMIN" as const,
    label: "Administrador",
    icon: "M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5z",
    ayuda: "Cuenta creada durante la instalación de la plataforma.",
  },
];

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [rol, setRol] = useState<(typeof ROLES)[number]["valor"] | null>(null);
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  function elegirRol(r: (typeof ROLES)[number]) {
    setRol(r.valor);
    setError("");
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!rol) return setError("Selecciona un rol para continuar.");
    if (!usuario.trim() || !password.trim()) return setError("Ingresa usuario y contraseña.");

    setCargando(true);
    setError("");
    const res = await signIn("credentials", {
      usuario: usuario.trim(),
      password,
      rol,
      redirect: false,
    });
    setCargando(false);

    if (res?.error) {
      setError("Credenciales incorrectas o el rol no corresponde a este usuario.");
      return;
    }
    router.push(params.get("redirigir") ?? "/");
    router.refresh();
  }

  return (
    <form onSubmit={enviar}>
      <div className="mb-[7px] text-[10px] font-bold tracking-[.12em] text-tenue">SELECCIONA TU ROL</div>
      <div className="mb-[18px] grid grid-cols-3 gap-2">
        {ROLES.map((r) => {
          const activo = rol === r.valor;
          return (
            <button
              type="button"
              key={r.valor}
              onClick={() => elegirRol(r)}
              aria-pressed={activo}
              className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-[9px] border px-1.5 py-3 transition-colors ${
                activo
                  ? "border-primario bg-primario-tinte text-primario-fuerte"
                  : "border-borde-campo bg-superficie text-[#7C736C] hover:border-primario/40"
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d={r.icon} />
              </svg>
              <span className="text-[11.5px] font-bold">{r.label}</span>
            </button>
          );
        })}
      </div>

      {rol && (
        <p className="mb-3 rounded-lg border border-secundario-borde bg-secundario-tinte px-3 py-2 text-[11.5px] leading-[1.5] text-[#3F6E6C]">
          {ROLES.find((r) => r.valor === rol)!.ayuda}
        </p>
      )}

      <label htmlFor="usuario" className="mb-[7px] block text-[10px] font-bold tracking-[.12em] text-tenue">
        USUARIO O CORREO ELECTRÓNICO
      </label>
      <input
        id="usuario"
        value={usuario}
        onChange={(e) => setUsuario(e.target.value)}
        placeholder="tu usuario"
        autoComplete="username"
        className="mb-3.5 w-full rounded-lg border border-borde-campo bg-superficie-suave px-[13px] py-[11px] text-[14px]"
      />

      <label htmlFor="password" className="mb-1.5 block text-[10px] font-bold tracking-[.12em] text-tenue">
        CONTRASEÑA
      </label>
      <input
        id="password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
        autoComplete="current-password"
        className="mb-1.5 w-full rounded-lg border border-borde-campo bg-superficie-suave px-[13px] py-[11px] text-[14px]"
      />
      <p className="mb-2 text-[11px] leading-[1.5] text-suave">
        Si es tu primera entrada, usa la contraseña provisional que te entregaron: la plataforma te
        pedirá cambiarla enseguida. Si la olvidaste, quien creó tu cuenta puede emitirte otra.
      </p>

      {error && (
        <div role="alert" className="text-[11.5px] font-semibold text-peligro">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={cargando}
        className="mt-3 flex w-full cursor-pointer items-center justify-center gap-[9px] rounded-lg bg-primario-fuerte px-4 py-[13px] text-[14px] font-bold text-white transition-colors hover:bg-primario-hover disabled:opacity-60"
      >
        <span>{cargando ? "Entrando..." : "Entrar a la Plataforma"}</span>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </button>

      <div className="my-5 flex items-center gap-3 text-[10px] font-bold tracking-[.12em] text-[#B3AAA2]">
        <div className="h-px flex-1 bg-borde" />
        <span>O CONTINÚA CON</span>
        <div className="h-px flex-1 bg-borde" />
      </div>

      <button
        type="button"
        onClick={() => setError("Las credenciales educativas se habilitan en el despliegue institucional.")}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-secundario bg-transparent px-4 py-3 text-[13px] font-bold text-secundario-fuerte transition-colors hover:bg-secundario/[.06]"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 10 12 5 2 10l10 5 10-5zM6 12v5c3 2 9 2 12 0v-5" />
        </svg>
        <span>Credenciales Educativas</span>
      </button>
    </form>
  );
}
