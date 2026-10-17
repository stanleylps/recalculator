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

console.log(`\n${passed} tests passed`);
