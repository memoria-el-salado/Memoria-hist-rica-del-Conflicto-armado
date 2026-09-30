/**
 * Archivos de prueba generados en el momento: nada se descarga. Son pequeños
 * pero reales, para que el navegador pueda reproducirlos y mostrarlos.
 */
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { crc32, deflateSync } from "node:zlib";

/** Dos segundos de un tono de 440 Hz, en WAV. Lo bastante real para reproducirse. */
export function audioWav() {
  const frecuencia = 8000, muestras = frecuencia * 2;
  const datos = Buffer.alloc(muestras * 2);
  for (let i = 0; i < muestras; i++) datos.writeInt16LE(Math.round(8000 * Math.sin((2 * Math.PI * 440 * i) / frecuencia)), i * 2);
  const cabecera = Buffer.alloc(44);
  cabecera.write("RIFF", 0); cabecera.writeUInt32LE(36 + datos.length, 4); cabecera.write("WAVE", 8);
  cabecera.write("fmt ", 12); cabecera.writeUInt32LE(16, 16); cabecera.writeUInt16LE(1, 20); cabecera.writeUInt16LE(1, 22);
  cabecera.writeUInt32LE(frecuencia, 24); cabecera.writeUInt32LE(frecuencia * 2, 28); cabecera.writeUInt16LE(2, 32);
  cabecera.writeUInt16LE(16, 34); cabecera.write("data", 36); cabecera.writeUInt32LE(datos.length, 40);
  return Buffer.concat([cabecera, datos]);
}

/** Una imagen PNG de 16×16 en el terracota de la plataforma. */
export function imagenPng() {
  const trozo = (tipo, datos) => {
    const t = Buffer.from(tipo);
    const largo = Buffer.alloc(4); largo.writeUInt32BE(datos.length);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, datos])));
    return Buffer.concat([largo, t, datos, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(16, 0); ihdr.writeUInt32BE(16, 4); ihdr[8] = 8; ihdr[9] = 2;
  const fila = Buffer.concat([Buffer.from([0]), Buffer.from(Array(16).fill([0xd9, 0x5d, 0x39]).flat())]);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    trozo("IHDR", ihdr),
    trozo("IDAT", deflateSync(Buffer.concat(Array(16).fill(fila)))),
    trozo("IEND", Buffer.alloc(0)),
  ]);
}


/** Escribe los archivos en la carpeta temporal y devuelve sus rutas. */
export function archivosDePrueba() {
  const audio = join(tmpdir(), "testimonio-prueba.wav");
  const imagen = join(tmpdir(), "foto-prueba.png");
  writeFileSync(audio, audioWav());
  writeFileSync(imagen, imagenPng());
  return { audio, imagen };
}
