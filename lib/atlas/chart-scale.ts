export function chartScale(values: number[], minimum = 1) {
  const maximum = Math.max(minimum, ...values.filter(Number.isFinite), 0);
  const raw = maximum / 4;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step =
    [1, 2, 2.5, 5, 10].find((n) => n * magnitude >= raw)! * magnitude;
  const top = Math.ceil(maximum / step) * step;
  return {
    top,
    ticks: Array.from(
      { length: Math.round(top / step) + 1 },
      (_, i) => i * step,
    ),
  };
}
