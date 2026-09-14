import { chartScale } from '@/lib/atlas/chart-scale';
export { chartScale };
export function ChartAxes({
  scale,
  unit,
  left = 40,
  right = 316,
  top = 25,
  bottom = 133,
  format = (v) => String(v),
}: {
  scale: ReturnType<typeof chartScale>;
  unit: string;
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
  format?: (v: number) => string;
}) {
  return (
    <g className="chart-axes">
      <text x={left} y={13} fontSize="12" fill="#5a6670">
        {unit}
      </text>
      {scale.ticks.map((value) => {
        const y = bottom - (value / scale.top) * (bottom - top);
        return (
          <g key={value}>
            <line
              x1={left}
              x2={right}
              y1={y}
              y2={y}
              stroke="#dde1e5"
              strokeDasharray={value === 0 ? undefined : '3 4'}
            />
            <text
              x={left - 7}
              y={y + 4}
              textAnchor="end"
              fontSize="12"
              fill="#5a6670"
            >
              {format(value)}
            </text>
          </g>
        );
      })}
    </g>
  );
}
