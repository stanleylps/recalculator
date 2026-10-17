(function () {
  'use strict';
  var U = RCUI;

  U.bindForm(document.getElementById('form'), function (v) {
    var inp = { monthlyExpenses: v.expenses, months: Math.round(v.months), current: v.current, monthlySaving: v.saving, interestRate: v.rate };
    var res = RC.emergencyFund(inp);
    var reached = isFinite(res.monthsToTarget);

    U.setText('heroValue', U.money(res.target));
    var sub = inp.months + ' months of essential expenses. ';
    if (res.gap === 0) sub += 'You’re already there.';
    else if (reached) sub += 'Saving ' + U.money(inp.monthlySaving) + ' a month, you’ll get there in ' + U.duration(res.monthsToTarget) + '.';
    else sub += 'Add a monthly amount to see when you’ll get there.';
    U.setText('heroSub', sub);

    U.setText('gap', U.money(res.gap));
    U.setText('gapNote', 'You have ' + U.money(inp.current));
    U.setText('time', res.gap === 0 ? 'Done' : reached ? U.duration(res.monthsToTarget) : 'Not reached');
    U.setText('timeNote', reached && res.gap > 0 ? 'Saving ' + U.money(inp.monthlySaving) + ' a month' : '');
    U.setText('cover', isFinite(res.coverMonths) ? (Math.round(res.coverMonths * 10) / 10) + ' months' : '—');
    U.setText('coverNote', 'Of essential expenses');
    var card = document.getElementById('coverCard');
    card.classList.toggle('good', res.coverMonths >= inp.months);
    card.classList.toggle('warn', res.coverMonths < inp.months && res.coverMonths >= 3);
    card.classList.toggle('bad', res.coverMonths < 3);
    var interest = reached ? res.path[res.path.length - 1] - inp.current - inp.monthlySaving * res.monthsToTarget : 0;
    U.setText('interest', U.money(Math.max(0, interest)));
    U.setText('interestNote', 'Keep it somewhere safe and easy to reach');

    var span = reached ? Math.max(res.monthsToTarget + 3, 12) : 60;
    var bal = [], b = inp.current, r = RC.monthlyRate(inp.interestRate);
    for (var m = 0; m <= span; m++) { bal.push(b); b = b * (1 + r) + inp.monthlySaving; }
    var labels = bal.map(function (_, m) { return 'Mo ' + m; });
    RCChart.render(document.getElementById('chart'), {
      ariaLabel: 'Emergency savings over time',
      labels: labels,
      series: [
        { values: bal, stroke: 'var(--save)', fill: 'var(--save-fill)' },
        { values: bal.map(function () { return res.target; }), stroke: 'var(--contrib)', width: 2, dash: '6 5' }
      ],
      markers: reached && res.gap > 0 ? [{ index: res.monthsToTarget, label: 'Target reached' }] : [],
      yFormat: U.compact,
      tip: function (i) { return '<b>Month ' + i + '</b><span>' + U.money(bal[i]) + ' saved</span><span>Target ' + U.money(res.target) + '</span>'; }
    });
    document.getElementById('explain').textContent = 'Your target is ' + inp.months + ' × ' + U.money(inp.monthlyExpenses) +
      ' = ' + U.money(res.target) + '. Keep it in a safe, easy-to-reach account, separate from your investments, so you never have to sell investments at a bad time to cover a surprise bill.';
  });
})();
