import { BotonTema } from "@/components/boton-tema";
import { IconoMemoria } from "@/components/icono-memoria";
import { Suspense } from "react";
import { IlustracionEntrada } from "@/components/portada/ilustraciones";
import Link from "next/link";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-fondo">
      <a href="#contenido" className="saltar-contenido">Saltar al contenido</a>
      <BotonTema className="fixed right-4 top-4 z-10" />
      <main id="contenido" tabIndex={-1} className="flex flex-1 items-center justify-center px-5 py-8 outline-none">
        <div className="grid w-full max-w-[1000px] overflow-hidden rounded-[14px] border border-borde bg-superficie shadow-[0_18px_50px_rgba(70,45,30,.07)] md:grid-cols-[1fr_1.05fr]">
          <div className="relative hidden min-h-[520px] flex-col overflow-hidden p-10 md:flex">
            {/* El pueblo al atardecer y la abuela que le lee al explorador; el velo deja legible el nombre. */}
            <IlustracionEntrada className="absolute inset-0 h-full w-full" />
            <div
              aria-hidden="true"
              className="absolute inset-0 [background-image:linear-gradient(to_top,rgba(122,46,27,.96)_0%,rgba(122,46,27,.9)_30%,rgba(122,46,27,.35)_46%,rgba(122,46,27,0)_58%)]"
            />
            <div className="relative mt-auto">
              <IconoMemoria tamano={44} className="mb-5 text-white" />
              <div className="text-[2.375rem] font-extrabold leading-[1.02] tracking-[-.02em] text-white">
                Memoria
                <br />
                El Salado
              </div>
              <p className="mt-4 max-w-[280px] text-[0.84375rem] leading-[1.6] text-white/85">
                Construyendo puentes entre el pasado y el futuro de nuestra comunidad.
              </p>
            </div>
          </div>

          <div className="px-8 py-10 sm:px-11 sm:pb-9 sm:pt-11">
            <div className="flex items-center gap-[7px] text-[0.65625rem] font-bold tracking-[.14em] text-primario-texto">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              <span>BIENVENIDO</span>
            </div>
            <h1 className="mb-1 mt-3 text-[1.6875rem] font-extrabold tracking-[-.02em]">Iniciar Sesión</h1>
            <p className="mb-6 text-[0.84375rem] text-tenue">Ingresa tus datos para continuar tu viaje digital.</p>

            <Suspense fallback={<div className="h-[420px]" aria-hidden />}>
              <LoginForm />
            </Suspense>

            <p className="mt-5 text-center text-[0.71875rem] text-tenue">
              ¿Eres nuevo aquí? <strong className="text-primario-texto">Pide a tu docente</strong> que cree tu cuenta.
            </p>
            <p className="mt-2 text-center text-[0.71875rem]">
              <Link href="/" className="font-semibold text-apagado hover:text-primario-texto">
                ← Volver al inicio
              </Link>
            </p>
          </div>
        </div>
      </main>

      <div className="flex flex-wrap justify-between gap-3.5 border-t border-borde px-7 py-4 text-[0.6875rem] text-tenue">
        <span>
          <strong className="font-bold text-primario-texto">Memoria El Salado</strong> · Plataforma educativa LMS /
          LCMS · 2026
        </span>
        <span className="flex gap-[18px]">
          <a href="https://centrodememoriahistorica.gov.co" target="_blank" rel="noreferrer">
            Centro Nacional de Memoria Histórica
          </a>
          <Link href="/#privacidad">Privacidad</Link>
        </span>
      </div>
    </div>
  );
}
