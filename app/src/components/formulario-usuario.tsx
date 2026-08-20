"use client";

import { useState } from "react";
import {
  ETIQUETAS_FUERZA,
  LONGITUD_MINIMA,
  evaluarContrasena,
  generarContrasenaTemporal,
} from "@/lib/politica-contrasena";
import { SUBPOBLACIONES } from "@/lib/usuarios";

const COLORES_FUERZA = ["#C0392B", "#C0392B", "#EBB035", "#1B8A8A", "#177575"];

export type Entrega = { nombre: string; usuario: string; contrasena: string };

type Props = {
  /**
   * Contraseña provisional propuesta, sorteada en el servidor para que el
   * primer render coincida con el del navegador.
   */
  sugerencia: string;
  /** Los estudiantes se agrupan además por subpoblación, para los reportes. */
  conSubpoblacion?: boolean;
  titulo: string;
  textoBoton: string;
  pendiente: boolean;
  mensaje?: { ok?: string; error?: string; entrega?: Entrega } | null;
  accion: (formData: FormData) => void;
  formRef: React.RefObject<HTMLFormElement | null>;
};

/**
 * Alta de un usuario.
 *
 * La contraseña no la inventa quien crea la cuenta: la plataforma propone una
 * provisional que ya cumple la política, y quien la crea solo tiene que
 * entregarla. La persona elegirá la suya la primera vez que entre.
 */
export function FormularioUsuario({
  sugerencia,
  conSubpoblacion = false,
  titulo,
  textoBoton,
  pendiente,
  mensaje,
  accion,
  formRef,
}: Props) {
  const [nombre, setNombre] = useState("");
  const [usuario, setUsuario] = useState("");
  const [contrasena, setContrasena] = useState(sugerencia);
  const [visible, setVisible] = useState(true);

  const revision = evaluarContrasena(contrasena, [nombre, usuario]);
  const mostrarRevision = contrasena.length > 0 && !revision.valida;

  function limpiar() {
    setNombre("");
    setUsuario("");
    setContrasena(generarContrasenaTemporal());
  }

  return (
    <form
      ref={formRef}
      action={(fd) => {
        accion(fd);
        limpiar();
      }}
      className="rounded-xl border border-borde bg-superficie p-5"
    >
      <div className="text-[12.5px] font-extrabold tracking-[.05em] text-primario-fuerte">
        {titulo}
      </div>

      <label htmlFor="nombre" className="mt-3.5 block text-[10px] font-bold tracking-[.12em] text-tenue">
        NOMBRE COMPLETO
      </label>
      <input
        id="nombre"
        name="nombre"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="ej. Liliana Ramírez"
        className="mt-1.5 w-full rounded-lg border border-borde-campo bg-superficie-suave px-3 py-2.5 text-[13px]"
      />

      <label htmlFor="usuario" className="mt-3 block text-[10px] font-bold tracking-[.12em] text-tenue">
        USUARIO
      </label>
      <input
        id="usuario"
        name="usuario"
        value={usuario}
        onChange={(e) => setUsuario(e.target.value)}
        placeholder="ej. liliana.ramirez"
        autoComplete="off"
        className="mt-1.5 w-full rounded-lg border border-borde-campo bg-superficie-suave px-3 py-2.5 text-[13px]"
      />

      {conSubpoblacion && (
        <>
          <label
            htmlFor="subpoblacion"
            className="mt-3 block text-[10px] font-bold tracking-[.12em] text-tenue"
          >
            SUBPOBLACIÓN
          </label>
          <select
            id="subpoblacion"
            name="subpoblacion"
            defaultValue={SUBPOBLACIONES[SUBPOBLACIONES.length - 1]}
            className="mt-1.5 w-full rounded-lg border border-borde-campo bg-superficie-suave px-3 py-2.5 text-[13px]"
          >
            {SUBPOBLACIONES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-[11px] text-suave">
            Se usa solo para los reportes diferenciados; no se muestra a los demás estudiantes.
          </p>
        </>
      )}

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <label htmlFor="contrasena" className="text-[10px] font-bold tracking-[.12em] text-tenue">
          CONTRASEÑA PROVISIONAL
        </label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setContrasena(generarContrasenaTemporal())}
            className="cursor-pointer text-[11px] font-semibold text-apagado hover:text-primario"
          >
            Generar otra
          </button>
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="cursor-pointer text-[11px] font-semibold text-apagado hover:text-primario"
          >
            {visible ? "Ocultar" : "Mostrar"}
          </button>
        </div>
      </div>
      <input
        id="contrasena"
        name="contrasena"
        type={visible ? "text" : "password"}
        value={contrasena}
        onChange={(e) => setContrasena(e.target.value)}
        autoComplete="off"
        spellCheck={false}
        className="mt-1.5 w-full rounded-lg border border-borde-campo bg-superficie-suave px-3 py-2.5 font-mono text-[13px]"
      />

      {mostrarRevision ? (
        <div className="mt-2">
          <div className="flex items-center gap-2">
            <div className="flex h-1.5 flex-1 gap-1">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-full flex-1 rounded-full"
                  style={{
                    background: i < revision.fuerza ? COLORES_FUERZA[revision.fuerza] : "#F0EAE4",
                  }}
                />
              ))}
            </div>
            <span
              className="text-[10.5px] font-bold"
              style={{ color: COLORES_FUERZA[revision.fuerza] }}
            >
              {ETIQUETAS_FUERZA[revision.fuerza]}
            </span>
          </div>
          <ul className="mt-2 grid gap-1">
            {revision.errores.map((e) => (
              <li key={e} className="text-[11px] leading-[1.4] text-peligro">
                · {e}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-2 text-[11px] leading-[1.5] text-suave">
          Entrégasela a la persona junto con su usuario. La plataforma le pedirá cambiarla por una
          suya la primera vez que entre. Si prefieres escribir otra, debe tener al menos{" "}
          {LONGITUD_MINIMA} caracteres, con mayúscula, minúscula, número y símbolo.
        </p>
      )}

      <button
        type="submit"
        disabled={pendiente || !revision.valida}
        className="mt-4 w-full cursor-pointer rounded-lg bg-primario-fuerte px-4 py-3 text-[13px] font-bold text-white hover:bg-primario-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pendiente ? "Creando..." : textoBoton}
      </button>

      {mensaje?.entrega && <Credenciales entrega={mensaje.entrega} />}

      {mensaje?.ok && !mensaje.entrega && (
        <div role="status" className="mt-2.5 text-[11.5px] font-semibold text-secundario-fuerte">
          {mensaje.ok}
        </div>
      )}
      {mensaje?.error && (
        <div role="alert" className="mt-2.5 text-[11.5px] font-semibold text-peligro">
          {mensaje.error}
        </div>
      )}
    </form>
  );
}

/** Resumen de lo que hay que entregarle a la persona recién dada de alta. */
function Credenciales({ entrega }: { entrega: Entrega }) {
  const [copiado, setCopiado] = useState(false);

  const texto = `Usuario: ${entrega.usuario}\nContraseña provisional: ${entrega.contrasena}`;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <div
      role="status"
      className="mt-3.5 rounded-[10px] border border-secundario-borde bg-secundario-tinte p-3.5"
    >
      <div className="text-[10px] font-bold tracking-[.12em] text-secundario-fuerte">
        CREDENCIALES PARA ENTREGAR
      </div>
      <div className="mt-2 text-[12.5px] font-bold text-[#2E5E5C]">{entrega.nombre}</div>
      <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-2.5 gap-y-1 text-[12px] text-[#3F6E6C]">
        <dt className="font-semibold">Usuario</dt>
        <dd className="font-mono break-all">{entrega.usuario}</dd>
        <dt className="font-semibold">Contraseña</dt>
        <dd className="font-mono break-all">{entrega.contrasena}</dd>
      </dl>
      <p className="mt-2 text-[11px] leading-[1.5] text-[#5A8280]">
        Anótala antes de cerrar esta pantalla: no vuelve a mostrarse. Al entrar, la plataforma le
        pedirá cambiarla por una que solo esa persona conozca.
      </p>
      <button
        type="button"
        onClick={copiar}
        className="mt-2.5 cursor-pointer rounded-lg border border-secundario bg-superficie px-3 py-1.5 text-[11.5px] font-bold text-secundario-fuerte hover:bg-secundario-tinte"
      >
        {copiado ? "Copiado" : "Copiar credenciales"}
      </button>
    </div>
  );
}
