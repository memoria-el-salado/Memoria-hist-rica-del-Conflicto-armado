"use client";

import { useEffect, useRef, useState } from "react";

/** Colores de la paleta de la plataforma, más el blanco para borrar. */
const COLORES = [
  { valor: "#33302C", nombre: "Negro" },
  { valor: "#D95D39", nombre: "Terracota" },
  { valor: "#1B8A8A", nombre: "Verde azulado" },
  { valor: "#EBB035", nombre: "Amarillo" },
  { valor: "#4F8A3C", nombre: "Verde" },
  { valor: "#7A4E9C", nombre: "Morado" },
];
const BORRADOR = "#FFFFFF";
const GROSORES = [
  { valor: 3, nombre: "Fino" },
  { valor: 8, nombre: "Medio" },
  { valor: 16, nombre: "Grueso" },
];
const ANCHO = 900;
const ALTO = 600;
const DESHACER_MAXIMO = 20;

/** Fondo blanco: un PNG transparente se vería negro en algunos visores. */
function pintarFondo(lienzo: HTMLCanvasElement) {
  const ctx = lienzo.getContext("2d")!;
  ctx.fillStyle = BORRADOR;
  ctx.fillRect(0, 0, ANCHO, ALTO);
}

/**
 * Un lienzo para dibujar con el ratón, el dedo o un lápiz. Cada trazo
 * terminado entrega el dibujo en PNG; «Borrar todo» lo quita.
 *
 * Dibujar exige señalar con precisión, así que quien no puede hacerlo tiene
 * la opción de subir la foto de un dibujo hecho en papel.
 */
export function LienzoDibujo({ onCambio }: { onCambio: (dibujo: Blob | null) => void }) {
  const lienzo = useRef<HTMLCanvasElement>(null);
  const trazando = useRef<{ x: number; y: number } | null>(null);
  const historial = useRef<ImageData[]>([]);
  const [color, setColor] = useState(COLORES[0].valor);
  const [grosor, setGrosor] = useState(GROSORES[1].valor);
  const [pasos, setPasos] = useState(0);

  const contexto = () => lienzo.current!.getContext("2d")!;

  useEffect(() => pintarFondo(lienzo.current!), []);

  function punto(e: React.PointerEvent<HTMLCanvasElement>) {
    const caja = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - caja.left) * ANCHO) / caja.width, y: ((e.clientY - caja.top) * ALTO) / caja.height };
  }

  function entregar() {
    lienzo.current!.toBlob((b) => onCambio(b), "image/png");
  }

  function empezar(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    historial.current = [...historial.current, contexto().getImageData(0, 0, ANCHO, ALTO)].slice(-DESHACER_MAXIMO);
    trazando.current = punto(e);
    // Un toque sin arrastrar deja un punto.
    mover(e);
  }

  function mover(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!trazando.current) return;
    const ctx = contexto();
    const destino = punto(e);
    ctx.strokeStyle = color;
    ctx.lineWidth = color === BORRADOR ? grosor * 2 : grosor;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(trazando.current.x, trazando.current.y);
    ctx.lineTo(destino.x + 0.01, destino.y + 0.01);
    ctx.stroke();
    trazando.current = destino;
  }

  function terminar() {
    if (!trazando.current) return;
    trazando.current = null;
    setPasos((n) => n + 1);
    entregar();
  }

  function deshacer() {
    const anterior = historial.current.pop();
    if (!anterior) return;
    contexto().putImageData(anterior, 0, 0);
    const quedan = pasos - 1;
    setPasos(quedan);
    if (quedan > 0) entregar();
    else onCambio(null);
  }

  function borrarTodo() {
    historial.current = [];
    pintarFondo(lienzo.current!);
    setPasos(0);
    onCambio(null);
  }

  const boton = (activo: boolean) =>
    `cursor-pointer rounded-full border px-2.5 py-1 text-[11px] font-bold ${
      activo ? "border-secundario bg-secundario text-white" : "border-borde-campo bg-superficie text-apagado"
    }`;

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Color del lápiz">
        {COLORES.map((c) => (
          <button
            key={c.valor}
            type="button"
            aria-pressed={color === c.valor}
            aria-label={c.nombre}
            title={c.nombre}
            onClick={() => setColor(c.valor)}
            className={`h-7 w-7 cursor-pointer rounded-full border-2 ${color === c.valor ? "border-tinta" : "border-white shadow-[0_0_0_1px_#E4DDD6]"}`}
            style={{ background: c.valor }}
          />
        ))}
        <button type="button" aria-pressed={color === BORRADOR} onClick={() => setColor(BORRADOR)} className={boton(color === BORRADOR)}>
          Borrador
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Grosor del trazo">
        {GROSORES.map((g) => (
          <button key={g.valor} type="button" aria-pressed={grosor === g.valor} onClick={() => setGrosor(g.valor)} className={boton(grosor === g.valor)}>
            {g.nombre}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-borde" aria-hidden="true" />
        <button type="button" onClick={deshacer} disabled={pasos === 0} className="cursor-pointer text-[11.5px] font-bold text-secundario-fuerte disabled:opacity-40">
          Deshacer
        </button>
        <button type="button" onClick={borrarTodo} disabled={pasos === 0} className="cursor-pointer text-[11.5px] font-bold text-apagado hover:text-peligro disabled:opacity-40">
          Borrar todo
        </button>
      </div>
      <canvas
        ref={lienzo}
        width={ANCHO}
        height={ALTO}
        role="img"
        aria-label="Lienzo de dibujo. Dibuja con el ratón, el dedo o un lápiz."
        onPointerDown={empezar}
        onPointerMove={mover}
        onPointerUp={terminar}
        onPointerCancel={terminar}
        className="aspect-[3/2] w-full cursor-crosshair touch-none rounded-lg border border-borde-campo bg-white"
      />
      <p className="text-[11px] text-suave">¿Prefieres dibujar en papel? Elige «Foto de un dibujo o una obra» y súbela.</p>
    </div>
  );
}
