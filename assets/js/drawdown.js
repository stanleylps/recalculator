(function () {
  'use strict';
  var U = RCUI;
  var last = null;
  var view = U.bindToggle(document.getElementById('view'), function () { if (last) draw(last.inp, last.res); });
  var pct = function (x) { return (Math.round(x * 1000) / 10) + '%'; };

  U.bindForm(document.getElementById('form'), function (v) {
    var inp = { balance: v.balance, monthlyWithdrawal: v.withdrawal, age: v.age, returnRate: v.ret, inflation: v.infl, targetYears: Math.round(v.target) };
    var res = RC.drawdown(inp);
    last = { inp: inp, res: res };
    summarize(inp, res);
    draw(inp, res);
  });

  function balanceAfter(inp, years) {
    var r = RC.monthlyRate(inp.returnRate), g = RC.monthlyRate(inp.inflation);
    var b = inp.balance, w = inp.monthlyWithdrawal;
    for (var m = 0; m < years * 12; m++) { if (b < w) return 0; b = (b - w) * (1 + r); w *= 1 + g; }
    return b;
  }

  function totalWithdrawn(inp, months) {
    var g = RC.monthlyRate(inp.inflation), w = inp.monthlyWithdrawal, t = 0;
    for (var m = 0; m < Math.floor(months); m++) { t += w; w *= 1 + g; }
    return t + (months % 1) * w;
  }

  function summarize(inp, res) {
    if (res.depleted) {
      U.setText('heroValue', U.duration(res.lastsMonths));
      U.setText('heroSub', 'Your money runs out around age ' + Math.floor(inp.age + res.lastsMonths / 12) + '.');
    } else {
      U.setText('heroValue', RC.MAX_RETIREMENT_YEARS + '+ years');
      U.setText('heroSub', 'Your returns keep up with your withdrawals, so the money doesn’t run out.');
    }
    U.setText('sustainable', U.money(res.sustainableWithdrawal) + ' / mo');
    U.setText('sustainableNote', 'Lasts exactly ' + inp.targetYears + ' years, to age ' + (inp.age + inp.targetYears));
    var card = document.getElementById('sustainableCard');
    card.classList.toggle('good', res.sustainableWithdrawal >= inp.monthlyWithdrawal);
    card.classList.toggle('bad', res.sustainableWithdrawal < inp.monthlyWithdrawal);

    var rate = inp.balance > 0 ? inp.monthlyWithdrawal * 12 / inp.balance : 0;
    U.setText('rate', pct(rate));
    U.setText('rateNote', 'Your first year’s income ÷ your lump sum');
    var months = res.depleted ? res.lastsMonths : inp.targetYears * 12;
    U.setText('withdrawn', U.money(totalWithdrawn(inp, months)));
    U.setText('withdrawnNote', res.depleted ? 'Before the money runs out' : 'Over your first ' + inp.targetYears + ' years');
    U.setText('left', U.money(balanceAfter(inp, inp.targetYears)));
    U.setText('leftNote', 'At age ' + (inp.age + inp.targetYears));

    var explain = 'You draw ' + U.money(inp.monthlyWithdrawal) + ' a month to start, rising ' + pct(inp.inflation) +
      ' a year with inflation, while the rest earns ' + pct(inp.returnRate) + '. ';
    if (res.sustainableWithdrawal >= inp.monthlyWithdrawal) explain += 'That’s within the ' + U.money(res.sustainableWithdrawal) + ' a month that would last your target of ' + inp.targetYears + ' years.';
    else explain += 'To make it last ' + inp.targetYears + ' years you would need to draw no more than ' + U.money(res.sustainableWithdrawal) + ' a month, or ' + U.money(inp.monthlyWithdrawal - res.sustainableWithdrawal) + ' less.';
    document.getElementById('explain').textContent = explain;
  }

  function draw(inp, res) {
    var real = view() === 'real';
    var endYear = res.depleted ? res.yearlyBalances.length - 1 : Math.max(inp.targetYears + 5, 100 - inp.age);
    var bals = res.yearlyBalances.slice(0, endYear + 1);
    var d = function (v, y) { return real ? v / Math.pow(1 + inp.inflation, y) : v; };
    var labels = bals.map(function (_, y) { return String(inp.age + y); });
    var markers = [];
    if (inp.targetYears < bals.length) markers.push({ index: inp.targetYears, label: 'Target: age ' + (inp.age + inp.targetYears) });
    if (res.depleted) markers.push({ index: bals.length - 1, label: 'Runs out ~' + Math.floor(inp.age + res.lastsMonths / 12) });
    RCChart.render(document.getElementById('chart'), {
      ariaLabel: 'Balance by age',
      labels: labels,
      series: [{ values: bals.map(d), stroke: 'var(--draw)', fill: 'var(--draw-fill)' }],
      markers: markers,
      yFormat: U.compact,
      tip: function (i) { return '<b>Age ' + labels[i] + '</b><span>' + U.money(d(bals[i], i)) + (real ? ' (today’s $)' : '') + '</span>'; }
    });
    document.getElementById('rows').innerHTML = bals.map(function (b, y) {
      return '<tr><td>' + (inp.age + y) + '</td><td>' + (b > 0 ? U.money(inp.monthlyWithdrawal * Math.pow(1 + inp.inflation, y)) : '—') + '</td><td>' + U.money(b) + '</td></tr>';
    }).join('');
  }
})();
