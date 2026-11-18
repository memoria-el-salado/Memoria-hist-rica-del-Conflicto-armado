/**
 * Las ilustraciones de fondo de la portada. Comparten la paleta y el trazo del
 * paisaje del encabezado (las colinas de los Montes de María, las casas de
 * techo rojo y el campesino con sombrero vueltiao) para que se lean como una
 * misma historia. Son decorativas: el texto de cada recuadro dice lo mismo, así
 * que van ocultas para los lectores de pantalla.
 */

type Props = { className?: string };

const COLINA_CLARA = "#8FA46A";
const COLINA_MEDIA = "#5E7F4B";
const COLINA_OSCURA = "#3F6436";
const PARED = "#F4EDE3";
const TECHO = "#B8482A";
const PIEL = "#B9825A";
const CAMISA = "#F4EDE3";
const PANTALON = "#4A3A2E";

/** El sombrero vueltiao, con sus franjas negras. */
function Sombrero({ x, y, escala = 1 }: { x: number; y: number; escala?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${escala})`}>
      <ellipse cx="0" cy="0" rx="26" ry="6" fill="#EFE3C8" />
      <ellipse cx="0" cy="0" rx="26" ry="6" fill="none" stroke="#2B2420" strokeWidth="2" strokeDasharray="5 4" />
      <path d="M-13 0 Q-12 -17 0 -18 Q12 -17 13 0Z" fill="#EFE3C8" />
      <path d="M-12.5 -5 H12.5 M-12 -10 H12" stroke="#2B2420" strokeWidth="2" />
    </g>
  );
}

/** Un campesino de pie, con sombrero; `brazo` levanta el brazo derecho. */
function Campesino({ x, y, escala = 1, brazo = "abajo", camisa = CAMISA }: { x: number; y: number; escala?: number; brazo?: "abajo" | "arriba" | "adelante"; camisa?: string }) {
  const derecho =
    brazo === "arriba" ? "M8 -38 L22 -62" : brazo === "adelante" ? "M8 -38 L30 -36" : "M8 -38 L12 -14";
  return (
    <g transform={`translate(${x} ${y}) scale(${escala})`}>
      <path d="M-6 -16 L-8 0 M6 -16 L8 0" stroke={PANTALON} strokeWidth="7" strokeLinecap="round" />
      <path d="M-11 -44 Q0 -50 11 -44 L9 -14 H-9Z" fill={camisa} />
      <path d={`M-8 -38 L-12 -14 ${derecho}`} stroke={PIEL} strokeWidth="5" strokeLinecap="round" fill="none" />
      <circle cx="0" cy="-54" r="8" fill={PIEL} />
      <Sombrero x={0} y={-58} escala={0.62} />
    </g>
  );
}

/** Colinas en tres planos, como en el paisaje del encabezado. */
function Colinas({ base = 0 }: { base?: number }) {
  return (
    <g transform={`translate(0 ${base})`}>
      <path d="M0 150 Q90 80 190 135 T400 120 V300 H0Z" fill={COLINA_CLARA} />
      <path d="M0 185 Q120 125 240 175 T400 165 V300 H0Z" fill={COLINA_MEDIA} />
    </g>
  );
}

/** Archivo y testimonios: la mesa de la memoria, con fotos, cartas, una grabadora y una abuela que cuenta. */
export function IlustracionArchivo({ className }: Props) {
  return (
    <svg viewBox="0 0 300 420" preserveAspectRatio="xMidYMin slice" aria-hidden="true" focusable="false" className={className}>
      <rect width="300" height="420" fill="#5A3627" />
      {/* Pared con fotos enmarcadas y cuerda de recuerdos */}
      <path d="M20 40 Q150 70 280 40" stroke="#D9B98C" strokeWidth="2" fill="none" />
      {[
        [40, 46, -6, "#E7D3B0"],
        [110, 60, 4, "#F0E2C4"],
        [180, 60, -3, "#E7D3B0"],
        [240, 47, 7, "#F0E2C4"],
      ].map(([x, y, r, c]) => (
        <g key={`${x}`} transform={`translate(${x} ${y}) rotate(${r})`}>
          <rect x="-20" y="0" width="40" height="48" fill={c as string} />
          <rect x="-15" y="5" width="30" height="30" fill="#8C6A4E" />
          <circle cx="0" cy="16" r="6" fill="#C9A27A" />
          <path d="M-9 35 Q0 22 9 35Z" fill="#C9A27A" />
          <circle cx="0" cy="-2" r="2" fill="#B8482A" />
        </g>
      ))}
      {/* Ventana con las colinas */}
      <rect x="196" y="130" width="78" height="64" rx="4" fill="#F2C48D" />
      <path d="M196 175 Q225 150 250 168 T274 165 V194 H196Z" fill={COLINA_MEDIA} />
      <path d="M235 130 V194 M196 162 H274" stroke="#3B2218" strokeWidth="4" />
      {/* La abuela que cuenta */}
      <g transform="translate(92 250)">
        <path d="M-30 40 Q-28 -10 0 -16 Q28 -10 30 40Z" fill="#9C3D24" />
        <circle cx="0" cy="-30" r="15" fill={PIEL} />
        <path d="M-15 -34 Q-14 -50 0 -50 Q14 -50 15 -34 Q8 -42 0 -42 Q-8 -42 -15 -34Z" fill="#E9E1D6" />
        <path d="M-5 -26 Q0 -22 5 -26" stroke="#5A3627" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        {/* Ondas de su voz */}
        <path d="M24 -38 q8 8 0 16 M32 -44 q14 14 0 28" stroke="#F2C48D" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </g>
      {/* Mesa con libro abierto, cartas y grabadora */}
      <rect x="0" y="292" width="300" height="128" fill="#3B2218" />
      <rect x="0" y="286" width="300" height="10" fill="#7A4A33" />
      <g transform="translate(190 262)">
        <path d="M-40 26 L0 20 L40 26 L40 4 L0 -2 L-40 4Z" fill="#F4EDE3" />
        <path d="M0 -2 V20" stroke="#C9B79C" strokeWidth="1.5" />
        <path d="M-32 8 H-8 M-32 13 H-10 M8 8 H32 M10 13 H30" stroke="#C9B79C" strokeWidth="1.5" />
      </g>
      <g transform="translate(40 276) rotate(-8)">
        <rect width="34" height="22" fill="#EFE3C8" />
        <path d="M0 0 L17 12 L34 0" stroke="#B8A27F" strokeWidth="1.5" fill="none" />
      </g>
      <g transform="translate(244 268)">
        <rect width="44" height="22" rx="3" fill="#2B2420" />
        <circle cx="12" cy="11" r="5" fill="#8C6A4E" />
        <circle cx="32" cy="11" r="5" fill="#8C6A4E" />
        <circle cx="38" cy="-4" r="3" fill="#B8482A" />
      </g>
    </svg>
  );
}

/**
 * Simulación histórica: un campesino reparte una finca en lotes, con estacas,
 * cerca y cuaderno de cuentas. La escena está a la derecha, porque el texto de
 * la tarjeta ocupa la izquierda en pantallas anchas.
 */
export function IlustracionSimulacion({ className }: Props) {
  const lotes = ["#A8BC7C", "#C9B26A", "#8FA46A", "#D9C27E", "#9DB271", "#B9A35E", "#A3B876", "#CDB873"];
  return (
    <svg viewBox="0 0 640 260" preserveAspectRatio="xMaxYMid slice" aria-hidden="true" focusable="false" className={className}>
      <defs>
        <linearGradient id="cielo-simulacion" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F2C48D" />
          <stop offset="1" stopColor="#F7E3C8" />
        </linearGradient>
      </defs>
      <rect width="640" height="260" fill="url(#cielo-simulacion)" />
      <circle cx="372" cy="46" r="26" fill="#F6D9A6" />
      <path d="M0 100 Q120 50 260 90 T520 70 T640 80 V260 H0Z" fill={COLINA_CLARA} />
      {/* Casa de la finca */}
      <g transform="translate(560 44)">
        <rect width="40" height="26" fill={PARED} />
        <path d="M-6 0 L20 -18 L46 0Z" fill={TECHO} />
        <rect x="15" y="10" width="10" height="16" fill="#6E4A33" />
      </g>
      {/* La finca vista en perspectiva, partida en lotes */}
      <g transform="translate(486 104)">
        {lotes.slice(0, 6).map((c, i) => {
          const col = i % 3;
          const fila = Math.floor(i / 3);
          const x0 = col * 50 - fila * 16;
          const y0 = fila * 44;
          return <path key={c + i} d={`M${x0} ${y0} h50 l-16 44 h-50Z`} fill={c} stroke="#F4EDE3" strokeWidth="3" />;
        })}
        {/* Estacas y cuerda que marcan un lindero nuevo */}
        <path d="M100 -4 L82 92" stroke="#7A4A33" strokeWidth="3" strokeDasharray="6 5" />
        {[[100, -4], [91, 44], [82, 92]].map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x - 2} y={y - 12} width="4" height="14" fill="#6E4A33" />
        ))}
      </g>
      {/* Cerca */}
      <path d="M0 236 H640" stroke="#7A4A33" strokeWidth="3" />
      {Array.from({ length: 17 }, (_, i) => (
        <rect key={i} x={i * 40 + 6} y="220" width="5" height="26" fill="#6E4A33" />
      ))}
      {/* El campesino que mide y reparte, con su cuaderno, y una familia que espera su parcela */}
      <Campesino x={448} y={236} escala={1.5} brazo="adelante" />
      <g transform="translate(482 172) rotate(-12)">
        <rect width="24" height="18" rx="2" fill="#F4EDE3" stroke="#7A4A33" strokeWidth="1.5" />
        <path d="M4 6 H20 M4 11 H16" stroke="#B8482A" strokeWidth="1.5" />
      </g>
      <Campesino x={404} y={238} escala={1.1} camisa="#E9C9A0" />
      <Campesino x={378} y={240} escala={0.8} camisa="#D9E4C8" />
    </svg>
  );
}

/** Jardín de la memoria: flores con cartas y poemas atados a sus tallos, frente a las colinas. */
export function IlustracionJardin({ className }: Props) {
  const flores: [number, number, string][] = [
    [50, 150, "#D95D39"],
    [110, 128, "#F2B544"],
    [170, 156, "#E78FA0"],
    [235, 134, "#D95D39"],
    [295, 150, "#F2B544"],
    [350, 126, "#E78FA0"],
  ];
  return (
    <svg viewBox="0 0 400 260" preserveAspectRatio="xMidYMin slice" aria-hidden="true" focusable="false" className={className}>
      <rect width="400" height="260" fill="#F7E3C8" />
      <circle cx="320" cy="50" r="24" fill="#F6D9A6" />
      <Colinas base={-30} />
      <rect y="190" width="400" height="70" fill={COLINA_OSCURA} />
      {flores.map(([x, y, c], i) => (
        <g key={i}>
          <path d={`M${x} ${y} Q${x - 6} ${y + 40} ${x} 200`} stroke="#2F4A2A" strokeWidth="3" fill="none" />
          <path d={`M${x - 2} ${y + 34} q-14 -6 -16 6 q12 4 16 -6`} fill="#4F7A3E" />
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx={x} cy={y - 9} rx="6" ry="10" fill={c} transform={`rotate(${a} ${x} ${y})`} />
          ))}
          <circle cx={x} cy={y} r="5" fill="#5E4108" />
          {/* La carta o el poema atado a cada flor */}
          {i % 2 === 0 && (
            <g transform={`translate(${x + 6} ${y + 18}) rotate(${i % 4 === 0 ? 8 : -8})`}>
              <rect width="20" height="14" fill="#FFFDF8" stroke="#C9B79C" strokeWidth="1" />
              <path d="M3 4 H17 M3 8 H14" stroke="#B8482A" strokeWidth="1.2" />
            </g>
          )}
        </g>
      ))}
      {/* Mariposas */}
      <g transform="translate(200 60)">
        <path d="M0 0 q-12 -14 -16 0 q4 10 16 0 q12 -14 16 0 q-4 10 -16 0" fill="#B8482A" />
      </g>
      <g transform="translate(80 80) scale(.7)">
        <path d="M0 0 q-12 -14 -16 0 q4 10 16 0 q12 -14 16 0 q-4 10 -16 0" fill="#177D7D" />
      </g>
    </svg>
  );
}

/** Mapa interactivo: el mapa de los Montes de María con un camino, marcas y lo que cada quien deja: voz y foto. */
export function IlustracionMapa({ className }: Props) {
  return (
    <svg viewBox="0 0 400 260" preserveAspectRatio="xMidYMin slice" aria-hidden="true" focusable="false" className={className}>
      <rect width="400" height="260" fill="#F3E6D3" />
      {/* El mapa de papel, plegado en tres */}
      <g transform="translate(30 20)">
        <path d="M0 10 L110 0 L230 14 L340 4 V210 L230 220 L110 206 L0 216Z" fill="#EAD9BE" />
        <path d="M110 0 V206 M230 14 V220" stroke="#D2BC98" strokeWidth="2" />
        <path d="M20 160 Q80 90 140 130 T260 100 T330 120 V200 L230 210 L110 196 L10 206Z" fill={COLINA_CLARA} opacity=".7" />
        <path d="M30 60 Q70 40 100 70 Q120 90 150 60" fill="none" stroke="#7FB6C4" strokeWidth="5" strokeLinecap="round" />
        {/* El camino entre los lugares */}
        <path d="M40 180 C90 150 100 100 150 110 S240 150 260 90 S310 50 320 40" fill="none" stroke="#B8482A" strokeWidth="3" strokeDasharray="7 6" />
        {[
          [40, 180, "#B8482A"],
          [150, 110, "#177D7D"],
          [260, 90, "#B8482A"],
          [320, 40, "#886216"],
        ].map(([x, y, c]) => (
          <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
            <path d="M0 0 C-12 -14 -12 -30 0 -30 C12 -30 12 -14 0 0Z" fill={c as string} />
            <circle cx="0" cy="-20" r="4.5" fill="#FFFDF8" />
          </g>
        ))}
        {/* La voz grabada y la foto del lugar */}
        <g transform="translate(176 44)">
          <rect width="46" height="30" rx="15" fill="#FFFDF8" />
          <rect x="18" y="7" width="10" height="13" rx="5" fill="#177D7D" />
          <path d="M14 16 q9 9 18 0 M23 23 v4" stroke="#177D7D" strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>
        <g transform="translate(60 92) rotate(-6)">
          <rect width="48" height="40" fill="#FFFDF8" />
          <rect x="4" y="4" width="40" height="26" fill={COLINA_MEDIA} />
          <path d="M14 30 L20 18 L26 24 L32 14 L44 30Z" fill={COLINA_OSCURA} />
          <rect x="18" y="20" width="10" height="7" fill={PARED} />
          <path d="M16 20 L23 15 L30 20Z" fill={TECHO} />
        </g>
      </g>
    </svg>
  );
}

/** La invitación: un joven explorador con su mochila, a la entrada del camino que lleva a El Salado. */
export function IlustracionInvitacion({ className, angosta = false }: Props & { angosta?: boolean }) {
  // En el celular se recorta alrededor del explorador, para que no quede fuera.
  // Las dos versiones conviven en la página: cada una necesita su propio degradado.
  const idCielo = angosta ? "cielo-invitacion-angosta" : "cielo-invitacion";
  return (
    <svg
      viewBox={angosta ? "40 110 420 250" : "0 0 1000 360"}
      preserveAspectRatio={angosta ? "xMidYMax meet" : "xMidYMax slice"} aria-hidden="true" focusable="false" className={className}>
      <defs>
        <linearGradient id={idCielo} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#D9683F" />
          <stop offset="1" stopColor="#F2C48D" />
        </linearGradient>
      </defs>
      <rect width="1000" height="360" fill={`url(#${idCielo})`} />
      <circle cx="830" cy="150" r="56" fill="#F6D9A6" />
      <path d="M0 250 Q180 160 360 230 T720 200 T1000 215 V360 H0Z" fill={COLINA_CLARA} />
      <path d="M0 290 Q220 220 460 275 T1000 260 V360 H0Z" fill={COLINA_MEDIA} />
      <path d="M0 325 Q260 290 520 320 T1000 312 V360 H0Z" fill={COLINA_OSCURA} />
      {/* El camino que sube hacia el pueblo */}
      <path d="M760 360 C770 320 800 300 850 280 S930 250 960 236" stroke="#E8CFA6" strokeWidth="26" fill="none" strokeLinecap="round" />
      {[[905, 222], [945, 214]].map(([x, y]) => (
        <g key={x}>
          <rect x={x} y={y} width="26" height="18" fill={PARED} />
          <path d={`M${x - 4} ${y} L${x + 13} ${y - 12} L${x + 30} ${y}Z`} fill={TECHO} />
        </g>
      ))}
      {/* El letrero */}
      <g transform="translate(700 236)">
        <rect x="-3" y="0" width="6" height="64" fill="#6E4A33" />
        <path d="M-6 6 H74 L88 20 L74 34 H-6Z" fill="#F4EDE3" stroke="#6E4A33" strokeWidth="2" />
        <path d="M6 20 H66" stroke="#B8482A" strokeWidth="4" strokeLinecap="round" />
      </g>
      {/* El explorador que invita: mochila, saludo y la mano señalando el camino */}
      <g transform="translate(150 340)">
        <rect x="-30" y="-92" width="26" height="38" rx="6" fill="#177D7D" />
        <path d="M-7 -30 L-11 0 M7 -30 L11 0" stroke={PANTALON} strokeWidth="9" strokeLinecap="round" />
        <path d="M-15 -78 Q0 -86 15 -78 L12 -28 H-12Z" fill="#F2B544" />
        <path d="M-12 -70 L-26 -108" stroke={PIEL} strokeWidth="7" strokeLinecap="round" />
        <path d="M12 -70 L44 -66" stroke={PIEL} strokeWidth="7" strokeLinecap="round" />
        <circle cx="0" cy="-96" r="12" fill={PIEL} />
        <path d="M-4 -92 Q0 -88 4 -92" stroke="#3B2218" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <Sombrero x={0} y={-102} escala={0.85} />
      </g>
    </svg>
  );
}
