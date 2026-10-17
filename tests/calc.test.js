// Run with: node tests/calc.test.js
const assert = require('assert');
const RC = require('../assets/js/calc.js');

const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: got ${a}, expected ${b}`);
let passed = 0;
function test(name, fn) { fn(); passed++; console.log('ok -', name); }

test('monthly rate compounds back to the annual rate', () => {
  close(Math.pow(1 + RC.monthlyRate(0.07), 12), 1.07, 1e-12, 'annual');
});

test('lump sum future value matches (1+r)^n', () => {
  close(RC.futureValue(10000, 0, 0.06, 10), 10000 * Math.pow(1.06, 10), 1e-6, 'fv');
});

test('zero return: future value is just the sum of deposits', () => {
  close(RC.futureValue(5000, 1000, 0, 2), 5000 + 24000, 1e-9, 'fv');
});

test('required saving round-trips through futureValue', () => {
  const pmt = RC.requiredMonthlySaving(1_000_000, 50_000, 0.07, 25);
  close(RC.futureValue(50_000, pmt, 0.07, 25), 1_000_000, 1e-4, 'round trip');
});

test('no saving needed when current portfolio already reaches the target', () => {
  assert.strictEqual(RC.requiredMonthlySaving(100_000, 100_000, 0.05, 10), 0);
});

test('drawdown at 4% with zero real return lasts exactly 25 years', () => {
  const d = RC.simulateDrawdown(1_200_000, 4000, 0.03, 0.03);
  assert.ok(d.depleted);
  close(d.months, 300, 1e-6, 'months');
});

test('drawdown at 3% with zero real return lasts 33 1/3 years', () => {
  const d = RC.simulateDrawdown(1_200_000, 3000, 0, 0);
  close(d.months, 400, 1e-6, 'months');
});

test('drawdown lasts forever when the real return covers the withdrawal', () => {
  const d = RC.simulateDrawdown(1_000_000, 2000, 0.07, 0.02);
  assert.ok(!d.depleted);
  assert.strictEqual(d.months, RC.MAX_RETIREMENT_YEARS * 12);
});

test('goal planner: worked example', () => {
  const g = RC.planGoal({
    monthlyIncome: 5000, years: 20, currentAge: 40, portfolio: 100_000,
    returnRate: 0.06, inflation: 0.03, withdrawalRate: 0.04
  });
  close(g.futureMonthlyIncome, 5000 * Math.pow(1.03, 20), 1e-6, 'future income');
  close(g.target, g.futureMonthlyIncome * 12 / 0.04, 1e-6, 'target');
  close(RC.futureValue(100_000, g.monthlySaving, 0.06, 20), g.target, 1e-3, 'saving reaches target');
  // The chart path ends the saving phase at the target.
  close(g.path[20].balance, g.target, 1e-3, 'path at retirement');
  assert.ok(g.depleted, 'with 3% real-ish return a 4% draw eventually runs out');
  close(g.runOutAge, 40 + 20 + g.lastsMonths / 12, 1e-9, 'age');
  console.log('   example: target', g.target.toFixed(0), 'saving/mo', g.monthlySaving.toFixed(2),
    'lasts', (g.lastsMonths / 12).toFixed(1), 'yrs');
});

test('goal planner: already on track', () => {
  const g = RC.planGoal({
    monthlyIncome: 1000, years: 10, portfolio: 1_000_000,
    returnRate: 0.05, inflation: 0.02, withdrawalRate: 0.04
  });
  assert.ok(g.alreadyOnTrack);
  close(g.startBalance, 1_000_000 * Math.pow(1.05, 10), 1e-3, 'start balance is the projected portfolio');
});

test('projection: flat saving matches futureValue', () => {
  const p = RC.projectPortfolio({ portfolio: 20_000, monthlySaving: 800, years: 15, returnRate: 0.07, inflation: 0.025, withdrawalRate: 0.04 });
  close(p.futureValue, RC.futureValue(20_000, 800, 0.07, 15), 1e-4, 'fv');
  close(p.totalContributed, 20_000 + 800 * 180, 1e-6, 'contributed');
  close(p.futureValueToday, p.futureValue / Math.pow(1.025, 15), 1e-6, 'real');
  close(p.monthlyIncome, p.futureValue * 0.04 / 12, 1e-6, 'income');
});

test('projection: yearly step-up raises the saving each year', () => {
  const p = RC.projectPortfolio({ portfolio: 0, monthlySaving: 1000, years: 3, returnRate: 0, inflation: 0, savingIncrease: 0.1 });
  close(p.totalContributed, 12000 + 13200 + 14520, 1e-6, 'contributed');
  close(p.futureValue, p.totalContributed, 1e-6, 'no growth at 0%');
});

test('drawdown: sustainable withdrawal empties the pot in exactly the target years', () => {
  const w = RC.sustainableWithdrawal(500_000, 0.05, 0.03, 30);
  close(RC.simulateDrawdown(500_000, w, 0.05, 0.03).months, 360, 0.01, 'months');
  close(RC.sustainableWithdrawal(120_000, 0, 0, 10), 1000, 1e-9, 'zero rates');
});

test('emergency fund: target and months to build', () => {
  const e = RC.emergencyFund({ monthlyExpenses: 3000, months: 6, current: 6000, monthlySaving: 1000, interestRate: 0 });
  assert.strictEqual(e.target, 18000);
  assert.strictEqual(e.monthsToTarget, 12);
  close(e.coverMonths, 2, 1e-9, 'cover');
  assert.strictEqual(RC.emergencyFund({ monthlyExpenses: 3000, months: 6, current: 0, monthlySaving: 0, interestRate: 0 }).monthsToTarget, Infinity);
});

test('loan: standard mortgage payment and interest', () => {
  close(RC.loanPayment(300_000, 0.04, 30), 1432.25, 0.01, 'payment');
  const l = RC.loan({ principal: 300_000, rate: 0.04, years: 30, extra: 0 });
  assert.strictEqual(l.months, 360);
  close(l.totalInterest, l.payment * 360 - 300_000, 0.01, 'interest');
  assert.strictEqual(l.interestSaved, 0);
  const x = RC.loan({ principal: 300_000, rate: 0.04, years: 30, extra: 500 });
  assert.ok(x.extraMonths < 360 && x.interestSaved > 0);
  close(RC.loanPayment(12_000, 0, 1), 1000, 1e-9, 'zero rate');
});

test('debt payoff: simple case and avalanche never costs more interest', () => {
  const one = RC.debtPayoff([{ name: 'A', balance: 1000, rate: 0, minimum: 100 }], 0, 'avalanche');
  assert.strictEqual(one.months, 10);
  assert.strictEqual(one.totalInterest, 0);
  const debts = [
    { name: 'Card', balance: 5000, rate: 0.24, minimum: 150 },
    { name: 'Car', balance: 15000, rate: 0.06, minimum: 300 },
    { name: 'Personal', balance: 2000, rate: 0.12, minimum: 60 }
  ];
  const sb = RC.debtPayoff(debts, 300, 'snowball');
  const av = RC.debtPayoff(debts, 300, 'avalanche');
  assert.ok(av.totalInterest <= sb.totalInterest + 1e-6);
  assert.strictEqual(sb.order[0].name, 'Personal');
  assert.strictEqual(av.order[0].name, 'Card');
  assert.strictEqual(debts[0].balance, 5000, 'inputs not mutated');
  const never = RC.debtPayoff([{ name: 'X', balance: 10000, rate: 0.3, minimum: 100 }], 0, 'avalanche');
  assert.strictEqual(never.months, Infinity);
  console.log('   example: snowball', sb.months, 'mo', sb.totalInterest.toFixed(0), '| avalanche', av.months, 'mo', av.totalInterest.toFixed(0));
});

test('education fund: zero rates reduce to simple arithmetic', () => {
  const e = RC.educationFund({ childAge: 6, startAge: 18, studyYears: 4, annualCost: 20000, feeInflation: 0, savings: 8000, returnRate: 0 });
  assert.strictEqual(e.yearsUntil, 12);
  close(e.target, 80000, 1e-9, 'target');
  close(e.monthlySaving, 72000 / 144, 1e-9, 'saving');
  const g = RC.educationFund({ childAge: 6, startAge: 18, studyYears: 4, annualCost: 20000, feeInflation: 0.05, savings: 0, returnRate: 0.06 });
  close(g.costs[0], 20000 * Math.pow(1.05, 12), 1e-6, 'first year fee');
  close(RC.futureValue(0, g.monthlySaving, 0.06, 12), g.target, 1e-3, 'saving reaches target');
});

test('insurance: income need equals annual need x years when return = inflation', () => {
  const r = RC.insuranceNeeds({ annualNeed: 60000, years: 10, returnRate: 0.03, inflation: 0.03, debts: 200000, goals: 100000, finalExpenses: 20000, existingCover: 300000, assets: 50000 });
  close(r.income, 600000, 1e-6, 'income');
  close(r.gap, 600000 + 320000 - 350000, 1e-6, 'gap');
});

test('cost of delay: no delay costs nothing, catch-up saving closes the gap', () => {
  assert.strictEqual(RC.costOfDelay({ monthlySaving: 500, returnRate: 0.07, years: 30, delay: 0 }).cost, 0);
  const c = RC.costOfDelay({ monthlySaving: 500, returnRate: 0.07, years: 30, delay: 10, portfolio: 10000 });
  close(c.startNow, RC.futureValue(10000, 500, 0.07, 30), 1e-6, 'now');
  close(RC.futureValue(RC.futureValue(10000, 0, 0.07, 10), c.catchUpSaving, 0.07, 20), c.startNow, 1e-3, 'catch up');
  close(c.pathLater[30], c.startLater, 1e-6, 'path end');
  assert.ok(c.cost > 0);
});

test('lump sum vs DCA: lump wins in a rising market, DCA wins after a fall', () => {
  const base = { amount: 100000, dcaMonths: 12, horizonYears: 5, returnRate: 0.07, cashRate: 0 };
  const up = RC.lumpVsDca({ ...base, shock: 0 });
  assert.ok(up.lump > up.dca);
  close(up.lump, 100000 * Math.pow(1.07, 5), 1e-6, 'lump fv');
  const down = RC.lumpVsDca({ ...base, shock: -0.3 });
  assert.ok(down.dca > down.lump);
  const same = RC.lumpVsDca({ ...base, dcaMonths: 1, shock: 0 });
  close(same.lump, same.dca, 1e-6, 'one month DCA = lump');
});

console.log(`\n${passed} tests passed`);
