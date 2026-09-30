import { EXPLORADORES, type Explorador } from "@/lib/exploradores";

/**
 * Los exploradores del mockup, dibujados con la paleta de la plataforma. Son
 * ilustraciones sencillas, fáciles de cambiar por las del equipo: basta con
 * sustituir el SVG de cada uno.
 */
const TRAZOS: Record<Explorador, { fondo: string; piel: string; ropa: string; detalle: React.ReactNode }> = {
  CURIOSO: {
    fondo: "#F2C48D",
    piel: "#C98B5E",
    ropa: "#5E7F4B",
    // Sombrero de ala ancha, como el del mockup.
    detalle: (
      <>
        <ellipse cx="50" cy="34" rx="30" ry="6" fill="#C9A36A" />
        <path d="M34 34 Q36 18 50 18 Q64 18 66 34Z" fill="#B88B4E" />
        <rect x="35" y="29" width="30" height="4" fill="#6E4A33" />
      </>
    ),
  },
  INVESTIGADOR: {
    fondo: "#9ED6D2",
    piel: "#E0A77C",
    ropa: "#E0A13C",
    // Lupa en la mano.
    detalle: (
      <>
        <path d="M34 30 Q50 14 66 30 Q64 22 50 20 Q36 22 34 30Z" fill="#33302C" />
        <circle cx="74" cy="72" r="9" fill="none" stroke="#33302C" strokeWidth="3.5" />
        <path d="M68 79 L60 88" stroke="#33302C" strokeWidth="4" strokeLinecap="round" />
      </>
    ),
  },
  GUARDIAN: {
    fondo: "#4A3A33",
    piel: "#B97A52",
    ropa: "#D95D39",
    // Gorra y chaleco: quien cuida la memoria.
    detalle: (
      <>
        <path d="M34 31 Q36 17 50 17 Q64 17 66 31Z" fill="#EBB035" />
        <path d="M60 30 L76 32 L66 34Z" fill="#EBB035" />
        <path d="M38 64 L50 90 L62 64" fill="#B8482A" />
      </>
    ),
  },
  SEMILLERO: {
    fondo: "#3F7D5E",
    piel: "#D69B6F",
    ropa: "#F4EDE3",
    // Gorra y una plántula: quien siembra futuro.
    detalle: (
      <>
        <path d="M34 31 Q36 17 50 17 Q64 17 66 31Z" fill="#EBB035" />
        <path d="M24 28 L38 30 L34 33Z" fill="#EBB035" />
        <path d="M76 90 L76 70" stroke="#2F4A2A" strokeWidth="3" strokeLinecap="round" />
        <path d="M76 76 Q66 70 68 62 Q76 66 76 76 Q86 68 88 60 Q80 60 76 70" fill="#8FC06A" />
      </>
    ),
  },
};

export function AvatarExplorador({ tipo, tamano = 64, conNombre = false }: { tipo: Explorador; tamano?: number; conNombre?: boolean }) {
  const t = TRAZOS[tipo];
  const nombre = EXPLORADORES.find((e) => e.id === tipo)!.nombre;
  return (
    <svg
      viewBox="0 0 100 100"
      width={tamano}
      height={tamano}
      role={conNombre ? "img" : undefined}
      aria-label={conNombre ? `Explorador ${nombre.toLowerCase()}` : undefined}
      aria-hidden={conNombre ? undefined : true}
      className="flex-none rounded-[22%]"
    >
      <rect width="100" height="100" rx="22" fill={t.fondo} />
      {/* Cuerpo */}
      <path d="M22 100 Q24 66 50 64 Q76 66 78 100Z" fill={t.ropa} />
      {/* Cuello y cara */}
      <rect x="44" y="54" width="12" height="12" fill={t.piel} />
      <circle cx="50" cy="42" r="15" fill={t.piel} />
      <circle cx="44.5" cy="43" r="1.8" fill="#33302C" />
      <circle cx="55.5" cy="43" r="1.8" fill="#33302C" />
      <path d="M45 49 Q50 53 55 49" stroke="#33302C" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      {t.detalle}
    </svg>
  );
}
