import { describe, expect, it } from "vitest";
import {
  extensionParaGuardar,
  incrustable,
  MAXIMO_RECURSO,
  mimeParaGuardar,
  puedeVerRecurso,
  tipoCoincide,
  validarArchivoRecurso,
  validarEnlace,
} from "./recursos";

const MB = 1024 * 1024;
const testimonio = { nombre: "testimonio-el-salado.mp3", tipo: "audio/mpeg", tamano: 8 * MB };

describe("validarArchivoRecurso", () => {
  it("acepta un audio de testimonio", () => {
    expect(validarArchivoRecurso(testimonio, "AUDIO")).toBeNull();
  });

  it("acepta por la extensión aunque el sistema no informe el tipo", () => {
    expect(validarArchivoRecurso({ ...testimonio, tipo: "" }, "AUDIO")).toBeNull();
    expect(validarArchivoRecurso({ nombre: "FOTO.JPG", tipo: "", tamano: MB }, "IMAGEN")).toBeNull();
  });

  it("rechaza un archivo que no corresponde al tipo elegido", () => {
    expect(validarArchivoRecurso(testimonio, "IMAGEN")).toBe(
      "Para una imagen se admiten archivos jpg, jpeg, png, webp, gif."
    );
    expect(validarArchivoRecurso({ nombre: "guia.docx", tipo: "application/msword", tamano: MB }, "DOCUMENTO")).toBe(
      "Para un documento se admiten archivos pdf."
    );
  });

  it("aconseja enlazar un video demasiado pesado", () => {
    const video = { nombre: "documental.mp4", tipo: "video/mp4", tamano: 300 * MB };
    expect(validarArchivoRecurso(video, "VIDEO")).toBe(
      "El archivo pesa 300 MB y el máximo es 50 MB. Para un video largo, súbelo a YouTube o Vimeo y pega el enlace."
    );
    expect(validarArchivoRecurso({ ...video, tamano: MAXIMO_RECURSO }, "VIDEO")).toBeNull();
  });

  it("un simulador no se sube: se enlaza", () => {
    expect(validarArchivoRecurso(testimonio, "SIMULADOR")).toContain("se enlaza");
  });
});

describe("extensionParaGuardar", () => {
  it("conserva la extensión del archivo si es válida", () => {
    expect(extensionParaGuardar(testimonio, "AUDIO")).toBe("mp3");
  });

  it("la deduce del tipo cuando el nombre no la trae", () => {
    expect(extensionParaGuardar({ nombre: "grabacion", tipo: "audio/ogg", tamano: MB }, "AUDIO")).toBe("ogg");
    expect(extensionParaGuardar({ nombre: "foto", tipo: "image/png", tamano: MB }, "IMAGEN")).toBe("png");
  });
});

describe("mimeParaGuardar", () => {
  it("respeta el tipo que informa el navegador si es válido", () => {
    expect(mimeParaGuardar(testimonio, "AUDIO")).toBe("audio/mpeg");
  });

  it("lo deduce de la extensión cuando falta, sin confundir listas", () => {
    expect(mimeParaGuardar({ nombre: "coro.ogg", tipo: "", tamano: MB }, "AUDIO")).toBe("audio/ogg");
    expect(mimeParaGuardar({ nombre: "relato.m4a", tipo: "", tamano: MB }, "AUDIO")).toBe("audio/mp4");
    expect(mimeParaGuardar({ nombre: "entrevista.mov", tipo: "", tamano: MB }, "VIDEO")).toBe("video/quicktime");
    expect(mimeParaGuardar({ nombre: "foto.jpeg", tipo: "", tamano: MB }, "IMAGEN")).toBe("image/jpeg");
  });

  it("decide si un .webm es audio o video por el tipo de recurso", () => {
    expect(mimeParaGuardar({ nombre: "a.webm", tipo: "", tamano: MB }, "AUDIO")).toBe("audio/webm");
    expect(mimeParaGuardar({ nombre: "a.webm", tipo: "", tamano: MB }, "VIDEO")).toBe("video/webm");
  });
});

describe("tipoCoincide", () => {
  it("compara lo que quedó en el depósito con el tipo del recurso", () => {
    expect(tipoCoincide("audio/mpeg", "AUDIO")).toBe(true);
    expect(tipoCoincide("application/pdf; charset=binary", "DOCUMENTO")).toBe(true);
    expect(tipoCoincide("text/html", "AUDIO")).toBe(false);
  });
});

describe("incrustable", () => {
  it("reconoce las formas de enlace de YouTube y usa el dominio sin cookies", () => {
    const esperado = { proveedor: "YouTube", url: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ" };
    for (const enlace of [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtube.com/watch?v=dQw4w9WgXcQ&t=42s",
      "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ",
      "https://www.youtube.com/shorts/dQw4w9WgXcQ",
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    ]) {
      expect(incrustable(enlace)).toEqual(esperado);
    }
  });

  it("reconoce Vimeo", () => {
    expect(incrustable("https://vimeo.com/76979871")).toEqual({
      proveedor: "Vimeo",
      url: "https://player.vimeo.com/video/76979871",
    });
  });

  it("no incrusta lo que no es de esos proveedores ni identificadores raros", () => {
    expect(incrustable("https://centrodememoriahistorica.gov.co/el-salado")).toBeNull();
    expect(incrustable("https://www.youtube.com/watch?v=<script>")).toBeNull();
    expect(incrustable("no es una dirección")).toBeNull();
  });
});

describe("validarEnlace", () => {
  it("exige una dirección https", () => {
    expect(validarEnlace("https://youtu.be/dQw4w9WgXcQ")).toBeNull();
    expect(validarEnlace("http://ejemplo.com")).toBe("La dirección tiene que empezar por https://.");
    expect(validarEnlace("javascript:alert(1)")).not.toBeNull();
    expect(validarEnlace("")).toBe("Pega la dirección del recurso.");
  });
});

describe("puedeVerRecurso", () => {
  it("el docente y el administrador lo ven todo", () => {
    expect(puedeVerRecurso("DOCENTE", { casoActivo: false, sesionPublicada: false })).toBe(true);
    expect(puedeVerRecurso("ADMIN", { casoActivo: false, sesionPublicada: null })).toBe(true);
  });

  it("el estudiante ve el material del módulo activo", () => {
    expect(puedeVerRecurso("ESTUDIANTE", { casoActivo: true, sesionPublicada: null })).toBe(true);
    expect(puedeVerRecurso("ESTUDIANTE", { casoActivo: true, sesionPublicada: true })).toBe(true);
  });

  it("pero no el de una sesión sin publicar ni el de otro módulo", () => {
    expect(puedeVerRecurso("ESTUDIANTE", { casoActivo: true, sesionPublicada: false })).toBe(false);
    expect(puedeVerRecurso("ESTUDIANTE", { casoActivo: false, sesionPublicada: null })).toBe(false);
  });
});
