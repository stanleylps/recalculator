(function () {
  'use strict';
  var U = RCUI;

  U.bindForm(document.getElementById('form'), function (v) {
    var inp = { annualNeed: v.need, years: Math.round(v.years), returnRate: v.ret, inflation: v.infl, debts: v.debts, goals: v.goals, finalExpenses: v.final, existingCover: v.cover, assets: v.assets };
    var res = RC.insuranceNeeds(inp);

    if (res.gap > 0) {
      U.setText('heroLabel', 'Your protection gap');
      U.setText('heroValue', U.money(res.gap));
      U.setText('heroSub', 'This is the extra cover your family may need on top of what you already have.');
    } else {
      U.setText('heroLabel', 'No protection gap');
      U.setText('heroValue', 'Covered');
      U.setText('heroSub', 'What you have exceeds the estimated need by ' + U.money(res.surplus) + '.');
    }
    U.setText('needTotal', U.money(res.need));
    U.setText('haveTotal', U.money(res.have));
    U.setText('income', U.money(res.income));
    U.setText('incomeNote', U.money(inp.annualNeed) + ' a year for ' + inp.years + ' years');
    var yrs = inp.annualNeed > 0 ? res.gap / inp.annualNeed : 0;
    U.setText('gapYears', (Math.round(yrs * 10) / 10) + ' years');
    U.setText('gapYearsNote', 'Of family living costs');

    RCBars(document.getElementById('bars'), [
      { label: 'Living costs', value: res.income },
      { label: 'Debts', value: inp.debts },
      { label: 'Other goals', value: inp.goals },
      { label: 'Final expenses', value: inp.finalExpenses },
      { label: 'Total need', value: res.need, total: true },
      { label: 'Existing cover', value: inp.existingCover, kind: 'muted' },
      { label: 'Savings & investments', value: inp.assets, kind: 'muted' },
      { label: 'Protection gap', value: res.gap, kind: 'neg', total: true }
    ], U.money);

    document.getElementById('explain').textContent = 'This is a simple needs-based estimate. It doesn’t include government benefits, critical illness or disability cover, or changes in your family’s situation. Review it whenever your income, debts or family change.';
  });
})();
