import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  minimumDownPayment,
  insurancePremium,
  monthlyPayment,
  remainingBalance,
  utilityBill,
  registrationFees,
} from '../lib/atlas/calculations';
import { TAX_RATE, MUNICIPAL_RATE, PROVINCIAL_RATE } from '../lib/atlas/data';

// Expected values were calculated independently with 60-digit decimal arithmetic.
const reference = JSON.parse(
  readFileSync(
    new URL('./fixtures/ownership-reference.json', import.meta.url),
    'utf8',
  ),
);
const cents = (actual: number, expected: number) =>
  assert.ok(
    Math.abs(actual - expected) < 0.00501,
    `${actual} differs from ${expected}`,
  );
for (const row of reference.mortgageCases)
  test(row.id, () => {
    const i = row.inputs,
      expected = row.expected;
    cents(
      monthlyPayment(
        expected.principal,
        i.nominalAnnualRate * 100,
        i.amortizationYears,
      ),
      expected.monthlyPayment,
    );
    cents(
      remainingBalance(
        expected.principal,
        i.nominalAnnualRate * 100,
        i.amortizationYears,
        i.paymentsElapsed,
      ),
      expected.balanceAfterElapsedPayments,
    );
  });
for (const row of reference.minimumDownPaymentCases)
  test(row.id, () =>
    cents(
      minimumDownPayment(row.purchasePrice),
      row.expectedMinimumDownPayment,
    ),
  );
for (const row of reference.insuranceCases)
  test(row.id, () =>
    cents(
      insurancePremium(
        row.inputs.price,
        row.inputs.downPayment,
        row.inputs.amortizationYears,
      ),
      row.expected.premium,
    ),
  );
for (const row of reference.registryCases.filter(
  (r: { inputs: { titleCount: number } }) => r.inputs.titleCount === 1,
))
  test(row.id, () => {
    const fees = registrationFees(
      row.inputs.landValue,
      row.inputs.registeredPrincipal ?? 0,
    );
    cents(fees.transfer, row.expected.transferFee);
    cents(fees.mortgage, row.expected.mortgageFee);
  });
test('published City utility example and cash purchase', () => {
  cents(utilityBill(19, 30, true), reference.waterCase.expected.combined);
  assert.equal(monthlyPayment(0, 5, 25), 0);
  assert.equal(insurancePremium(600000, 600000, 25), 0);
});
test('2026 residential tax splits reconcile', () => {
  cents(600000 * TAX_RATE, 3989.94);
  cents(600000 * MUNICIPAL_RATE, 2334.36);
  cents(600000 * PROVINCIAL_RATE, 1655.58);
  assert.ok(Math.abs(TAX_RATE - MUNICIPAL_RATE - PROVINCIAL_RATE) < 1e-10);
});
