(function () {
  'use strict';
  var U = RCUI;
  var pct = function (x) { return (Math.round(x * 1000) / 10) + '%'; };

  U.bindForm(document.getElementById('form'), function (v) {
    var inp = { childAge: Math.round(v.childAge), startAge: Math.round(v.startAge), studyYears: Math.round(v.studyYears), annualCost: v.cost, feeInflation: v.feeInfl, savings: v.savings, returnRate: v.ret };
    var res = RC.educationFund(inp);

    if (res.yearsUntil <= 0) {
      U.setText('heroLabel', 'University starts now');
      U.setText('heroValue', U.money(Math.max(0, res.target - inp.savings)));
      U.setText('heroSub', 'more is needed today on top of what you’ve saved.');
    } else if (res.monthlySaving === 0) {
      U.setText('heroLabel', 'Good news');
      U.setText('heroValue', 'You’re on track');
      U.setText('heroSub', 'Your current savings should grow enough to cover the fees.');
    } else {
      U.setText('heroLabel', 'Save every month');
      U.setText('heroValue', U.money(res.monthlySaving));
      U.setText('heroSub', 'for ' + res.yearsUntil + (res.yearsUntil === 1 ? ' year' : ' years') + ', until your child starts university at ' + inp.startAge + '.');
    }
    U.setText('total', U.money(res.totalCost));
    U.setText('totalNote', U.money(res.totalCostToday) + ' in today’s money');
    U.setText('target', U.money(res.target));
    U.setText('targetNote', 'Less than the total, because unspent money keeps growing');
    U.setText('grow', U.money(res.savingsGrowTo));
    U.setText('growNote', 'By the time university starts');
    U.setText('first', U.money(res.costs[0] || 0));
    U.setText('firstNote', U.money(inp.annualCost) + ' today, after ' + res.yearsUntil + ' years of ' + pct(inp.feeInflation) + ' cost inflation');

    document.getElementById('rows').innerHTML = res.costs.map(function (c, k) {
      return '<tr><td>Year ' + (k + 1) + '</td><td>' + (inp.startAge + k) + '</td><td>' + U.money(c) + '</td></tr>';
    }).join('') + '<tr><td><strong>Total</strong></td><td></td><td><strong>' + U.money(res.totalCost) + '</strong></td></tr>';

    document.getElementById('explain').textContent = 'University costs ' + U.money(inp.annualCost) + ' a year today. With costs rising ' +
      pct(inp.feeInflation) + ' a year, ' + inp.studyYears + ' years of study starting in ' + res.yearsUntil + ' years will cost ' +
      U.money(res.totalCost) + ' in total. Because fees are paid year by year, you need ' + U.money(res.target) +
      ' in the fund on day one, with the rest earning ' + pct(inp.returnRate) + ' while it waits.';
  });
})();
