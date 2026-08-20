"use client";

import { useMemo, useRef } from "react";
import { CONTORNO_COLOMBIA, type Coordenada } from "@/lib/datos-geograficos";

type Props = {
  centro: Coordenada;
  zoom: number;
  puntos: { id: string; lat: number; lon: number; etiqueta: string; destacado?: boolean }[];
  provisional?: { lat: number; lon: number; etiqueta: string } | null;
  onClick?: (lat: number, lon: number) => void;
  alto: number;
  etiquetaAccesible: string;
  mostrarContornoPais?: boolean;
};

const ANCHO = 1000;

/**
 * Mapa de reemplazo cuando no hay conexión y los mosaicos de OpenStreetMap
 * no cargan. No es una ilustración: proyecta coordenadas reales sobre una
 * retícula de latitud y longitud, de modo que los puntos conservan su
 * posición geográfica y la actividad se puede seguir realizando.
 */
export function MapaRespaldo({
  centro,
  zoom,
  puntos,
  provisional,
  onClick,
  alto,
  etiquetaAccesible,
  mostrarContornoPais,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  /**
   * La ventana se ajusta a lo que hay que mostrar —los puntos y, si procede,
   * el contorno del país— para que nada quede fuera del encuadre. Si no hay
   * nada que encuadrar, se usa el centro y el zoom indicados.
   */
  const limites = useMemo(() => {
    const lats: number[] = [];
    const lons: number[] = [];

    for (const p of puntos) {
      lats.push(p.lat);
      lons.push(p.lon);
    }
    if (provisional) {
      lats.push(provisional.lat);
      lons.push(provisional.lon);
    }
    if (mostrarContornoPais) {
      for (const [lat, lon] of CONTORNO_COLOMBIA) {
        lats.push(lat);
        lons.push(lon);
      }
    }

    const porDefecto = 360 / Math.pow(2, zoom - 1);

    if (lats.length === 0) {
      const alturaGrados = porDefecto * (alto / ANCHO);
      return {
        lonMin: centro[1] - porDefecto / 2,
        lonMax: centro[1] + porDefecto / 2,
        latMin: centro[0] - alturaGrados / 2,
        latMax: centro[0] + alturaGrados / 2,
      };
    }

    const margen = 0.18;
    let anchoGrados = Math.max(...lons) - Math.min(...lons);
    let altoGrados = Math.max(...lats) - Math.min(...lats);
    // Un único punto no define extensión: se le da la del zoom pedido.
    if (anchoGrados < 1e-6) anchoGrados = porDefecto;
    if (altoGrados < 1e-6) altoGrados = porDefecto * (alto / ANCHO);

    anchoGrados *= 1 + margen * 2;
    altoGrados *= 1 + margen * 2;

    // Se respeta la proporción del lienzo para no deformar la geografía.
    const proporcion = alto / ANCHO;
    if (altoGrados / anchoGrados < proporcion) altoGrados = anchoGrados * proporcion;
    else anchoGrados = altoGrados / proporcion;

    const lonCentro = (Math.max(...lons) + Math.min(...lons)) / 2;
    const latCentro = (Math.max(...lats) + Math.min(...lats)) / 2;

    return {
      lonMin: lonCentro - anchoGrados / 2,
      lonMax: lonCentro + anchoGrados / 2,
      latMin: latCentro - altoGrados / 2,
      latMax: latCentro + altoGrados / 2,
    };
  }, [puntos, provisional, mostrarContornoPais, centro, zoom, alto]);

  const gradosAncho = limites.lonMax - limites.lonMin;

  const aX = (lon: number) =>
    ((lon - limites.lonMin) / (limites.lonMax - limites.lonMin)) * ANCHO;
  const aY = (lat: number) =>
    ((limites.latMax - lat) / (limites.latMax - limites.latMin)) * alto;

  /**
   * Paso de la retícula: el número redondo más grande que aún divida la
   * ventana visible en al menos tres franjas.
   */
  const paso = useMemo(() => {
    const opciones = [10, 5, 2, 1, 0.5, 0.2, 0.1, 0.05, 0.02, 0.01, 0.005];
    return opciones.find((o) => gradosAncho / o >= 3) ?? 0.001;
  }, [gradosAncho]);

  const meridianos: number[] = [];
  for (let l = Math.ceil(limites.lonMin / paso) * paso; l <= limites.lonMax; l += paso) {
    meridianos.push(+l.toFixed(4));
  }
  const paralelos: number[] = [];
  for (let l = Math.ceil(limites.latMin / paso) * paso; l <= limites.latMax; l += paso) {
    paralelos.push(+l.toFixed(4));
  }

  function clic(e: React.MouseEvent<SVGSVGElement>) {
    if (!onClick || !svgRef.current) return;
    const caja = svgRef.current.getBoundingClientRect();
    const px = ((e.clientX - caja.left) / caja.width) * ANCHO;
    const py = ((e.clientY - caja.top) / caja.height) * alto;
    const lon = limites.lonMin + (px / ANCHO) * (limites.lonMax - limites.lonMin);
    const lat = limites.latMax - (py / alto) * (limites.latMax - limites.latMin);
    onClick(+lat.toFixed(5), +lon.toFixed(5));
  }

  const contorno = CONTORNO_COLOMBIA.map(([lat, lon]) => `${aX(lon)},${aY(lat)}`).join(" ");

  const marca = (
    lat: number,
    lon: number,
    etiqueta: string,
    clave: string,
    tenue: boolean,
    grande: boolean
  ) => {
    const x = aX(lon);
    const y = aY(lat);
    if (x < 0 || x > ANCHO || y < 0 || y > alto) return null;
    return (
      <g key={clave}>
        <circle
          cx={x}
          cy={y}
          r={grande ? 8 : 6.5}
          fill={tenue ? "#EBB035" : "#D95D39"}
          stroke="#fff"
          strokeWidth="2.5"
          opacity={tenue ? 0.85 : 1}
        />
        <text x={x + 12} y={y + 4} fontSize="13" fontWeight="700" fill="#4A423C">
          {etiqueta}
        </text>
      </g>
    );
  };

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-borde bg-[#F4EFE8]">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${ANCHO} ${alto}`}
        onClick={clic}
        role="application"
        aria-label={`${etiquetaAccesible} (modo sin conexión)`}
        style={{ height: alto, cursor: onClick ? "crosshair" : "default" }}
        className="w-full"
        preserveAspectRatio="none"
      >
        <rect width={ANCHO} height={alto} fill="#EFE6D8" />

        {meridianos.map((l) => (
          <g key={`m${l}`}>
            <line x1={aX(l)} y1={0} x2={aX(l)} y2={alto} stroke="rgba(120,100,80,.22)" strokeWidth="1" />
            <text x={aX(l) + 4} y={alto - 6} fontSize="11" fill="#8C8279">
              {l.toFixed(paso < 0.1 ? 3 : paso < 1 ? 2 : 0)}°
            </text>
          </g>
        ))}
        {paralelos.map((l) => (
          <g key={`p${l}`}>
            <line x1={0} y1={aY(l)} x2={ANCHO} y2={aY(l)} stroke="rgba(120,100,80,.22)" strokeWidth="1" />
            <text x={6} y={aY(l) - 5} fontSize="11" fill="#8C8279">
              {l.toFixed(paso < 0.1 ? 3 : paso < 1 ? 2 : 0)}°
            </text>
          </g>
        ))}

        {mostrarContornoPais && (
          <polygon points={contorno} fill="rgba(217,93,57,.10)" stroke="#B8482A" strokeWidth="1.5" />
        )}

        {puntos.map((p) => marca(p.lat, p.lon, p.etiqueta, p.id, false, !!p.destacado))}
        {provisional &&
          marca(provisional.lat, provisional.lon, provisional.etiqueta, "provisional", true, false)}
      </svg>

      <div className="absolute right-2 top-2 rounded-md bg-white/90 px-2.5 py-1 text-[10.5px] font-semibold text-tenue">
        Sin conexión · coordenadas reales
      </div>
    </div>
  );
}
