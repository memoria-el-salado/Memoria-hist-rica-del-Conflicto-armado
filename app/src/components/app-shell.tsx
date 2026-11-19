"use client";

import { IconoMemoria } from "@/components/icono-memoria";
import { useEffect, useState, useSyncExternalStore } from "react";
import { CLAVE_ESCALA, ETIQUETA_ESCALA, leerEscala, siguienteEscala, type Escala } from "@/lib/escala-texto";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { Rol } from "@prisma/client";
import { ETIQUETA_ROL, INICIO_POR_ROL, NAV_POR_ROL, tituloDeRuta } from "@/lib/navegacion";
import { Campana } from "@/components/avisos/campana";
import { BotonTema } from "@/components/boton-tema";
import { sesionDeRuta } from "@/lib/cuidado";
import { FormularioAcompanamiento } from "@/components/cuidado/formulario-acompanamiento";
import type { AvisoVista } from "@/lib/avisos-datos";
import { AvatarExplorador } from "@/components/explorador";
import type { Explorador } from "@/lib/exploradores";


type Props = {
  rol: Rol;
  nombre: string;
  iniciales: string;
  indicador: string;
  /** Solo para el docente: pedidos de acompañamiento que esperan respuesta. */
  solicitudesPendientes?: number;
  /** El explorador del estudiante, que sustituye a sus iniciales. */
  explorador?: Explorador | null;
  /** La campana; el administrador no la tiene. */
  avisos?: { avisos: AvisoVista[]; nuevos: number } | null;
  children: React.ReactNode;
};

/** Secciones que se ven en la barra inferior del móvil antes de «Más». */
const VISIBLES_MOVIL = 4;

/** Un corazón: pedir que te acompañen, no dar una alarma. */
const ICONO_ACOMPANAMIENTO = "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l8.8 8.8 8.8-8.8a5.5 5.5 0 0 0 0-7.8z";

/** Si el navegador no deja guardar (algunos modos privados), vale mientras dure la página. */
let escalaEnMemoria: Escala = "1";

/** La escala guardada en el navegador. */
function escalaGuardada(): Escala {
  try {
    return leerEscala(localStorage.getItem(CLAVE_ESCALA) ?? escalaEnMemoria);
  } catch {
    return escalaEnMemoria;
  }
}

const CAMBIO_ESCALA = "memoria:escala";

function suscribirEscala(avisar: () => void) {
  window.addEventListener("storage", avisar);
  window.addEventListener(CAMBIO_ESCALA, avisar);
  return () => {
    window.removeEventListener("storage", avisar);
    window.removeEventListener(CAMBIO_ESCALA, avisar);
  };
}

function guardarEscala(escala: Escala) {
  escalaEnMemoria = escala;
  try {
    localStorage.setItem(CLAVE_ESCALA, escala);
  } catch {}
  window.dispatchEvent(new Event(CAMBIO_ESCALA));
}

export function AppShell({ rol, nombre, iniciales, indicador, solicitudesPendientes = 0, explorador, avisos, children }: Props) {
  const pathname = usePathname();
  // La elección se recuerda en el navegador. Se aplica a la raíz para que
  // crezca todo el texto, también el del menú y la cabecera.
  const escala = useSyncExternalStore(suscribirEscala, escalaGuardada, () => "1" as Escala);
  useEffect(() => {
    document.documentElement.dataset.escala = escala;
    return () => {
      delete document.documentElement.dataset.escala;
    };
  }, [escala]);

  const items = NAV_POR_ROL[rol];
  // En el móvil caben cinco botones: si hay más secciones, las últimas van a «Más».
  const conMas = items.length > VISIBLES_MOVIL + 1;
  const ocultas = conMas ? items.slice(VISIBLES_MOVIL) : [];
  const [masAbierto, setMasAbierto] = useState(false);
  const [ayudaAbierta, setAyudaAbierta] = useState(false);
  const titulo = tituloDeRuta(rol, pathname);

  function ciclarEscala() {
    guardarEscala(siguienteEscala(escala));
  }

  return (
    <div className="flex min-h-screen flex-col-reverse bg-fondo md:flex-row">
      <a href="#contenido" className="saltar-contenido">Saltar al contenido</a>
      <nav
        aria-label="Navegación principal"
        className="sticky bottom-0 z-20 flex border-t border-borde bg-superficie px-2 py-1.5 md:top-0 md:h-screen md:w-[236px] md:flex-none md:flex-col md:gap-[18px] md:border-r md:border-t-0 md:px-3.5 md:py-5"
      >
        {/* La marca lleva al inicio de cada rol: los docentes que probaron la
            plataforma esperaban que «Ruta Pedagógica» abriera la ruta. */}
        <Link
          href={INICIO_POR_ROL[rol]}
          aria-label="Ruta Pedagógica: ir al inicio"
          className="hidden items-center gap-2.5 border-b border-linea px-1 pb-4 text-inherit no-underline hover:no-underline md:flex"
        >
          <div className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-lg bg-primario-fuerte text-white">
            <IconoMemoria tamano={22} />
          </div>
          <div>
            <div className="text-[0.75rem] font-extrabold tracking-[.06em] text-primario-texto">RUTA PEDAGÓGICA</div>
            <div className="text-[0.59375rem] tracking-[.08em] text-suave">ARCHIVO VIVO DE EL SALADO</div>
          </div>
        </Link>

        <ul
          className="grid w-full grid-cols-[repeat(var(--columnas),minmax(0,1fr))] gap-0.5 md:flex md:flex-col"
          style={{ "--columnas": conMas ? VISIBLES_MOVIL + 1 : items.length } as React.CSSProperties}
        >
          {items.map((item, i) => {
            // Dentro de un curso o de un debate, su sección sigue marcada.
            const activo = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href} className={conMas && i >= VISIBLES_MOVIL ? "hidden md:block" : undefined}>
                <Link
                  href={item.href}
                  aria-current={pathname === item.href ? "page" : activo ? "location" : undefined}
                  className={`relative flex w-full flex-col items-center justify-center gap-1 rounded-[9px] px-1.5 py-2 text-center md:flex-row md:justify-start md:gap-[11px] md:px-[13px] md:py-2.5 md:text-left ${
                    activo
                      ? "bg-primario-tinte font-bold text-primario-texto"
                      : "font-medium text-apagado hover:bg-realce"
                  }`}
                >
                  <svg className="flex-none" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d={item.icon} />
                  </svg>
                  <span className="text-[0.5625rem] font-bold leading-[1.1] md:text-[0.78125rem] md:font-inherit md:leading-[1.3]">
                    {item.label}
                  </span>
                  {/* Los mensajes por atender se cuentan junto a «Mensajes». */}
                  {item.href === "/docente/mensajes" && solicitudesPendientes > 0 && (
                    <span
                      aria-label={`${solicitudesPendientes} ${solicitudesPendientes === 1 ? "mensaje por atender" : "mensajes por atender"}`}
                      className="absolute right-1.5 top-1 rounded-full bg-primario-fuerte px-1.5 py-px text-[0.625rem] font-bold text-white md:static md:ml-auto"
                    >
                      {solicitudesPendientes}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
          {conMas && (
            <li className="relative md:hidden">
              <button
                onClick={() => setMasAbierto((a) => !a)}
                aria-expanded={masAbierto}
                aria-label="Más secciones"
                className={`flex w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-[9px] px-1.5 py-2 ${
                  ocultas.some((i) => pathname.startsWith(i.href)) ? "bg-primario-tinte font-bold text-primario-texto" : "font-medium text-apagado"
                }`}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
                  <path d="M5 12h.01M12 12h.01M19 12h.01" />
                </svg>
                <span className="text-[0.5625rem] font-bold leading-[1.1]">Más</span>
              </button>
              {masAbierto && (
                <ul className="absolute bottom-[calc(100%+8px)] right-0 z-30 w-[220px] overflow-hidden rounded-xl border border-borde bg-superficie py-1 shadow-[0_-8px_30px_rgba(0,0,0,.12)]">
                  {ocultas.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setMasAbierto(false)}
                        aria-current={pathname === item.href ? "page" : undefined}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-[0.8125rem] font-semibold text-tinta no-underline hover:bg-realce"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d={item.icon} />
                        </svg>
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )}
        </ul>

        <div className="mt-auto hidden flex-col gap-3 md:flex">
          {/* El estudiante le escribe a su docente cuando lo necesita; le llega a «Mensajes». */}
          {rol === "ESTUDIANTE" && (
            <button
              onClick={() => setAyudaAbierta(true)}
              className="flex cursor-pointer items-center justify-center gap-2 rounded-[9px] bg-primario-fuerte px-3 py-[11px] text-[0.65625rem] font-extrabold tracking-[.07em] text-white hover:bg-primario-hover"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={ICONO_ACOMPANAMIENTO} />
              </svg>
              <span>ACOMPAÑAMIENTO</span>
            </button>
          )}
          {rol === "ESTUDIANTE" && (
            <Link href="/estudiante/explorador" className="px-1 text-[0.6875rem] font-semibold text-suave hover:text-primario-texto">
              Cambiar mi explorador
            </Link>
          )}
          <Link
            href="/cambiar-contrasena"
            className="px-1 text-[0.6875rem] font-semibold text-suave hover:text-primario-texto"
          >
            Cambiar mi contraseña
          </Link>
        </div>
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-15 flex flex-wrap items-center justify-between gap-3.5 border-b border-borde bg-fondo/95 px-4 py-3 backdrop-blur-[8px] md:px-[26px] md:py-3.5">
          <div className="flex min-w-0 items-center gap-3.5">
            {/* En el celular el menú lateral pasa abajo: el ícono queda arriba a la izquierda. */}
            <Link
              href={INICIO_POR_ROL[rol]}
              aria-label="Memoria El Salado: ir al inicio"
              className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-lg bg-primario-fuerte text-white md:hidden"
            >
              <IconoMemoria tamano={20} />
            </Link>
            <span className="whitespace-nowrap text-[0.875rem] font-extrabold tracking-[.1em] text-primario-texto">
              MEMORIA EL SALADO
            </span>
            <span className="truncate text-[0.75rem] text-suave">{titulo}</span>
          </div>
          <div className="flex items-center gap-2.5">
            {rol === "ESTUDIANTE" && (
              <button
                onClick={() => setAyudaAbierta(true)}
                aria-label="Acompañamiento: escribirle a tu docente"
                className="flex cursor-pointer items-center rounded-lg bg-primario-fuerte px-2.5 py-[7px] text-white md:hidden"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={ICONO_ACOMPANAMIENTO} />
                </svg>
              </button>
            )}
            <div className="hidden rounded-full bg-secundario-tinte px-3 py-1.5 text-[0.6875rem] font-bold text-secundario-texto md:block">
              {indicador}
            </div>
            {avisos && <Campana avisos={avisos.avisos} nuevos={avisos.nuevos} />}
            <BotonTema />
            <button
              onClick={ciclarEscala}
              title="Tamaño de texto"
              aria-label={`Tamaño de texto actual ${ETIQUETA_ESCALA[escala]}. Pulsa para cambiar.`}
              className={`cursor-pointer rounded-lg border px-[11px] py-1.5 text-[0.75rem] font-extrabold ${
                escala !== "1"
                  ? "border-secundario bg-secundario-tinte text-secundario-texto"
                  : "border-borde-campo bg-superficie text-apagado"
              }`}
            >
              {ETIQUETA_ESCALA[escala]}
            </button>
            <div className="flex items-center gap-2 rounded-full border border-borde py-[5px] pl-2.5 pr-1.5">
              <span className="text-[0.6875rem] font-bold text-apagado">{ETIQUETA_ROL[rol]}</span>
              {explorador ? (
                <span title={nombre}>
                  <AvatarExplorador tipo={explorador} tamano={24} />
                </span>
              ) : (
                <div
                  title={nombre}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-secundario text-[0.6875rem] font-bold text-white"
                >
                  {iniciales}
                </div>
              )}
            </div>
            <button
              onClick={() => signOut({ redirectTo: "/login" })}
              className="cursor-pointer rounded-lg border border-borde-campo bg-superficie px-[11px] py-[7px] text-[0.71875rem] font-semibold text-apagado hover:border-primario hover:text-primario-texto"
            >
              Salir
            </button>
          </div>
        </header>

        <main id="contenido" tabIndex={-1} className="outline-none flex-1 px-4 pb-8 pt-5 md:px-[30px] md:pb-15 md:pt-7">
          {children}
        </main>
      </div>

      {ayudaAbierta && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-acompanamiento-estudiante"
          onClick={() => setAyudaAbierta(false)}
          onKeyDown={(e) => e.key === "Escape" && setAyudaAbierta(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(45,30,22,.42)] p-6"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[480px] rounded-[14px] bg-superficie px-7 py-[26px] shadow-[0_24px_60px_rgba(0,0,0,.22)]"
          >
            <div className="flex items-center gap-[9px] text-[0.6875rem] font-bold tracking-[.12em] text-primario-texto">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={ICONO_ACOMPANAMIENTO} />
              </svg>
              <span>ACOMPAÑAMIENTO</span>
            </div>
            <h2 id="titulo-acompanamiento-estudiante" className="mb-2 mt-3 text-[1.25rem] font-extrabold tracking-[-.02em]">
              ¿Necesitas una pausa o hablar con alguien?
            </h2>
            <p className="mb-4 text-[0.84375rem] leading-[1.7] text-apagado">
              Puedes detenerte cuando quieras: nadie está obligado a continuar. Escríbele a tu docente lo que quieras
              contarle; le llegará a sus mensajes y te buscará. No tienes que explicar nada si no quieres.
            </p>
            <FormularioAcompanamiento sesionId={sesionDeRuta(pathname)} />
            <button
              autoFocus
              onClick={() => setAyudaAbierta(false)}
              className="mt-3 cursor-pointer rounded-lg border border-borde-campo bg-superficie px-[17px] py-2.5 text-[0.8125rem] font-semibold text-apagado hover:border-primario hover:text-primario-texto"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
