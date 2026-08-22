const W = 520;
const H = 232;
const BASE_Y = 172;
const CUBE_W = 128;

/** Half-width and half-depth of the isometric projection. */
const HW = CUBE_W / 2;
const HD = CUBE_W / 4;

type Block = { cx: number; height: number; delay: number };

// Three blocks, each taller than the last. The shape carries both meanings at
// once: blocks on a chain, and a balance that grows — which is the whole
// product in one picture.
const BLOCKS: Block[] = [
  { cx: 128, height: 34, delay: 0 },
  { cx: 260, height: 74, delay: 220 },
  { cx: 392, height: 118, delay: 440 },
];

function Cube({ cx, height, delay }: Block) {
  const topY = BASE_Y - height;

  const top = `${cx},${topY - HD} ${cx + HW},${topY} ${cx},${topY + HD} ${cx - HW},${topY}`;
  const left = `${cx - HW},${topY} ${cx},${topY + HD} ${cx},${BASE_Y + HD} ${cx - HW},${BASE_Y}`;
  const right = `${cx + HW},${topY} ${cx},${topY + HD} ${cx},${BASE_Y + HD} ${cx + HW},${BASE_Y}`;

  return (
    <g className="block-float" style={{ animationDelay: `${delay}ms` }}>
      <ellipse
        cx={cx}
        cy={BASE_Y + HD + 14}
        rx={HW * 0.8}
        ry={10}
        fill="var(--spark)"
        opacity={0.12}
      />
      <polygon points={left} fill="url(#face-left)" />
      <polygon points={right} fill="url(#face-right)" />
      <polygon points={top} fill="url(#face-top)" />
      <polygon
        points={top}
        fill="none"
        stroke="var(--spark)"
        strokeWidth={1}
        opacity={0.55}
      />
    </g>
  );
}

/**
 * The hero's signature.
 *
 * Drawn as flat polygons rather than a 3D library: an isometric projection is
 * four coordinates per face, and shipping a renderer to draw three cubes would
 * cost more than the cubes are worth.
 */
export function ChainStack() {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full max-w-xl"
      role="img"
      aria-label="Three stacked blocks, each taller than the last."
    >
      <defs>
        <linearGradient id="face-top" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.72" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id="face-left" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#0c4a6e" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id="face-right" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.26" />
          <stop offset="100%" stopColor="#075985" stopOpacity="0.14" />
        </linearGradient>
      </defs>

      {BLOCKS.map((block) => (
        <Cube key={block.cx} {...block} />
      ))}
    </svg>
  );
}
