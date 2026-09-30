import { describe, expect, it } from "vitest";
import { extensionImagen, LIMITES_FLOR, textoAlternativo, validarFlor, validarImagenFlor } from "./jardin";

const base = { nombre: "Margoth Fernández Ochoa", legado: "Maestra de la escuela de El Salado.", conImagen: false };

describe("validarFlor", () => {
  it("una flor sola necesita nombre y legado", () => {
    expect(validarFlor({ ...base, creacion: "NINGUNA" })).toBeNull();
    expect(validarFlor({ ...base, nombre: " ", creacion: "NINGUNA" })).toBe("Escribe el nombre de la persona que quieres honrar.");
    expect(validarFlor({ ...base, legado: "", creacion: "NINGUNA" })).toBe("Escribe el legado que quieres honrar.");
  });

  it("una carta o un poema necesitan su texto", () => {
    expect(validarFlor({ ...base, creacion: "CARTA", texto: "" })).toBe("Escribe la carta antes de sembrar.");
    expect(validarFlor({ ...base, creacion: "POEMA", texto: "corto" })).toBe("Escribe el poema antes de sembrar.");
    expect(validarFlor({ ...base, creacion: "POEMA", texto: "Tu voz sigue\nen la plaza\ncuando llueve." })).toBeNull();
  });

  it("y tienen un tope", () => {
    expect(validarFlor({ ...base, creacion: "CARTA", texto: "a".repeat(LIMITES_FLOR.textoMaximo + 1) })).toMatch(/no puede pasar/);
  });

  it("un dibujo o una foto necesitan su imagen", () => {
    expect(validarFlor({ ...base, creacion: "DIBUJO" })).toBe("Haz tu dibujo antes de sembrar.");
    expect(validarFlor({ ...base, creacion: "FOTO" })).toBe("Añade la foto antes de sembrar.");
    expect(validarFlor({ ...base, creacion: "DIBUJO", conImagen: true })).toBeNull();
  });

  it("no mezcla: ni texto con imagen ni imagen con texto", () => {
    expect(validarFlor({ ...base, creacion: "DIBUJO", conImagen: true, texto: "hola a todos" })).toBe("El texto solo acompaña a una carta o a un poema.");
    expect(validarFlor({ ...base, creacion: "CARTA", texto: "Querida maestra...", conImagen: true })).toBe("La imagen solo acompaña a un dibujo o a una foto.");
  });
});

describe("validarImagenFlor", () => {
  it("el dibujo en PNG y la foto en JPEG", () => {
    expect(validarImagenFlor("DIBUJO", { mime: "image/png", tamano: 90_000 })).toBeNull();
    expect(validarImagenFlor("FOTO", { mime: "image/jpeg", tamano: 400_000 })).toBeNull();
  });

  it("rechaza formatos, vacíos y excesos", () => {
    expect(validarImagenFlor("FOTO", { mime: "image/heic", tamano: 1000 })).toMatch(/no se puede usar/);
    expect(validarImagenFlor("DIBUJO", { mime: "image/png", tamano: 0 })).toBe("La imagen está vacía.");
    expect(validarImagenFlor("DIBUJO", { mime: "image/png", tamano: LIMITES_FLOR.dibujoBytes + 1 })).toBe("La imagen pesa demasiado.");
    expect(validarImagenFlor("CARTA", { mime: "image/png", tamano: 10 })).toBe("Esta creación no lleva imagen.");
  });

  it("reconoce la extensión", () => {
    expect(extensionImagen("image/png")).toBe("png");
    expect(extensionImagen("image/jpeg")).toBe("jpg");
    expect(extensionImagen("text/html")).toBeNull();
  });
});

describe("textoAlternativo", () => {
  it("usa la descripción del autor si la hay", () => {
    expect(textoAlternativo({ creacion: "DIBUJO", nombre: "Margoth", descripcion: "Una escuela con árboles" })).toBe("Una escuela con árboles");
  });

  it("si no, dice qué es y a quién honra", () => {
    expect(textoAlternativo({ creacion: "DIBUJO", nombre: "Margoth" })).toBe("Dibujo en memoria de Margoth");
    expect(textoAlternativo({ creacion: "FOTO", nombre: "Margoth", descripcion: "  " })).toBe("Obra en memoria de Margoth");
  });
});
