export function minimumDownPayment(price: number) {
  return price >= 1500000
    ? price * 0.2
    : price > 500000
      ? 25000 + (price - 500000) * 0.1
      : price * 0.05;
}
export function insurancePremium(price: number, down: number, years: number) {
  const loan = Math.max(0, price - down),
    ltv = price > 0 ? loan / price : 0;
  if (ltv <= 0.8 || loan === 0) return 0;
  const base = ltv <= 0.85 ? 0.028 : ltv <= 0.9 ? 0.031 : 0.04;
  return loan * (base + (years > 25 ? 0.002 : 0));
}
export function monthlyPayment(
  principal: number,
  annualPercent: number,
  years: number,
) {
  if (principal <= 0) return 0;
  const monthly = Math.pow(1 + annualPercent / 200, 1 / 6) - 1,
    n = years * 12;
  return monthly === 0
    ? principal / n
    : (principal * monthly) / (1 - Math.pow(1 + monthly, -n));
}
export function remainingBalance(
  principal: number,
  annualPercent: number,
  years: number,
  months: number,
) {
  const i = Math.pow(1 + annualPercent / 200, 1 / 6) - 1,
    payment = monthlyPayment(principal, annualPercent, years);
  if (i === 0) return Math.max(0, principal - payment * months);
  return Math.max(
    0,
    principal * Math.pow(1 + i, months) -
      (payment * (Math.pow(1 + i, months) - 1)) / i,
  );
}
export function utilityBill(
  waterM3: number,
  billingDays = 30,
  includeCarts = true,
) {
  return (
    waterM3 * (1.7409 + 0.88 * 1.905) +
    ((13.83 + 23.45 + 17 + (includeCarts ? 20.51 : 0)) * billingDays) / 30
  );
}
export function registrationFees(value: number, registeredMortgage: number) {
  return {
    transfer: 50 + 5 * Math.ceil(Math.max(0, value) / 5000),
    mortgage:
      registeredMortgage > 0
        ? 50 + 5 * Math.ceil(registeredMortgage / 5000)
        : 0,
  };
}
