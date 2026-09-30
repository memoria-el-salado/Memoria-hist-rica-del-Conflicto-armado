/**
 * Sube un archivo a una dirección firmada del depósito e informa del avance.
 *
 * `fetch` no dice cuánto lleva enviado; con una guía de 16 MB o un audio de
 * testimonio y la conexión de un colegio, la subida puede tardar más de un
 * minuto, y sin porcentaje parece colgada.
 */
export function subirConProgreso(
  url: string,
  archivo: Blob,
  tipo: string,
  alAvanzar: (porcentaje: number) => void
): Promise<boolean> {
  return new Promise((resolver) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("content-type", tipo);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) alAvanzar(Math.floor((e.loaded / e.total) * 100));
    };
    xhr.onload = () => resolver(xhr.status >= 200 && xhr.status < 300);
    xhr.onerror = () => resolver(false);
    xhr.send(archivo);
  });
}
