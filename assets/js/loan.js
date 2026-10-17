(function () {
  'use strict';
  var U = RCUI;

  U.bindForm(document.getElementById('form'), function (v) {
    var inp = { principal: v.principal, rate: v.rate, years: Math.round(v.years), extra: v.extra };
    var res = RC.loan(inp);

    U.setText('heroValue', U.money(res.payment));
    U.setText('heroSub', 'for ' + inp.years + ' years. Total interest ' + U.money(res.totalInterest) + '.');
    U.setText('interest', U.money(res.totalInterest));
    U.setText('interestNote', Math.round(res.totalInterest / inp.principal * 100) + '% of the amount borrowed');
    U.setText('paid', U.money(res.totalPaid));
    U.setText('paidNote', U.money(inp.principal) + ' borrowed + interest');
    if (inp.extra > 0) {
      U.setText('faster', U.duration(res.extraMonths));
      U.setText('fasterNote', U.duration(res.monthsSaved) + ' sooner, paying ' + U.money(res.payment + inp.extra) + ' a month');
      U.setText('saved', U.money(res.interestSaved));
      U.setText('savedNote', 'By paying ' + U.money(inp.extra) + ' extra each month');
    } else {
      U.setText('faster', U.duration(res.months));
      U.setText('fasterNote', 'Add an extra monthly payment to see the difference');
      U.setText('saved', U.money(0));
      U.setText('savedNote', 'No extra payments yet');
    }

    var n = res.yearly.length;
    var labels = res.yearly.map(function (_, y) { return 'Yr ' + y; });
    var fast = res.yearly.map(function (_, y) { return y < res.extraYearly.length ? res.extraYearly[y] : 0; });
    RCChart.render(document.getElementById('chart'), {
      ariaLabel: 'Loan balance over time',
      labels: labels,
      series: [
        { values: res.yearly, stroke: 'var(--contrib)', fill: 'var(--contrib-fill)', width: 2 },
        { values: inp.extra > 0 ? fast : res.yearly.map(function () { return null; }), stroke: 'var(--save)', fill: 'var(--save-fill)' }
      ],
      yFormat: U.compact,
      tip: function (i) {
        return '<b>Year ' + i + '</b><span>Normal ' + U.money(res.yearly[i]) + '</span>' + (inp.extra > 0 ? '<span>With extra ' + U.money(fast[i]) + '</span>' : '');
      }
    });
    document.getElementById('rows').innerHTML = res.yearly.map(function (b, y) {
      return '<tr><td>' + y + '</td><td>' + U.money(b) + '</td><td>' + (inp.extra > 0 ? U.money(fast[y]) : '—') + '</td></tr>';
    }).join('');
    document.getElementById('explain').textContent = inp.extra > 0
      ? 'Paying ' + U.money(inp.extra) + ' extra each month clears the loan ' + U.duration(res.monthsSaved) + ' early and saves ' + U.money(res.interestSaved) + ' in interest. Check with your lender whether early repayment carries any fees.'
      : 'Early on, most of each instalment goes to interest. Try adding an extra monthly payment to see how much sooner you could be debt-free.';
    if (n < 2) document.getElementById('rows').innerHTML = '';
  });
})();
