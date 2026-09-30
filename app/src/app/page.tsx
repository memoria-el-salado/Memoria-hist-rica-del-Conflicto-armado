import type { Metadata } from "next";
import Link from "next/link";

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

const EXPERIENCIAS = [
  {
    titulo: "Archivo y testimonios",
    texto: "Documentos, voces y anotaciones compartidas para leer la historia con otros.",
    clase: "sm:row-span-2 bg-[#4A2A1E] text-white",
  },
  { titulo: "Simulación histórica", texto: "Reparte la tierra como en la Reforma Agraria y mide la equidad de tus decisiones.", clase: "lg:col-span-2 bg-[#BFEAE6] text-[#0F5555]" },
  { titulo: "Jardín de la memoria", texto: "Siembra una flor con una carta, un poema o un dibujo.", clase: "bg-[#F8DDA8] text-[#5E4108]" },
  { titulo: "Mapa interactivo", texto: "Marca los lugares que te importan, con tu voz y tus fotos.", clase: "bg-[#F6CFC3] text-[#7A2E1B]" },
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
      <header className="sticky top-0 z-20 border-b border-borde bg-fondo/95 backdrop-blur-[8px]">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-4 px-4 py-3 md:px-6">
          <span className="text-[15px] font-extrabold tracking-[.02em] text-primario-fuerte">Memoria El Salado</span>
          <nav aria-label="Secciones de la portada" className="hidden gap-6 text-[12px] font-bold tracking-[.06em] text-apagado sm:flex">
            <a href="#descubre" className="no-underline hover:text-primario">EL PROYECTO</a>
            <a href="#experiencias" className="no-underline hover:text-primario">ACTIVIDADES</a>
            <a href="#privacidad" className="no-underline hover:text-primario">PRIVACIDAD</a>
          </nav>
          <Link href="/login" className="rounded-lg bg-primario-fuerte px-4 py-2 text-[12.5px] font-bold text-white no-underline hover:bg-primario-hover">
            Entrar
          </Link>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-[1120px] items-center gap-10 px-4 pb-14 pt-12 md:grid-cols-[1.05fr_1fr] md:px-6 md:pt-16">
          <div>
            <span className="inline-block rounded-full bg-primario-tinte px-3 py-1 text-[10.5px] font-extrabold tracking-[.12em] text-primario-fuerte">
              ARCHIVO VIVO DE LA MEMORIA
            </span>
            <h1 className="mt-4 text-[36px] font-extrabold leading-[1.08] tracking-[-.025em] text-primario-fuerte md:text-[46px]">
              Descubre el legado de un pueblo valiente.
            </h1>
            <p className="mt-4 max-w-[520px] text-[15px] leading-[1.75] text-apagado">
              Bienvenido a un espacio interactivo diseñado para jóvenes. Aquí la historia no está en libros viejos, sino
              en las memorias, el territorio y la increíble capacidad de El Salado para florecer de nuevo.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-lg bg-primario-fuerte px-5 py-3 text-[14px] font-bold text-white no-underline hover:bg-primario-hover"
              >
                Comenzar viaje <span aria-hidden="true">→</span>
              </Link>
              <a
                href="#descubre"
                className="rounded-lg border border-secundario px-5 py-3 text-[14px] font-bold text-secundario-fuerte no-underline hover:bg-secundario-tinte"
              >
                Saber más
              </a>
            </div>
          </div>
          <figure className="relative mx-auto w-full max-w-[480px] rotate-[1.5deg]">
            <div className="overflow-hidden rounded-2xl border-4 border-white shadow-[0_24px_60px_rgba(120,70,45,.22)]">
              <Paisaje />
            </div>
            <figcaption className="absolute -bottom-5 left-4 -rotate-[2deg] rounded-md bg-terciario-tinte px-4 py-2.5 text-[13px] italic text-tinta-media shadow-[0_8px_20px_rgba(0,0,0,.12)]">
              «La memoria es la semilla del futuro.»
            </figcaption>
          </figure>
        </section>

        <section id="descubre" aria-labelledby="titulo-descubre" className="scroll-mt-20 bg-superficie py-14">
          <div className="mx-auto max-w-[1120px] px-4 md:px-6">
            <h2 id="titulo-descubre" className="text-center text-[26px] font-extrabold tracking-[-.02em]">
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
                  <h3 className="mt-3 text-[16px] font-extrabold text-primario-fuerte">{d.titulo}</h3>
                  <p className="mt-1.5 text-[13.5px] leading-[1.7] text-apagado">{d.texto}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="experiencias" aria-labelledby="titulo-experiencias" className="mx-auto max-w-[1120px] scroll-mt-20 px-4 py-14 md:px-6">
          <h2 id="titulo-experiencias" className="text-[22px] font-extrabold tracking-[-.02em]">
            Un viaje por la memoria, actividad por actividad
          </h2>
          <p className="mt-1.5 max-w-[640px] text-[14px] leading-[1.7] text-apagado">
            La ruta sigue la guía del Centro Nacional de Memoria Histórica sobre El Salado, en seis ejes, con alertas de
            cuidado antes de los contenidos más duros.
          </p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 sm:grid-rows-2 lg:grid-cols-3">
            {EXPERIENCIAS.map((e) => (
              <li key={e.titulo} className={`flex min-h-[150px] flex-col justify-end rounded-xl p-5 ${e.clase}`}>
                <h3 className="text-[16px] font-extrabold">{e.titulo}</h3>
                <p className="mt-1 text-[13px] leading-[1.6] opacity-90">{e.texto}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mx-auto max-w-[1120px] px-4 pb-14 md:px-6">
          <div className="rounded-2xl bg-primario-fuerte px-6 py-12 text-center text-white">
            <h2 className="text-[26px] font-extrabold tracking-[-.02em] md:text-[32px]">¿Listo para ser parte de la historia?</h2>
            <p className="mx-auto mt-3 max-w-[560px] text-[14.5px] leading-[1.7] text-white/90">
              Tu participación ayuda a mantener viva la llama de la memoria. Explora, aprende y comparte la historia de El
              Salado. Tu docente te entrega el usuario para entrar.
            </p>
            <Link href="/login" className="mt-6 inline-block rounded-lg bg-white px-6 py-3 text-[14px] font-bold text-primario-fuerte no-underline hover:bg-primario-tinte">
              Comenzar ahora
            </Link>
          </div>
        </section>

        <section id="privacidad" aria-labelledby="titulo-privacidad" className="mx-auto max-w-[1120px] scroll-mt-20 px-4 pb-14 md:px-6">
          <h2 id="titulo-privacidad" className="text-[17px] font-extrabold">Privacidad y cuidado</h2>
          <p className="mt-2 max-w-[760px] text-[13.5px] leading-[1.75] text-apagado">
            Las cuentas las crea cada docente para sus estudiantes; la plataforma no pide correo ni datos de contacto. Lo
            que un estudiante escribe en su diario es privado salvo que decida compartirlo con su docente. Los datos
            sensibles, como la pertenencia a una población víctima, solo se registran con autorización del acudiente y
            solo se muestran agregados (Ley 1581 de 2012).
          </p>
        </section>
      </main>

      <footer className="border-t border-borde bg-[#EFEAE4]">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-3 px-4 py-5 text-[12px] text-apagado md:px-6">
          <span>
            <strong className="text-primario-fuerte">Memoria El Salado</strong> · Preservando la memoria para un futuro mejor.
          </span>
          <a href="https://centrodememoriahistorica.gov.co" target="_blank" rel="noreferrer" className="font-semibold text-apagado hover:text-primario">
            Centro Nacional de Memoria Histórica
          </a>
        </div>
      </footer>
    </div>
  );
}
