"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import {
  ETIQUETAS_FUERZA,
  LONGITUD_MINIMA,
  evaluarContrasena,
} from "@/lib/politica-contrasena";
import { cambiarContrasena } from "./actions";

const COLORES_FUERZA = ["#C0392B", "#C0392B", "#EBB035", "#1B8A8A", "#177575"];

type Props = {
  nombre: string;
  usuario: string;
  /** Todavía usa la contraseña provisional: no puede saltarse esta pantalla. */
  primeraVez: boolean;
  volverA: string;
};

export function FormularioCambio({ nombre, usuario, primeraVez, volverA }: Props) {
  const [nueva, setNueva] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [visible, setVisible] = useState(false);
  const [estado, accion, pendiente] = useActionState(
    cambiarContrasena,
    null as { error?: string } | undefined | null
  );

  const revision = evaluarContrasena(nueva, [nombre, usuario]);
  const coincide = confirmacion.length > 0 && confirmacion === nueva;
  const listo = revision.valida && coincide;

  const clase =
    "mt-1.5 w-full rounded-lg border border-borde-campo bg-superficie-suave px-[13px] py-[11px] text-[14px]";

  return (
    <div className="flex min-h-screen items-center justify-center bg-fondo px-5 py-10">
      <div className="w-full max-w-[480px] rounded-[14px] border border-borde bg-superficie px-8 py-9 shadow-[0_18px_50px_rgba(70,45,30,.07)]">
        <div className="flex items-center gap-[7px] text-[10.5px] font-bold tracking-[.14em] text-primario">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          <span>{primeraVez ? "PRIMER INGRESO" : "SEGURIDAD DE LA CUENTA"}</span>
        </div>

        <h1 className="mb-1.5 mt-3 text-[24px] font-extrabold tracking-[-.02em]">
          {primeraVez ? "Elige tu contraseña" : "Cambiar contraseña"}
        </h1>
        <p className="mb-5 text-[13px] leading-[1.65] text-apagado">
          {primeraVez ? (
            <>
              Hola, {nombre.split(" ")[0]}. Entraste con la contraseña provisional que te
              entregaron. Elige ahora una que solo tú conozcas: es la que usarás de aquí en
              adelante.
            </>
          ) : (
            <>Confirma la contraseña que usas hoy y define la nueva.</>
          )}
        </p>

        <form action={accion}>
          <label htmlFor="actual" className="block text-[10px] font-bold tracking-[.12em] text-tenue">
            {primeraVez ? "CONTRASEÑA PROVISIONAL" : "CONTRASEÑA ACTUAL"}
          </label>
          <input
            id="actual"
            name="actual"
            type="password"
            autoComplete="current-password"
            className={clase}
          />

          <div className="mt-4 flex items-baseline justify-between">
            <label htmlFor="nueva" className="text-[10px] font-bold tracking-[.12em] text-tenue">
              NUEVA CONTRASEÑA
            </label>
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              className="cursor-pointer text-[11px] font-semibold text-apagado hover:text-primario"
            >
              {visible ? "Ocultar" : "Mostrar"}
            </button>
          </div>
          <input
            id="nueva"
            name="nueva"
            type={visible ? "text" : "password"}
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            autoComplete="new-password"
            className={clase}
          />

          {nueva.length > 0 ? (
            <div className="mt-2">
              <div className="flex items-center gap-2">
                <div className="flex h-1.5 flex-1 gap-1">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-full flex-1 rounded-full"
                      style={{
                        background:
                          i < revision.fuerza ? COLORES_FUERZA[revision.fuerza] : "#F0EAE4",
                      }}
                    />
                  ))}
                </div>
                <span
                  className="text-[10.5px] font-bold"
                  style={{ color: COLORES_FUERZA[revision.fuerza] }}
                >
                  {ETIQUETAS_FUERZA[revision.fuerza]}
                </span>
              </div>

              {revision.errores.length > 0 ? (
                <ul className="mt-2 grid gap-1">
                  {revision.errores.map((e) => (
                    <li key={e} className="text-[11px] leading-[1.4] text-peligro">
                      · {e}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-[11px] font-semibold text-secundario-fuerte">
                  La contraseña cumple la política de seguridad.
                </p>
              )}
            </div>
          ) : (
            <p className="mt-2 text-[11px] leading-[1.5] text-suave">
              Mínimo {LONGITUD_MINIMA} caracteres, con mayúscula, minúscula, número y símbolo. Sin
              secuencias, ni tu nombre o tu usuario.
            </p>
          )}

          <label
            htmlFor="confirmacion"
            className="mt-4 block text-[10px] font-bold tracking-[.12em] text-tenue"
          >
            REPITE LA NUEVA CONTRASEÑA
          </label>
          <input
            id="confirmacion"
            name="confirmacion"
            type={visible ? "text" : "password"}
            value={confirmacion}
            onChange={(e) => setConfirmacion(e.target.value)}
            autoComplete="new-password"
            className={clase}
          />
          {confirmacion.length > 0 && !coincide && (
            <p className="mt-1.5 text-[11px] font-semibold text-peligro">
              Las dos contraseñas no coinciden.
            </p>
          )}

          {estado?.error && (
            <div role="alert" className="mt-3 text-[11.5px] font-semibold text-peligro">
              {estado.error}
            </div>
          )}

          <button
            type="submit"
            disabled={pendiente || !listo}
            className="mt-5 w-full cursor-pointer rounded-lg bg-primario-fuerte px-4 py-[13px] text-[14px] font-bold text-white hover:bg-primario-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pendiente ? "Guardando..." : "Guardar y continuar"}
          </button>
        </form>

        <div className="mt-5 border-t border-[#F1EBE5] pt-4 text-center text-[11.5px] text-tenue">
          {primeraVez ? (
            <button
              onClick={() => signOut({ redirectTo: "/login" })}
              className="cursor-pointer font-semibold text-apagado hover:text-primario"
            >
              Salir sin cambiarla
            </button>
          ) : (
            <Link href={volverA} className="font-semibold text-apagado hover:text-primario">
              Volver sin cambiarla
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
