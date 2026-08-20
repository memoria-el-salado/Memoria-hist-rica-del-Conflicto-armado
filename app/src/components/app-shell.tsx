"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { Rol } from "@prisma/client";
import { ETIQUETA_ROL, NAV_POR_ROL, tituloDeRuta } from "@/lib/navegacion";

const ESCALAS = [1, 1.12, 1.25] as const;
const ETIQUETA_ESCALA: Record<string, string> = { "1": "A", "1.12": "A+", "1.25": "A++" };

type Props = {
  rol: Rol;
  nombre: string;
  iniciales: string;
  indicador: string;
  children: React.ReactNode;
};

export function AppShell({ rol, nombre, iniciales, indicador, children }: Props) {
  const pathname = usePathname();
  const [escala, setEscala] = useState<(typeof ESCALAS)[number]>(1);
  const [alertaAbierta, setAlertaAbierta] = useState(false);

  const items = NAV_POR_ROL[rol];
  const titulo = tituloDeRuta(rol, pathname);

  function ciclarEscala() {
    setEscala((actual) => ESCALAS[(ESCALAS.indexOf(actual) + 1) % ESCALAS.length]);
  }

  return (
    <div className="flex min-h-screen flex-col-reverse bg-fondo md:flex-row">
      <nav
        aria-label="Navegación principal"
        className="sticky bottom-0 z-20 flex border-t border-borde bg-superficie px-2 py-1.5 md:top-0 md:h-screen md:w-[236px] md:flex-none md:flex-col md:gap-[18px] md:border-r md:border-t-0 md:px-3.5 md:py-5"
      >
        <div className="hidden items-center gap-2.5 border-b border-[#F1EBE5] px-1 pb-4 md:flex">
          <div className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-lg bg-primario">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9.5 12 3l9 6.5V21H3zM9 21v-7h6v7" />
            </svg>
          </div>
          <div>
            <div className="text-[12px] font-extrabold tracking-[.06em] text-primario-fuerte">RUTA PEDAGÓGICA</div>
            <div className="text-[9.5px] tracking-[.08em] text-suave">ARCHIVO VIVO DE EL SALADO</div>
          </div>
        </div>

        <ul
          className="grid w-full gap-0.5 md:flex md:flex-col"
          style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
        >
          {items.map((item) => {
            const activo = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={activo ? "page" : undefined}
                  className={`flex w-full flex-col items-center justify-center gap-1 rounded-[9px] px-1.5 py-2 text-center md:flex-row md:justify-start md:gap-[11px] md:px-[13px] md:py-2.5 md:text-left ${
                    activo
                      ? "bg-primario-tinte font-bold text-primario-fuerte"
                      : "font-medium text-apagado hover:bg-[#F7F2ED]"
                  }`}
                >
                  <svg className="flex-none" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d={item.icon} />
                  </svg>
                  <span className="text-[9px] font-bold leading-[1.1] md:text-[12.5px] md:font-inherit md:leading-[1.3]">
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-auto hidden flex-col gap-3 md:flex">
          <button
            onClick={() => setAlertaAbierta(true)}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-[9px] bg-primario-fuerte px-3 py-[11px] text-[10.5px] font-extrabold tracking-[.07em] text-white hover:bg-primario-hover"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01" />
            </svg>
            <span>ALERTA DE CUIDADO</span>
          </button>
          <Link
            href="/cambiar-contrasena"
            className="px-1 text-[11px] font-semibold text-suave hover:text-primario"
          >
            Cambiar mi contraseña
          </Link>
        </div>
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-15 flex flex-wrap items-center justify-between gap-3.5 border-b border-borde bg-fondo/95 px-4 py-3 backdrop-blur-[8px] md:px-[26px] md:py-3.5">
          <div className="flex min-w-0 items-baseline gap-3.5">
            <span className="whitespace-nowrap text-[14px] font-extrabold tracking-[.1em] text-primario-fuerte">
              MEMORIA EL SALADO
            </span>
            <span className="truncate text-[12px] text-suave">{titulo}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="hidden rounded-full bg-secundario-tinte px-3 py-1.5 text-[11px] font-bold text-secundario-fuerte md:block">
              {indicador}
            </div>
            <button
              onClick={ciclarEscala}
              title="Tamaño de texto"
              aria-label={`Tamaño de texto actual ${ETIQUETA_ESCALA[String(escala)]}. Pulsa para cambiar.`}
              className={`cursor-pointer rounded-lg border px-[11px] py-1.5 text-[12px] font-extrabold ${
                escala > 1
                  ? "border-secundario bg-secundario-tinte text-secundario-fuerte"
                  : "border-borde-campo bg-superficie text-apagado"
              }`}
            >
              {ETIQUETA_ESCALA[String(escala)]}
            </button>
            <div className="flex items-center gap-2 rounded-full border border-borde py-[5px] pl-2.5 pr-1.5">
              <span className="text-[11px] font-bold text-apagado">{ETIQUETA_ROL[rol]}</span>
              <div
                title={nombre}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-secundario text-[11px] font-bold text-white"
              >
                {iniciales}
              </div>
            </div>
            <button
              onClick={() => signOut({ redirectTo: "/login" })}
              className="cursor-pointer rounded-lg border border-borde-campo bg-superficie px-[11px] py-[7px] text-[11.5px] font-semibold text-apagado hover:border-primario hover:text-primario"
            >
              Salir
            </button>
          </div>
        </header>

        <main data-escala={escala} className="flex-1 px-4 pb-8 pt-5 md:px-[30px] md:pb-15 md:pt-7">
          {children}
        </main>
      </div>

      {alertaAbierta && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-alerta"
          onClick={() => setAlertaAbierta(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(45,30,22,.42)] p-6"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-[460px] rounded-[14px] bg-superficie px-7 py-[26px] shadow-[0_24px_60px_rgba(0,0,0,.22)]"
          >
            <div className="flex items-center gap-[9px] text-[11px] font-bold tracking-[.12em] text-primario-fuerte">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01" />
              </svg>
              <span>ALERTA DE CUIDADO</span>
            </div>
            <h2 id="titulo-alerta" className="mb-2 mt-3 text-[20px] font-extrabold tracking-[-.02em]">
              Estás por entrar a un contenido sensible
            </h2>
            <p className="mb-4 text-[13.5px] leading-[1.7] text-apagado">
              Este módulo contiene testimonios sobre la masacre y el desplazamiento. Puedes pausar en cualquier
              momento, salir del recurso o pedir acompañamiento a tu docente. Nadie está obligado a continuar.
            </p>
            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={() => setAlertaAbierta(false)}
                className="cursor-pointer rounded-lg bg-primario-fuerte px-[17px] py-[11px] text-[13px] font-bold text-white hover:bg-primario-hover"
              >
                Entiendo, continuar
              </button>
              <button
                onClick={() => setAlertaAbierta(false)}
                className="cursor-pointer rounded-lg border border-borde-campo bg-superficie px-[17px] py-[11px] text-[13px] font-semibold text-apagado"
              >
                Pedir acompañamiento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
