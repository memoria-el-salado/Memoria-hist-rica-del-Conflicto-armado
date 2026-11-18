import type { Requisito } from "@/lib/transcripcion";

type Fila = {
  id: string;
  titulo: string;
  detalle: string;
  requisito: Requisito;
  alternativa: boolean;
  sincronizada: boolean;
  descripcion: boolean;
  visible: boolean;
  pendiente: string | null;
};

type Props = {
  filas: Fila[];
  ultimaRevision: string;
};

function Estado({ ok, si, no }: { ok: boolean | null; si: string; no: string }) {
  if (ok === null) return <span className="text-[0.65625rem] font-bold text-[#CFC7C0]">NO APLICA</span>;
  return (
    <span className={`text-[0.65625rem] font-extrabold tracking-[.05em] ${ok ? "text-secundario-fuerte" : "text-peligro"}`}>
      {ok ? si : no}
    </span>
  );
}

export function AuditoriaAccesibilidad({ filas, ultimaRevision }: Props) {
  const accesibles = filas.filter((f) => f.alternativa && f.descripcion).length;
  const porcentaje = filas.length ? Math.round((accesibles / filas.length) * 100) : 100;
  const ocultos = filas.filter((f) => !f.visible).length;
  const color = porcentaje >= 90 ? "#177575" : porcentaje >= 70 ? "#886216" : "#C0392B";

  return (
    <div className="animar-aparecer max-w-[1020px]">
      <div className="text-[0.65625rem] font-bold tracking-[.14em] text-primario-texto">CU10 · CALIDAD</div>
      <h1 className="mb-1.5 mt-2 text-[1.625rem] font-extrabold tracking-[-.02em]">
        Accesibilidad del material de clase
      </h1>
      <p className="mb-2 max-w-[700px] text-[0.84375rem] leading-[1.65] text-apagado">
        Aquí se revisa el material multimedia que suben los docentes, no la plataforma. Un audio necesita
        transcripción (WCAG 1.2.1), un video subido, subtítulos sincronizados (WCAG 1.2.2) y una imagen, una
        descripción. Mientras falten, los estudiantes no ven ese recurso; lo corrige el docente que lo cargó.
      </p>
      <p className="mb-5 max-w-[700px] text-[0.78125rem] leading-[1.6] text-suave">
        Es lo que un estudiante con discapacidad auditiva o visual no podría reportar, porque simplemente no
        accede al contenido. La interfaz de la plataforma se audita aparte, con axe-core (WCAG 2.1 AA), en las
        pruebas del proyecto (<code>npm run humo:accesibilidad</code>).
      </p>

      <div className="mb-[18px] flex flex-wrap gap-3.5">
        <div className="min-w-[180px] flex-1 rounded-xl border border-borde bg-superficie p-[18px]">
          <div className="text-[0.625rem] font-bold tracking-[.12em] text-tenue">RECURSOS ACCESIBLES</div>
          <div className="text-[1.875rem] font-extrabold tracking-[-.03em]" style={{ color }}>
            {porcentaje}%
          </div>
          <div className="mt-2 h-[7px] overflow-hidden rounded-[9px] bg-[#F0EAE4]">
            <div className="h-full" style={{ width: `${porcentaje}%`, background: color }} />
          </div>
        </div>

        <div className="min-w-[180px] flex-1 rounded-xl border border-borde bg-superficie p-[18px]">
          <div className="text-[0.625rem] font-bold tracking-[.12em] text-tenue">RECURSOS VALIDADOS</div>
          <div className="text-[1.875rem] font-extrabold tracking-[-.03em]">{filas.length}</div>
          <div className="mt-1.5 text-[0.71875rem] text-suave">
            {ocultos ? `${ocultos} sin publicar hasta que se corrijan` : "Todos visibles para los estudiantes"}
          </div>
        </div>

        <div className="min-w-[180px] flex-1 rounded-xl border border-borde bg-superficie p-[18px]">
          <div className="text-[0.625rem] font-bold tracking-[.12em] text-tenue">EN VIVO</div>
          <p className="mt-1.5 text-[0.75rem] leading-[1.55] text-apagado">
            El estado se calcula cada vez que abres esta página, a partir de lo que tiene cada recurso. No hay que
            ejecutar nada.
          </p>
          <div className="mt-1.5 text-[0.6875rem] text-suave">Último cambio registrado: {ultimaRevision}</div>
        </div>
      </div>

      {filas.length === 0 ? (
        <p className="rounded-xl border border-dashed border-borde-campo p-5 text-[0.8125rem] text-apagado">
          Todavía no hay recursos multimedia cargados.
        </p>
      ) : (
        <div role="region" aria-label="Recursos auditados" tabIndex={0} className="overflow-x-auto rounded-xl border border-borde bg-superficie">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-[2.2fr_1fr_1fr_1fr_1.8fr] gap-2.5 border-b border-[#F1EBE5] bg-superficie-suave px-[18px] py-3 text-[0.625rem] font-bold tracking-[.1em] text-suave">
              <span>CONTENIDO</span>
              <span>ALTERNATIVA</span>
              <span>SINCRONÍA</span>
              <span>ESTUDIANTES</span>
              <span>QUÉ FALTA</span>
            </div>
            {filas.map((f) => (
              <div
                key={f.id}
                className="grid grid-cols-[2.2fr_1fr_1fr_1fr_1.8fr] items-center gap-2.5 border-b border-[#F7F2ED] px-[18px] py-3.5"
              >
                <div>
                  <div className="text-[0.8125rem] font-bold">{f.titulo}</div>
                  <div className="text-[0.6875rem] text-suave">{f.detalle}</div>
                </div>
                <Estado
                  ok={f.requisito === "ninguno" ? f.descripcion : f.alternativa}
                  si={f.requisito === "ninguno" ? "DESCRITO" : "CUMPLE"}
                  no="FALTA"
                />
                {/* Solo falta si el recurso la exige: un video subido. */}
                <Estado
                  ok={f.requisito === "ninguno" ? null : f.sincronizada || f.requisito === "texto"}
                  si={f.sincronizada ? "SINCRONIZADA" : "NO REQUERIDA"}
                  no="FALTA"
                />
                <Estado ok={f.visible} si="LO VEN" no="NO LO VEN" />
                <span className="text-[0.71875rem] text-apagado">{f.pendiente ?? "—"}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
