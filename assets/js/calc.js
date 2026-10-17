/*
 * ReCalculator core math. Pure functions, no DOM.
 * Works in the browser (window.RC) and in Node (module.exports) for tests.
 *
 * Conventions
 * - Rates are passed as decimals (0.06 = 6%).
 * - Annual rates are converted to equivalent monthly rates: (1 + r)^(1/12) - 1,
 *   so 12 months at the monthly rate compounds to exactly the annual rate.
 * - Savings are deposited at the end of each month.
 * - Retirement withdrawals are taken at the start of each month and grow with inflation.
 */
(function (root) {
  'use strict';

  var MAX_RETIREMENT_YEARS = 100;

  function monthlyRate(annual) {
    return Math.pow(1 + annual, 1 / 12) - 1;
  }

  // Future value of a lump sum plus a flat monthly saving (end of month).
  function futureValue(presentValue, monthlySaving, annualReturn, years) {
    var r = monthlyRate(annualReturn);
    var n = Math.round(years * 12);
    var growth = Math.pow(1 + r, n);
    var annuity = r === 0 ? n : (growth - 1) / r;
    return presentValue * growth + monthlySaving * annuity;
  }

  // Flat monthly saving needed to grow presentValue into target over `years`.
  // Returns 0 when the current portfolio already gets there on its own.
  function requiredMonthlySaving(target, presentValue, annualReturn, years) {
    var r = monthlyRate(annualReturn);
    var n = Math.round(years * 12);
    if (n <= 0) return Math.max(0, target - presentValue) > 0 ? Infinity : 0;
    var growth = Math.pow(1 + r, n);
    var gap = target - presentValue * growth;
    if (gap <= 0) return 0;
    var annuity = r === 0 ? n : (growth - 1) / r;
    return gap / annuity;
  }

  /*
   * Simulate retirement drawdown month by month.
   * Returns { months, depleted, yearlyBalances } where yearlyBalances[k] is the
   * balance at the start of retirement year k (nominal).
   */
  function simulateDrawdown(startBalance, firstMonthlyWithdrawal, annualReturn, annualInflation, maxYears) {
    maxYears = maxYears || MAX_RETIREMENT_YEARS;
    var r = monthlyRate(annualReturn);
    var g = monthlyRate(annualInflation);
    var balance = startBalance;
    var withdrawal = firstMonthlyWithdrawal;
    var yearly = [balance];
    var totalMonths = maxYears * 12;
    for (var m = 1; m <= totalMonths; m++) {
      if (balance < withdrawal) {
        // This month's income can't be fully paid: money runs out during month m.
        yearly.push(0);
        return { months: m - 1 + (balance > 0 ? balance / withdrawal : 0), depleted: true, yearlyBalances: yearly };
      }
      balance = (balance - withdrawal) * (1 + r);
      withdrawal *= 1 + g;
      if (m % 12 === 0) yearly.push(balance);
    }
    return { months: totalMonths, depleted: false, yearlyBalances: yearly };
  }

  /*
   * Tool 1: Retirement goal planner.
   * inputs: monthlyIncome (today's money), years, currentAge, portfolio,
   *         returnRate, inflation, withdrawalRate, retirementReturn
   */
  function planGoal(inp) {
    var years = inp.years;
    var inflFactor = Math.pow(1 + inp.inflation, years);
    var futureMonthlyIncome = inp.monthlyIncome * inflFactor;
    var target = (futureMonthlyIncome * 12) / inp.withdrawalRate;
    var projectedWithoutSaving = futureValue(inp.portfolio, 0, inp.returnRate, years);
    var saving = requiredMonthlySaving(target, inp.portfolio, inp.returnRate, years);
    var startBalance = Math.max(target, projectedWithoutSaving);

    var retirementReturn = inp.retirementReturn == null ? inp.returnRate : inp.retirementReturn;
    var draw = simulateDrawdown(startBalance, futureMonthlyIncome, retirementReturn, inp.inflation);

    // Year-by-year path from today through retirement.
    var path = [];
    var r = monthlyRate(inp.returnRate);
    var bal = inp.portfolio;
    var contributed = inp.portfolio;
    path.push({ year: 0, balance: bal, contributed: contributed, phase: 'save' });
    for (var y = 1; y <= years; y++) {
      for (var m = 0; m < 12; m++) {
        bal = bal * (1 + r) + (isFinite(saving) ? saving : 0);
        contributed += isFinite(saving) ? saving : 0;
      }
      path.push({ year: y, balance: bal, contributed: contributed, phase: 'save' });
    }
    // Snap the retirement-day balance to the simulated start balance (rounding of the loop).
    if (path.length) path[path.length - 1].balance = years > 0 ? startBalance : path[path.length - 1].balance;
    for (var k = 1; k < draw.yearlyBalances.length; k++) {
      path.push({ year: years + k, balance: draw.yearlyBalances[k], phase: 'draw' });
    }

    return {
      futureMonthlyIncome: futureMonthlyIncome,
      target: target,
      targetToday: target / inflFactor,
      projectedWithoutSaving: projectedWithoutSaving,
      monthlySaving: saving,
      alreadyOnTrack: saving === 0,
      startBalance: startBalance,
      totalSaved: inp.portfolio + (isFinite(saving) ? saving * years * 12 : 0),
      lastsMonths: draw.months,
      depleted: draw.depleted,
      runOutAge: draw.depleted && inp.currentAge != null ? inp.currentAge + years + draw.months / 12 : null,
      path: path
    };
  }

  /*
   * Tool 2: Portfolio projection.
   * inputs: portfolio, monthlySaving, years, returnRate, inflation,
   *         savingIncrease (yearly step-up of the monthly saving), withdrawalRate
   */
  function projectPortfolio(inp) {
    var r = monthlyRate(inp.returnRate);
    var step = inp.savingIncrease || 0;
    var bal = inp.portfolio;
    var contributed = inp.portfolio;
    var pmt = inp.monthlySaving;
    var path = [{ year: 0, balance: bal, contributed: contributed, real: bal }];
    for (var y = 1; y <= inp.years; y++) {
      for (var m = 0; m < 12; m++) {
        bal = bal * (1 + r) + pmt;
        contributed += pmt;
      }
      path.push({ year: y, balance: bal, contributed: contributed, real: bal / Math.pow(1 + inp.inflation, y), monthlySaving: pmt });
      pmt *= 1 + step;
    }
    var inflFactor = Math.pow(1 + inp.inflation, inp.years);
    var wr = inp.withdrawalRate || 0;
    return {
      futureValue: bal,
      futureValueToday: bal / inflFactor,
      totalContributed: contributed,
      growth: bal - contributed,
      monthlyIncome: (bal * wr) / 12,
      monthlyIncomeToday: (bal * wr) / 12 / inflFactor,
      finalMonthlySaving: inp.years > 0 ? path[path.length - 1].monthlySaving : inp.monthlySaving,
      path: path
    };
  }

  var api = {
    monthlyRate: monthlyRate,
    futureValue: futureValue,
    requiredMonthlySaving: requiredMonthlySaving,
    simulateDrawdown: simulateDrawdown,
    planGoal: planGoal,
    projectPortfolio: projectPortfolio,
    MAX_RETIREMENT_YEARS: MAX_RETIREMENT_YEARS
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.RC = api;
})(this);
