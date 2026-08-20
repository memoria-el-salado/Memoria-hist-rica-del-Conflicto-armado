import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-fondo">
      <div className="flex flex-1 items-center justify-center px-5 py-8">
        <div className="grid w-full max-w-[1000px] overflow-hidden rounded-[14px] border border-borde bg-superficie shadow-[0_18px_50px_rgba(70,45,30,.07)] md:grid-cols-[1fr_1.05fr]">
          <div className="relative hidden min-h-[520px] flex-col overflow-hidden p-10 md:flex">
            <div className="absolute inset-0 bg-[linear-gradient(160deg,#D95D39_0%,#B8482A_60%,#8E3520_100%)]" />
            <div className="absolute inset-0 opacity-[.16] bg-[repeating-linear-gradient(115deg,transparent_0_18px,#fff_18px_19px)]" />
            <div className="relative mt-auto">
              <div className="text-[38px] font-extrabold leading-[1.02] tracking-[-.02em] text-white">
                Memoria
                <br />
                El Salado
              </div>
              <p className="mt-4 max-w-[280px] text-[13.5px] leading-[1.6] text-white/85">
                Construyendo puentes entre el pasado y el futuro de nuestra comunidad.
              </p>
            </div>
          </div>

          <div className="px-8 py-10 sm:px-11 sm:pb-9 sm:pt-11">
            <div className="flex items-center gap-[7px] text-[10.5px] font-bold tracking-[.14em] text-primario">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              <span>BIENVENIDO</span>
            </div>
            <h1 className="mb-1 mt-3 text-[27px] font-extrabold tracking-[-.02em]">Iniciar Sesión</h1>
            <p className="mb-6 text-[13.5px] text-tenue">Ingresa tus datos para continuar tu viaje digital.</p>

            <Suspense fallback={<div className="h-[420px]" aria-hidden />}>
              <LoginForm />
            </Suspense>

            <p className="mt-5 text-center text-[11.5px] text-tenue">
              ¿No tienes cuenta? Las credenciales las entrega tu docente.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-between gap-3.5 border-t border-borde px-7 py-4 text-[11px] text-[#9A918A]">
        <span>
          <strong className="font-bold text-primario">Memoria El Salado</strong> · Plataforma educativa LMS /
          LCMS · 2026
        </span>
        <span className="flex gap-[18px]">
          <a href="#">Guía Pedagógica</a>
          <a href="#">Privacidad</a>
          <a href="#">Contacto</a>
        </span>
      </div>
    </div>
  );
}
