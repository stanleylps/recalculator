/*
 * Retirement calculator core math. Pure functions, no DOM.
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

  /*
   * Drawdown: how long does a lump sum last?
   * inputs: balance, monthlyWithdrawal (first month), returnRate, inflation (withdrawal rise per year),
   *         targetYears (for the sustainable-withdrawal answer)
   */
  function drawdown(inp) {
    var sim = simulateDrawdown(inp.balance, inp.monthlyWithdrawal, inp.returnRate, inp.inflation);
    return {
      lastsMonths: sim.months,
      depleted: sim.depleted,
      yearlyBalances: sim.yearlyBalances,
      sustainableWithdrawal: sustainableWithdrawal(inp.balance, inp.returnRate, inp.inflation, inp.targetYears)
    };
  }

  // Largest first-month withdrawal (rising with inflation, taken at the start of each month)
  // that empties `balance` in exactly `years`.
  function sustainableWithdrawal(balance, annualReturn, annualInflation, years) {
    var r = monthlyRate(annualReturn);
    var g = monthlyRate(annualInflation);
    var n = Math.round(years * 12);
    var pv = 0, factor = 1;
    for (var m = 0; m < n; m++) {
      pv += factor;
      factor *= (1 + g) / (1 + r);
    }
    return pv > 0 ? balance / pv : 0;
  }

  /*
   * Emergency fund: target and time to build it.
   * inputs: monthlyExpenses, months, current, monthlySaving, interestRate
   */
  function emergencyFund(inp) {
    var target = inp.monthlyExpenses * inp.months;
    var r = monthlyRate(inp.interestRate);
    var bal = inp.current;
    var path = [bal];
    var months = 0;
    var MAX = 600;
    while (bal < target && months < MAX) {
      bal = bal * (1 + r) + inp.monthlySaving;
      months++;
      path.push(bal);
    }
    var reached = bal >= target;
    return {
      target: target,
      gap: Math.max(0, target - inp.current),
      monthsToTarget: reached ? months : Infinity,
      coverMonths: inp.monthlyExpenses > 0 ? inp.current / inp.monthlyExpenses : Infinity,
      path: path
    };
  }

  /*
   * Loan / mortgage with optional extra monthly payment.
   * Loan rates are quoted as a nominal annual rate compounded monthly, so the monthly rate is rate / 12.
   * inputs: principal, rate, years, extra
   */
  function loanPayment(principal, annualRate, years) {
    var r = annualRate / 12;
    var n = Math.round(years * 12);
    if (n <= 0) return principal;
    return r === 0 ? principal / n : (principal * r) / (1 - Math.pow(1 + r, -n));
  }

  function amortize(principal, annualRate, payment) {
    var r = annualRate / 12;
    var bal = principal, interest = 0, months = 0;
    var yearly = [bal];
    while (bal > 0.005 && months < 1200) {
      var int = bal * r;
      var pay = Math.min(payment, bal + int);
      if (pay <= int) return { months: Infinity, totalInterest: Infinity, yearly: yearly };
      interest += int;
      bal = bal + int - pay;
      months++;
      if (months % 12 === 0) yearly.push(Math.max(0, bal));
    }
    if (months % 12 !== 0) yearly.push(0);
    return { months: months, totalInterest: interest, yearly: yearly };
  }

  function loan(inp) {
    var payment = loanPayment(inp.principal, inp.rate, inp.years);
    var base = amortize(inp.principal, inp.rate, payment);
    var faster = amortize(inp.principal, inp.rate, payment + (inp.extra || 0));
    return {
      payment: payment,
      totalInterest: base.totalInterest,
      totalPaid: inp.principal + base.totalInterest,
      months: base.months,
      yearly: base.yearly,
      extraMonths: faster.months,
      extraInterest: faster.totalInterest,
      extraYearly: faster.yearly,
      interestSaved: base.totalInterest - faster.totalInterest,
      monthsSaved: base.months - faster.months
    };
  }

  /*
   * Debt payoff: snowball (smallest balance first) or avalanche (highest rate first).
   * debts: [{ name, balance, rate, minimum }], extra: amount on top of all minimums.
   * Each month: interest accrues, minimums are paid, and everything left in the budget
   * goes to the target debt. Minimums freed by paid-off debts stay in the budget.
   */
  function debtPayoff(debts, extra, strategy) {
    var list = debts.filter(function (d) { return d.balance > 0; }).map(function (d, i) {
      return { name: d.name, balance: d.balance, rate: d.rate, minimum: d.minimum, index: i, paidMonth: null, interest: 0 };
    });
    var budget = list.reduce(function (s, d) { return s + d.minimum; }, 0) + (extra || 0);
    var order = list.slice().sort(strategy === 'snowball'
      ? function (a, b) { return a.balance - b.balance || b.rate - a.rate; }
      : function (a, b) { return b.rate - a.rate || a.balance - b.balance; });
    var totalInterest = 0, month = 0;
    var path = [list.reduce(function (s, d) { return s + d.balance; }, 0)];
    while (list.some(function (d) { return d.balance > 0.005; }) && month < 1200) {
      month++;
      var left = budget;
      list.forEach(function (d) {
        if (d.balance <= 0.005) return;
        var int = d.balance * d.rate / 12;
        d.balance += int; d.interest += int; totalInterest += int;
      });
      list.forEach(function (d) {
        if (d.balance <= 0.005) return;
        var pay = Math.min(d.minimum, d.balance, left);
        d.balance -= pay; left -= pay;
      });
      for (var k = 0; k < order.length && left > 0.005; k++) {
        var t = order[k];
        if (t.balance <= 0.005) continue;
        var p = Math.min(t.balance, left);
        t.balance -= p; left -= p;
      }
      list.forEach(function (d) { if (d.balance <= 0.005 && d.paidMonth == null) { d.balance = 0; d.paidMonth = month; } });
      var total = list.reduce(function (s, d) { return s + d.balance; }, 0);
      path.push(total);
      if (total > 0.005 && total >= path[path.length - 2] - 1e-9) {
        // Budget doesn't cover the interest: the debt never goes down.
        return { months: Infinity, totalInterest: Infinity, budget: budget, order: [], path: path };
      }
    }
    var done = list.every(function (d) { return d.balance <= 0.005; });
    return {
      months: done ? month : Infinity,
      totalInterest: done ? totalInterest : Infinity,
      budget: budget,
      order: list.slice().sort(function (a, b) { return a.paidMonth - b.paidMonth; })
        .map(function (d) { return { name: d.name, month: d.paidMonth, interest: d.interest }; }),
      path: path
    };
  }

  /*
   * Education fund.
   * inputs: childAge, startAge, studyYears, annualCost (today), feeInflation, savings, returnRate
   * Fees are paid at the start of each study year; money not yet spent keeps earning returns.
   */
  function educationFund(inp) {
    var yearsUntil = Math.max(0, inp.startAge - inp.childAge);
    var costs = [], total = 0, target = 0;
    for (var k = 0; k < inp.studyYears; k++) {
      var c = inp.annualCost * Math.pow(1 + inp.feeInflation, yearsUntil + k);
      costs.push(c);
      total += c;
      target += c / Math.pow(1 + inp.returnRate, k);
    }
    return {
      yearsUntil: yearsUntil,
      costs: costs,
      totalCost: total,
      totalCostToday: inp.annualCost * inp.studyYears,
      target: target,
      savingsGrowTo: futureValue(inp.savings, 0, inp.returnRate, yearsUntil),
      monthlySaving: requiredMonthlySaving(target, inp.savings, inp.returnRate, yearsUntil)
    };
  }

  /*
   * Insurance needs (protection gap).
   * inputs: annualNeed, years, returnRate, inflation, debts, goals, finalExpenses, existingCover, assets
   * Income replacement is the lump sum that, invested at returnRate, pays annualNeed (rising with
   * inflation) at the start of each year for `years`.
   */
  function insuranceNeeds(inp) {
    var income = 0;
    for (var k = 0; k < inp.years; k++) income += inp.annualNeed * Math.pow((1 + inp.inflation) / (1 + inp.returnRate), k);
    var need = income + inp.debts + inp.goals + inp.finalExpenses;
    var have = inp.existingCover + inp.assets;
    return { income: income, need: need, have: have, gap: Math.max(0, need - have), surplus: Math.max(0, have - need) };
  }

  /*
   * Cost of delay: start saving now vs after `delay` years, same monthly amount, same end date.
   * inputs: monthlySaving, returnRate, years, delay, portfolio (optional starting amount, invested either way)
   */
  function costOfDelay(inp) {
    var p = inp.portfolio || 0;
    var delay = Math.min(inp.delay, inp.years);
    var now = futureValue(p, inp.monthlySaving, inp.returnRate, inp.years);
    var later = futureValue(futureValue(p, 0, inp.returnRate, delay), inp.monthlySaving, inp.returnRate, inp.years - delay);
    var catchUp = requiredMonthlySaving(now, futureValue(p, 0, inp.returnRate, delay), inp.returnRate, inp.years - delay);
    var pathNow = [], pathLater = [];
    for (var y = 0; y <= inp.years; y++) {
      pathNow.push(futureValue(p, inp.monthlySaving, inp.returnRate, y));
      pathLater.push(y <= delay ? futureValue(p, 0, inp.returnRate, y)
        : futureValue(futureValue(p, 0, inp.returnRate, delay), inp.monthlySaving, inp.returnRate, y - delay));
    }
    return {
      startNow: now,
      startLater: later,
      cost: now - later,
      contributedNow: inp.monthlySaving * inp.years * 12,
      contributedLater: inp.monthlySaving * (inp.years - delay) * 12,
      catchUpSaving: catchUp,
      pathNow: pathNow,
      pathLater: pathLater
    };
  }

  /*
   * Lump sum vs monthly investing (dollar-cost averaging).
   * inputs: amount, dcaMonths, horizonYears, returnRate, cashRate, shock
   * The market grows at returnRate, plus an extra move of `shock` (e.g. -0.2) spread evenly
   * over the DCA period. Money waiting to be invested earns cashRate.
   */
  function lumpVsDca(inp) {
    var r = monthlyRate(inp.returnRate);
    var c = monthlyRate(inp.cashRate);
    var N = Math.max(1, Math.round(inp.dcaMonths));
    var T = Math.max(N, Math.round(inp.horizonYears * 12));
    var price = function (m) { return Math.pow(1 + r, m) * Math.pow(1 + inp.shock, Math.min(m, N) / N); };
    var lumpUnits = inp.amount / price(0);
    var slice = inp.amount / N;
    var units = 0, cash = inp.amount;
    var lump = [], dca = [];
    for (var m = 0; m <= T; m++) {
      if (m > 0) cash *= 1 + c;
      if (m < N) { units += slice / price(m); cash -= slice; }
      lump.push(lumpUnits * price(m));
      dca.push(units * price(m) + Math.max(0, cash));
    }
    return { lump: lump[T], dca: dca[T], difference: lump[T] - dca[T], lumpPath: lump, dcaPath: dca, months: T };
  }

  var api = {
    monthlyRate: monthlyRate,
    futureValue: futureValue,
    requiredMonthlySaving: requiredMonthlySaving,
    simulateDrawdown: simulateDrawdown,
    planGoal: planGoal,
    projectPortfolio: projectPortfolio,
    drawdown: drawdown,
    sustainableWithdrawal: sustainableWithdrawal,
    emergencyFund: emergencyFund,
    loanPayment: loanPayment,
    loan: loan,
    debtPayoff: debtPayoff,
    educationFund: educationFund,
    insuranceNeeds: insuranceNeeds,
    costOfDelay: costOfDelay,
    lumpVsDca: lumpVsDca,
    MAX_RETIREMENT_YEARS: MAX_RETIREMENT_YEARS
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.RC = api;
})(this);
