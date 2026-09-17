import { chartScale } from '@/lib/atlas/chart-scale';
export { chartScale };

export function ChartData({
  caption,
  columns,
  rows,
  note,
}: {
  caption: string;
  columns: string[];
  rows: { label: string; values: (string | number)[] }[];
  note?: string;
}) {
  if (!rows.length) return null;
  return (
    <details className="mt-3 border-y border-[#dbe5ed] text-[#526a7c]">
      <summary className="min-h-11 cursor-pointer py-3 text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315d7a]">
        View chart data
      </summary>
      {note && <p className="mb-3 text-xs leading-relaxed">{note}</p>}
      <table className="mb-3 w-full border-collapse text-left text-xs tabular-nums">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column}
                scope="col"
                className="border-b border-[#ccdce8] px-2 py-2 align-bottom font-medium first:pl-0 last:pr-0"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <th
                scope="row"
                className="border-b border-[#e3ebf1] py-2 pr-2 align-top font-normal"
              >
                {row.label}
              </th>
              {row.values.map((value, index) => (
                <td
                  key={index}
                  className="border-b border-[#e3ebf1] px-2 py-2 align-top last:pr-0"
                >
                  {value}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

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
