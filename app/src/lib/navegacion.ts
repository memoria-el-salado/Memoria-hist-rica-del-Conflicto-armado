import type { Rol } from "@prisma/client";

export type ItemNav = {
  href: string;
  label: string;
  icon: string;
  titulo: string;
};

export const NAV_POR_ROL: Record<Rol, ItemNav[]> = {
  // Las actividades no son destinos fijos del menú: se abren desde el mapa, y
  // cuál se muestra depende de la sesión. Solo el mapa y el diario personal
  // existen con independencia del módulo que esté activo.
  ESTUDIANTE: [
    { href: "/estudiante/mapa", label: "Mapa del Viaje", icon: "M9 3 3 6v15l6-3 6 3 6-3V3l-6 3-6-3v15", titulo: "Ruta Pedagógica · Mapa del Viaje" },
    { href: "/estudiante/diario", label: "Mi Diario", icon: "M4 4h13a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2zM8 4v16", titulo: "Espacio privado · Diario de la Memoria" },
  ],
  DOCENTE: [
    { href: "/docente/panel", label: "Panel del Docente", icon: "M3 3h8v8H3zM13 3h8v5h-8zM13 12h8v9h-8zM3 15h8v6H3z", titulo: "LMS · Panel de seguimiento" },
    { href: "/docente/contenidos", label: "Gestión de Contenido", icon: "M4 6h16M4 12h16M4 18h10", titulo: "LCMS · Repositorio de recursos" },
    { href: "/docente/foros", label: "Debates y Foros", icon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z", titulo: "LMS · Mediación de debates" },
    { href: "/docente/subpoblaciones", label: "Subpoblaciones", icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.9", titulo: "LMS · Reportes diferenciados" },
    { href: "/docente/estudiantes", label: "Mis Estudiantes", icon: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M19 8v6M22 11h-6", titulo: "Gestión de cuentas · Estudiantes" },
  ],
  ADMIN: [
    { href: "/admin/docentes", label: "Docentes", icon: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M19 8v6M22 11h-6", titulo: "Gestión de cuentas · Docentes" },
    { href: "/admin/casos", label: "Módulos Geográficos", icon: "M12 21s7-6.5 7-11a7 7 0 1 0-14 0c0 4.5 7 11 7 11z", titulo: "Sistema · Arquitectura modular" },
    { href: "/admin/importar", label: "Importar Módulo", icon: "M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2", titulo: "Sistema · Importación desde documentos" },
    { href: "/admin/accesibilidad", label: "Accesibilidad", icon: "M12 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4M4 8h16M12 8v6m0 0-3 8m3-8 3 8", titulo: "Sistema · Auditoría WCAG" },
  ],
};

export const INICIO_POR_ROL: Record<Rol, string> = {
  ESTUDIANTE: "/estudiante/mapa",
  DOCENTE: "/docente/panel",
  ADMIN: "/admin/docentes",
};

export const ETIQUETA_ROL: Record<Rol, string> = {
  ESTUDIANTE: "Estudiante",
  DOCENTE: "Docente",
  ADMIN: "Administrador",
};

export const PREFIJO_POR_ROL: Record<Rol, string> = {
  ESTUDIANTE: "/estudiante",
  DOCENTE: "/docente",
  ADMIN: "/admin",
};

export function tituloDeRuta(rol: Rol, pathname: string): string {
  return NAV_POR_ROL[rol].find((i) => i.href === pathname)?.titulo ?? "";
}
