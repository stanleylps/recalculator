(function () {
  'use strict';
  var U = RCUI;
  var last = null;
  var view = U.bindToggle(document.getElementById('view'), function () { if (last) draw(last.inp, last.res); });

  U.bindForm(document.getElementById('form'), function (v) {
    var inp = {
      portfolio: v.portfolio,
      monthlySaving: v.saving,
      savingIncrease: v.step,
      years: Math.round(v.years),
      returnRate: v.ret,
      inflation: v.infl,
      withdrawalRate: v.wr
    };
    var res = RC.projectPortfolio(inp);
    last = { inp: inp, res: res };
    summarize(inp, res);
    draw(inp, res);
  });

  function summarize(inp, res) {
    var pct = function (x) { return (Math.round(x * 1000) / 10) + '%'; };
    U.setText('heroValue', U.money(res.futureValue));
    U.setText('heroSub', 'in ' + inp.years + ' years, saving ' + U.money(inp.monthlySaving) + ' a month' +
      (inp.savingIncrease ? ' (rising ' + pct(inp.savingIncrease) + ' a year)' : '') + ' at ' + pct(inp.returnRate) + ' a year.');
    U.setText('real', U.money(res.futureValueToday));
    U.setText('realNote', 'After ' + inp.years + ' years of ' + pct(inp.inflation) + ' inflation');
    U.setText('contrib', U.money(res.totalContributed));
    U.setText('contribNote', U.money(inp.portfolio) + ' today + ' + U.money(res.totalContributed - inp.portfolio) + ' saved');
    U.setText('growth', U.money(res.growth));
    var share = res.futureValue > 0 ? res.growth / res.futureValue : 0;
    U.setText('growthNote', Math.round(share * 100) + '% of your final portfolio');
    U.setText('income', U.money(res.monthlyIncome));
    U.setText('incomeNote', U.money(res.monthlyIncomeToday) + ' in today’s dollars, at ' + pct(inp.withdrawalRate));

    var explain = 'Each month you add ' + U.money(inp.monthlySaving) + ' and the whole portfolio earns ' + pct(inp.returnRate) +
      ' a year, compounded monthly. ';
    if (inp.savingIncrease) explain += 'Your monthly saving rises ' + pct(inp.savingIncrease) + ' each year, reaching ' + U.money(res.finalMonthlySaving) + ' in the final year. ';
    explain += 'Because prices also rise ' + pct(inp.inflation) + ' a year, ' + U.money(res.futureValue) + ' then buys what ' +
      U.money(res.futureValueToday) + ' buys today.';
    document.getElementById('explain').textContent = explain;
  }

  function draw(inp, res) {
    var real = view() === 'real';
    var d = function (v, year) { return real ? v / Math.pow(1 + inp.inflation, year) : v; };
    var path = res.path;

    RCChart.render(document.getElementById('chart'), {
      ariaLabel: 'Projected portfolio value by year',
      labels: path.map(function (p) { return 'Yr ' + p.year; }),
      series: [
        { values: path.map(function (p) { return d(p.balance, p.year); }), stroke: 'var(--save)', fill: 'var(--save-fill)' },
        { values: path.map(function (p) { return d(p.contributed, p.year); }), stroke: 'var(--contrib)', fill: 'var(--contrib-fill)', width: 2 }
      ],
      yFormat: U.compact,
      tip: function (i) {
        var p = path[i];
        return '<b>Year ' + p.year + (real ? ' · today’s $' : '') + '</b>' +
          '<span>Portfolio ' + U.money(d(p.balance, p.year)) + '</span>' +
          '<span>Put in ' + U.money(d(p.contributed, p.year)) + '</span>';
      }
    });

    document.getElementById('rows').innerHTML = path.map(function (p) {
      return '<tr><td>' + p.year + '</td><td>' + (p.year ? U.money(p.monthlySaving) : '—') + '</td><td>' + U.money(p.contributed) +
        '</td><td>' + U.money(p.balance) + '</td><td>' + U.money(p.real) + '</td></tr>';
    }).join('');
  }
})();
