"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MapaLeaflet, Marker } from "leaflet";
import { CONTORNO_COLOMBIA, type Coordenada } from "@/lib/datos-geograficos";
import { MapaRespaldo } from "./mapa-respaldo";

export type Punto = {
  id: string;
  lat: number;
  lon: number;
  etiqueta: string;
  destacado?: boolean;
};

type Props = {
  centro: Coordenada;
  zoom: number;
  puntos: Punto[];
  /** Punto provisional que el usuario acaba de marcar y aún no ha guardado. */
  provisional?: { lat: number; lon: number; etiqueta: string } | null;
  onClick?: (lat: number, lon: number) => void;
  alto?: number;
  etiquetaAccesible: string;
  /** Dibuja el contorno del país; útil en la vista de casos de estudio. */
  mostrarContornoPais?: boolean;
};

/**
 * Mapa real sobre OpenStreetMap. Si los mosaicos no cargan —sin conexión o
 * red bloqueada— se sustituye por un mapa de respaldo dibujado con datos
 * geográficos incluidos en la aplicación, para que la actividad siga siendo
 * usable y las coordenadas sigan siendo reales.
 */
export function MapaReal(props: Props) {
  const { centro, zoom, puntos, provisional, onClick, alto = 420, etiquetaAccesible } = props;

  const contenedor = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<MapaLeaflet | null>(null);
  const marcadores = useRef<Marker[]>([]);
  // El encuadre automático se aplica una sola vez, para no pelear con el usuario.
  const encuadrado = useRef(false);
  const [sinMosaicos, setSinMosaicos] = useState(false);
  const [listo, setListo] = useState(false);

  // El manejador se guarda en una referencia para no recrear el mapa cada vez
  // que cambia; se actualiza en un efecto, nunca durante el renderizado.
  const alHacerClic = useRef(onClick);
  useEffect(() => {
    alHacerClic.current = onClick;
  }, [onClick]);

  useEffect(() => {
    let cancelado = false;
    let mapa: MapaLeaflet | null = null;

    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (cancelado || !contenedor.current || mapaRef.current) return;

      mapa = L.map(contenedor.current, {
        center: centro,
        zoom,
        scrollWheelZoom: false,
        attributionControl: true,
      });
      mapaRef.current = mapa;

      const capa = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: "&copy; colaboradores de OpenStreetMap",
      });

      // Si ningún mosaico llega, se cambia al mapa de respaldo.
      let mosaicosOk = false;
      capa.on("tileload", () => {
        mosaicosOk = true;
      });
      capa.on("tileerror", () => {
        if (!mosaicosOk && !cancelado) setSinMosaicos(true);
      });
      const espera = setTimeout(() => {
        if (!mosaicosOk && !cancelado) setSinMosaicos(true);
      }, 6000);

      capa.addTo(mapa);

      if (props.mostrarContornoPais) {
        L.polygon(CONTORNO_COLOMBIA, {
          color: "#B8482A",
          weight: 1.5,
          fillColor: "#D95D39",
          fillOpacity: 0.06,
        }).addTo(mapa);
      }

      mapa.on("click", (e) => {
        alHacerClic.current?.(+e.latlng.lat.toFixed(5), +e.latlng.lng.toFixed(5));
      });

      if (!cancelado) setListo(true);
      return () => clearTimeout(espera);
    })();

    return () => {
      cancelado = true;
      mapa?.remove();
      mapaRef.current = null;
    };
    // El mapa se crea una sola vez; el centro y el zoom iniciales no cambian.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Los marcadores se redibujan cuando cambian los puntos.
  useEffect(() => {
    if (!listo || sinMosaicos) return;
    let cancelado = false;

    (async () => {
      const L = (await import("leaflet")).default;
      const mapa = mapaRef.current;
      if (cancelado || !mapa) return;

      for (const m of marcadores.current) m.remove();
      marcadores.current = [];

      const dibujar = (lat: number, lon: number, etiqueta: string, tenue: boolean, grande: boolean) => {
        const tamano = grande ? 16 : 13;
        const icono = L.divIcon({
          className: "",
          html: `<span style="display:block;width:${tamano}px;height:${tamano}px;border-radius:50%;
            background:${tenue ? "#EBB035" : "#D95D39"};border:2.5px solid #fff;
            box-shadow:0 2px 6px rgba(0,0,0,.3);opacity:${tenue ? 0.85 : 1}"></span>`,
          iconSize: [tamano, tamano],
          iconAnchor: [tamano / 2, tamano / 2],
        });
        const marcador = L.marker([lat, lon], { icon: icono, title: etiqueta })
          .addTo(mapa)
          .bindTooltip(etiqueta, { direction: "right", offset: [8, 0] });
        marcadores.current.push(marcador);
      };

      for (const p of puntos) dibujar(p.lat, p.lon, p.etiqueta, false, !!p.destacado);
      if (provisional) dibujar(provisional.lat, provisional.lon, provisional.etiqueta, true, false);

      // Se encuadra a los puntos existentes para que ninguno quede fuera de vista.
      if (puntos.length && !encuadrado.current) {
        const limites = L.latLngBounds(puntos.map((p) => [p.lat, p.lon] as [number, number]));
        mapa.fitBounds(limites.pad(0.35), { maxZoom: zoom });
        encuadrado.current = true;
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [puntos, provisional, listo, sinMosaicos, zoom]);

  if (sinMosaicos) {
    return (
      <MapaRespaldo
        centro={centro}
        zoom={zoom}
        puntos={puntos}
        provisional={provisional}
        onClick={onClick}
        alto={alto}
        etiquetaAccesible={etiquetaAccesible}
        mostrarContornoPais={props.mostrarContornoPais}
      />
    );
  }

  return (
    <div
      ref={contenedor}
      role="application"
      aria-label={etiquetaAccesible}
      style={{ height: alto }}
      className="w-full overflow-hidden rounded-xl border border-borde bg-[#F4EFE8] [&_.leaflet-container]:font-sans"
    />
  );
}
