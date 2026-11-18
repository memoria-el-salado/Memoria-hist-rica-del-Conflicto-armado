import { IconoMemoria } from "@/components/icono-memoria";
import type { Metadata } from "next";
import Link from "next/link";
import {
  IlustracionArchivo,
  IlustracionInvitacion,
  IlustracionJardin,
  IlustracionMapa,
  IlustracionSimulacion,
} from "@/components/portada/ilustraciones";

export const metadata: Metadata = {
  title: "Memoria El Salado · Descubre el legado de un pueblo valiente",
  description:
    "Un espacio interactivo para que jóvenes conozcan la memoria de El Salado y los Montes de María: su identidad, su territorio y su resiliencia.",
};

/**
 * La portada pública (mockup de la página 7 del avance). Es lo primero que ve
 * quien llega sin cuenta; quien ya entró va directo a su espacio (lo decide
 * `proxy.ts`).
 */

const DESCUBRE = [
  {
    titulo: "Identidad",
    texto: "Conoce quiénes somos: las tradiciones, la música y las historias que nos unen como comunidad de los Montes de María.",
    color: "bg-primario",
    icono: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
  },
  {
    titulo: "Territorio",
    texto: "Explora el mapa del dolor, pero también de la esperanza: la tierra guarda las huellas de lo que fuimos y lo que somos hoy.",
    color: "bg-secundario",
    icono: "M9 3 3 6v15l6-3 6 3 6-3V3l-6 3-6-3v15",
  },
  {
    titulo: "Resiliencia",
    texto: "Descubre la fuerza de nuestra gente: cómo El Salado volvió a levantarse con las manos de quienes nunca dejaron de soñar con la paz.",
    color: "bg-terciario-fuerte",
    icono: "M12 21V11M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M12 15c-3 0-5-2-5-4",
  },
];

/** El degradado que hace legible el texto sobre la escena; `alto` es la parte de la tarjeta que cubre. */
function velo(tono: string, alto = 0.72) {
  const p = (f: number) => `${Math.round(f * alto * 100)}%`;
  return `linear-gradient(to top, rgba(${tono}, .96) 0%, rgba(${tono}, .9) ${p(0.58)}, rgba(${tono}, .35) ${p(1)}, rgba(${tono}, 0) ${p(1.39)})`;
}

/** En una tarjeta ancha, el texto va a la izquierda y la escena se ve a la derecha. */
const veloLateral = (tono: string) =>
  `linear-gradient(to right, rgba(${tono}, .96) 0%, rgba(${tono}, .9) 36%, rgba(${tono}, .3) 58%, rgba(${tono}, 0) 72%)`;

/**
 * Cada actividad lleva de fondo una escena de lo que se hace en ella. El texto
 * va abajo, sobre un degradado del tono de la tarjeta que se vuelve sólido
 * detrás de las letras: la escena se ve arriba y el texto se lee siempre.
 */
const EXPERIENCIAS = [
  {
    titulo: "Archivo y testimonios",
    texto: "Documentos, voces y anotaciones compartidas para leer la historia con otros.",
    clase: "sm:row-span-2 min-h-[400px]! sm:min-h-0!",
    tono: "59, 34, 24",
    // La tarjeta es alta: el velo empieza más abajo para dejar ver a la abuela que cuenta.
    velo: velo("59, 34, 24", 0.46),
    Ilustracion: IlustracionArchivo,
  },
  {
    titulo: "Simulación histórica",
    texto: "Reparte la tierra como en la Reforma Agraria y mide la equidad de tus decisiones.",
    clase: "lg:col-span-2",
    tono: "14, 70, 70",
    lateral: true,
    velo: velo("14, 70, 70", 0.6),
    Ilustracion: IlustracionSimulacion,
  },
  {
    titulo: "Jardín de la memoria",
    texto: "Siembra una flor con una carta, un poema o un dibujo.",
    clase: "",
    tono: "84, 58, 8",
    velo: velo("84, 58, 8"),
    Ilustracion: IlustracionJardin,
  },
  {
    titulo: "Mapa interactivo",
    texto: "Marca los lugares que te importan, con tu voz y tus fotos.",
    clase: "",
    tono: "114, 42, 24",
    velo: velo("114, 42, 24"),
    Ilustracion: IlustracionMapa,
  },
];

/** Los Montes de María al atardecer, dibujados con la paleta de la plataforma. */
function Paisaje() {
  return (
    <svg viewBox="0 0 480 360" role="img" aria-label="Ilustración de las colinas de los Montes de María al atardecer, con casas campesinas" className="h-full w-full">
      <defs>
        <linearGradient id="cielo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F2C48D" />
          <stop offset="1" stopColor="#F7E3C8" />
        </linearGradient>
      </defs>
      <rect width="480" height="360" fill="url(#cielo)" />
      <circle cx="360" cy="120" r="42" fill="#F6D9A6" />
      <path d="M0 210 Q90 120 180 190 T360 170 T480 180 V360 H0Z" fill="#8FA46A" />
      <path d="M0 250 Q120 170 240 235 T480 220 V360 H0Z" fill="#5E7F4B" />
      <path d="M0 300 Q140 240 300 290 T480 280 V360 H0Z" fill="#3F6436" />
      {[
        [110, 262],
        [150, 270],
        [300, 280],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <rect x={x} y={y} width="30" height="20" fill="#F4EDE3" />
          <path d={`M${x - 4} ${y} L${x + 15} ${y - 14} L${x + 34} ${y}Z`} fill="#B8482A" />
          <rect x={x + 12} y={y + 8} width="7" height="12" fill="#6E4A33" />
        </g>
      ))}
      <path d="M420 300 q-6 -40 10 -70 M430 232 q18 -8 30 4 M430 232 q-20 -10 -30 2 M430 232 q4 -20 20 -24" stroke="#2F4A2A" strokeWidth="5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export default function Portada() {
  return (
    <div className="min-h-screen bg-fondo text-tinta">
      <a href="#contenido" className="saltar-contenido">Saltar al contenido</a>
      <header className="sticky top-0 z-20 border-b border-borde bg-fondo/95 backdrop-blur-[8px]">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-4 px-4 py-3 md:px-6">
          <span className="flex items-center gap-2.5 text-[0.9375rem] font-extrabold tracking-[.02em] text-primario-fuerte">
            <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-lg bg-primario-fuerte text-white">
              <IconoMemoria tamano={20} />
            </span>
            Memoria El Salado
          </span>
          <nav aria-label="Secciones de la portada" className="hidden gap-6 text-[0.75rem] font-bold tracking-[.06em] text-apagado sm:flex">
            <a href="#descubre" className="no-underline hover:text-primario-texto">EL PROYECTO</a>
            <a href="#experiencias" className="no-underline hover:text-primario-texto">ACTIVIDADES</a>
            <a href="#privacidad" className="no-underline hover:text-primario-texto">PRIVACIDAD</a>
          </nav>
          <Link href="/login" className="rounded-lg bg-primario-fuerte px-4 py-2 text-[0.78125rem] font-bold text-white no-underline hover:bg-primario-hover">
            Entrar
          </Link>
        </div>
      </header>

      <main id="contenido" tabIndex={-1} className="outline-none">
        <section className="mx-auto grid max-w-[1120px] items-center gap-10 px-4 pb-14 pt-12 md:grid-cols-[1.05fr_1fr] md:px-6 md:pt-16">
          <div>
            <span className="inline-block rounded-full bg-primario-tinte px-3 py-1 text-[0.65625rem] font-extrabold tracking-[.12em] text-primario-fuerte">
              ARCHIVO VIVO DE LA MEMORIA
            </span>
            <h1 className="mt-4 text-[2.25rem] font-extrabold leading-[1.08] tracking-[-.025em] text-primario-fuerte md:text-[2.875rem]">
              Descubre el legado de un pueblo valiente.
            </h1>
            <p className="mt-4 max-w-[520px] text-[0.9375rem] leading-[1.75] text-apagado">
              Bienvenido a un espacio interactivo diseñado para jóvenes. Aquí la historia no está en libros viejos, sino
              en las memorias, el territorio y la increíble capacidad de El Salado para florecer de nuevo.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-lg bg-primario-fuerte px-5 py-3 text-[0.875rem] font-bold text-white no-underline hover:bg-primario-hover"
              >
                Comenzar viaje <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
          <figure className="relative mx-auto w-full max-w-[480px] rotate-[1.5deg]">
            <div className="overflow-hidden rounded-2xl border-4 border-white shadow-[0_24px_60px_rgba(120,70,45,.22)]">
              <Paisaje />
            </div>
            <figcaption className="absolute -bottom-5 left-4 -rotate-[2deg] rounded-md bg-terciario-tinte px-4 py-2.5 text-[0.8125rem] italic text-tinta-media shadow-[0_8px_20px_rgba(0,0,0,.12)]">
              «La memoria es la semilla del futuro.»
            </figcaption>
          </figure>
        </section>

        <section id="descubre" aria-labelledby="titulo-descubre" className="scroll-mt-20 bg-superficie py-14">
          <div className="mx-auto max-w-[1120px] px-4 md:px-6">
            <h2 id="titulo-descubre" className="text-center text-[1.625rem] font-extrabold tracking-[-.02em]">
              ¿Qué vas a descubrir?
            </h2>
            <div className="mx-auto mt-2 h-1 w-16 rounded-full bg-terciario" aria-hidden="true" />
            <ul className="mt-9 grid gap-4 md:grid-cols-3">
              {DESCUBRE.map((d) => (
                <li key={d.titulo} className="rounded-xl border border-borde bg-fondo p-5">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-lg text-white ${d.color}`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d={d.icono} />
                    </svg>
                  </span>
                  <h3 className="mt-3 text-[1rem] font-extrabold text-primario-fuerte">{d.titulo}</h3>
                  <p className="mt-1.5 text-[0.84375rem] leading-[1.7] text-apagado">{d.texto}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="experiencias" aria-labelledby="titulo-experiencias" className="mx-auto max-w-[1120px] scroll-mt-20 px-4 py-14 md:px-6">
          <h2 id="titulo-experiencias" className="text-[1.375rem] font-extrabold tracking-[-.02em]">
            Un viaje por la memoria, actividad por actividad
          </h2>
          <p className="mt-1.5 max-w-[640px] text-[0.875rem] leading-[1.7] text-apagado">
            La ruta sigue la guía del Centro Nacional de Memoria Histórica sobre El Salado, en seis ejes, con alertas de
            cuidado antes de los contenidos más duros.
          </p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 sm:grid-rows-2 lg:grid-cols-3">
            {EXPERIENCIAS.map((e) => (
              <li
                key={e.titulo}
                className={`relative isolate flex min-h-[290px] sm:min-h-[230px] flex-col justify-end overflow-hidden rounded-xl p-5 text-white ${e.clase}`}
                style={{ backgroundColor: `rgb(${e.tono})` }}
              >
                <e.Ilustracion className="absolute inset-0 -z-20 h-full w-full" />
                <div
                  aria-hidden="true"
                  className={`absolute inset-0 -z-10 ${e.lateral ? "lg:hidden" : ""}`}
                  style={{ backgroundImage: e.velo }}
                />
                {e.lateral && (
                  <div aria-hidden="true" className="absolute inset-0 -z-10 hidden lg:block" style={{ backgroundImage: veloLateral(e.tono) }} />
                )}
                <div className={e.lateral ? "lg:max-w-[44%]" : undefined}>
                  <h3 className="text-[1.0625rem] font-extrabold [text-shadow:0_1px_2px_rgba(0,0,0,.35)]">{e.titulo}</h3>
                  <p className="mt-1 text-[0.8125rem] leading-[1.6] text-white/95">{e.texto}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="mx-auto max-w-[1120px] px-4 pb-14 md:px-6">
          <div className="relative isolate overflow-hidden rounded-2xl bg-primario-fuerte px-6 pb-[200px] pt-12 text-center text-white md:py-20">
            {/* El explorador invita a tomar el camino; el velo deja sólido el lugar del texto. */}
            <IlustracionInvitacion className="absolute inset-0 -z-20 hidden h-full w-full md:block" />
            <IlustracionInvitacion angosta className="absolute inset-0 -z-20 h-full w-full md:hidden" />
            <div
              aria-hidden="true"
              className="absolute inset-0 -z-10 [background-image:linear-gradient(to_bottom,rgba(178,69,40,.94)_0%,rgba(178,69,40,.9)_58%,rgba(178,69,40,.2)_78%,rgba(178,69,40,0)_100%)] md:[background-image:radial-gradient(ellipse_48%_70%_at_50%_45%,rgba(178,69,40,.94)_0%,rgba(178,69,40,.88)_55%,rgba(178,69,40,.25)_85%,rgba(178,69,40,0)_100%)]"
            />
            <h2 className="text-[1.625rem] font-extrabold tracking-[-.02em] md:text-[2rem]">¿Listo para ser parte de la historia?</h2>
            <p className="mx-auto mt-3 max-w-[560px] text-[0.90625rem] leading-[1.7] text-white/90">
              Tu participación ayuda a mantener viva la llama de la memoria. Explora, aprende y comparte la historia de El
              Salado. Tu docente te entrega el usuario para entrar.
            </p>
            <Link href="/login" className="mt-6 inline-block rounded-lg bg-white px-6 py-3 text-[0.875rem] font-bold text-primario-fuerte no-underline hover:bg-primario-tinte">
              Comenzar ahora
            </Link>
          </div>
        </section>

        <section id="privacidad" aria-labelledby="titulo-privacidad" className="mx-auto max-w-[1120px] scroll-mt-20 px-4 pb-14 md:px-6">
          <h2 id="titulo-privacidad" className="text-[1.0625rem] font-extrabold">Privacidad y cuidado</h2>
          <p className="mt-2 max-w-[760px] text-[0.84375rem] leading-[1.75] text-apagado">
            Las cuentas las crea cada docente para sus estudiantes; la plataforma no pide correo ni datos de contacto. Lo
            que un estudiante escribe en su diario es privado salvo que decida compartirlo con su docente. Los datos
            sensibles, como la pertenencia a una población víctima, solo se registran con autorización del acudiente y
            solo se muestran agregados (Ley 1581 de 2012).
          </p>
        </section>
      </main>

      <footer className="border-t border-borde bg-[#EFEAE4]">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-3 px-4 py-5 text-[0.75rem] text-apagado md:px-6">
          <span>
            <strong className="text-primario-fuerte">Memoria El Salado</strong> · Preservando la memoria para un futuro mejor.
          </span>
          <a href="https://centrodememoriahistorica.gov.co" target="_blank" rel="noreferrer" className="font-semibold text-apagado hover:text-primario-texto">
            Centro Nacional de Memoria Histórica
          </a>
        </div>
      </footer>
    </div>
  );
}
