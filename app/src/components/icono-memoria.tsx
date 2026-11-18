/**
 * El ícono de la plataforma: un libro abierto del que brota una hoja, la
 * memoria que se lee y vuelve a crecer. Es el mismo dibujo de `app/icon.svg`
 * (la pestaña del navegador); aquí va sin fondo, del color del texto.
 */
export function IconoMemoria({ tamano = 18, className }: { tamano?: number; className?: string }) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="10 9 44 44"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M32 27c-5-3.6-11.5-4.6-19-3.6v25c7.5-1 14 0 19 3.6c5-3.6 11.5-4.6 19-3.6v-25c-7.5-1-14 0-19 3.6z" />
      <path d="M32 27v25M32 27v-6" />
      <path d="M32 21c0-5 3.6-8.2 8.8-8.4c-.2 5.2-3.6 8.4-8.8 8.4z" fill="currentColor" />
      <path d="M32 22.5c0-3.6-2.6-6-6.4-6.1c.1 3.8 2.6 6.1 6.4 6.1z" fill="currentColor" />
    </svg>
  );
}
