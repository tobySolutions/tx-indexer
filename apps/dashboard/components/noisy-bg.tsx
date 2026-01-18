import { cn } from "@/lib/utils";

interface NoisyBackgroundProps {
  contained?: boolean;
  showDots?: boolean;
}

// Static dots with fixed positions (percentages of viewport)
const STATIC_DOTS = [
  { x: 8, y: 15, size: 1.2 },
  { x: 25, y: 42, size: 1.0 },
  { x: 45, y: 8, size: 0.9 },
  { x: 62, y: 35, size: 1.3 },
  { x: 78, y: 65, size: 1.1 },
  { x: 92, y: 22, size: 0.8 },
  { x: 15, y: 78, size: 1.0 },
  { x: 38, y: 88, size: 1.2 },
  { x: 55, y: 55, size: 0.9 },
  { x: 85, y: 85, size: 1.1 },
];

export function NoisyBackground({
  contained = false,
  showDots = false,
}: NoisyBackgroundProps) {
  const filterId = contained ? "noise-contained" : "noise";

  return (
    <div
      className={cn(
        "pointer-events-none overflow-hidden absolute inset-0",
        !contained && "fixed -z-10",
      )}
    >
      <svg className="absolute inset-0 h-full w-full">
        <filter id={filterId}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.8"
            numOctaves="4"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect
          width="100%"
          height="100%"
          filter={`url(#${filterId})`}
          className="opacity-40 dark:opacity-20"
        />
      </svg>
      {showDots &&
        STATIC_DOTS.map((dot, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-red-500/60"
            style={{
              left: `${dot.x}%`,
              top: `${dot.y}%`,
              width: `${dot.size * 2}px`,
              height: `${dot.size * 2}px`,
            }}
          />
        ))}
    </div>
  );
}
