import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { MapaViaje } from "./mapa-viaje";

export default async function MapaPage() {
  const sesion = await auth();
  const userId = sesion!.user.id;

  const [ejes, progresos, casos, anotaciones, marcas, simulaciones, flores] = await Promise.all([
    prisma.eje.findMany({
      where: { caso: { activo: true } },
      orderBy: { orden: "asc" },
      include: {
        sesiones: {
          orderBy: { orden: "asc" },
          include: { subsecciones: { orderBy: { orden: "asc" } } },
        },
      },
    }),
    prisma.progresoEje.findMany({ where: { userId } }),
    prisma.caso.findMany({ orderBy: { creadoEn: "asc" } }),
    prisma.anotacion.count({ where: { autorId: userId } }),
    prisma.marcaCartografia.count({ where: { autorId: userId } }),
    prisma.simulacion.findMany({ where: { userId, validadaEn: { not: null } } }),
    prisma.florJardin.count({ where: { autorId: userId } }),
  ]);

  const porEje = new Map(progresos.map((p) => [p.ejeId, p.porcentaje]));

  const datos = ejes.map((e) => ({
    id: e.id,
    numero: e.numero,
    nombre: e.nombre,
    descripcion: e.descripcion,
    objetivoGeneral: e.objetivoGeneral,
    esPreambulo: e.esPreambulo,
    tono: e.tono,
    progreso: porEje.get(e.id) ?? 0,
    sesiones: e.sesiones.map((s) => ({
      id: s.id,
      codigo: s.codigo,
      titulo: s.titulo,
      objetivo: s.objetivo,
      tipo: s.tipo,
      pantalla: s.pantalla,
      publicada: s.publicada,
      // Con el texto del documento la sesión se puede leer; sin él, el
      // estudiante solo dispone del esquema de subsecciones.
      tieneContenido: Boolean(s.contenido?.trim()),
      subsecciones: s.subsecciones.map((sub) => ({ codigo: sub.codigo, titulo: sub.titulo })),
    })),
  }));

  // Solo se ubican en el mapa los casos que tienen coordenadas registradas.
  const estaciones = casos
    .filter((c) => c.lat !== null && c.lon !== null)
    .map((c) => ({
      id: c.id,
      nombre: c.nombre,
      lat: c.lat!,
      lon: c.lon!,
      activo: c.activo,
    }));

  // Indicadores calculados sobre la participación real del estudiante.
  const indicadores = [
    { nombre: "APORTES AL ARCHIVO", valor: anotaciones, color: "#D95D39" },
    { nombre: "LUGARES MARCADOS", valor: marcas, color: "#1B8A8A" },
    { nombre: "MEMORIAS SEMBRADAS", valor: flores, color: "#EBB035" },
  ];

  return (
    <MapaViaje
      ejes={datos}
      estaciones={estaciones}
      casosSinUbicar={casos.length - estaciones.length}
      indicadores={indicadores}
      equidad={
        simulaciones.length
          ? Math.round(
              simulaciones.reduce((s, x) => s + x.indiceEquidad, 0) / simulaciones.length
            )
          : null
      }
    />
  );
}
