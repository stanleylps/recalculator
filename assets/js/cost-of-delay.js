(function () {
  'use strict';
  var U = RCUI;

  U.bindForm(document.getElementById('form'), function (v) {
    var inp = { monthlySaving: v.saving, portfolio: v.portfolio, years: Math.round(v.years), delay: Math.min(Math.round(v.delay), Math.round(v.years)), returnRate: v.ret };
    var res = RC.costOfDelay(inp);

    U.setText('heroValue', U.money(res.cost));
    U.setText('heroSub', 'by retirement, if you wait ' + inp.delay + (inp.delay === 1 ? ' year' : ' years') + ' to start saving ' + U.money(inp.monthlySaving) + ' a month.');
    U.setText('now', U.money(res.startNow));
    U.setText('nowNote', 'Saving for ' + inp.years + ' years');
    U.setText('later', U.money(res.startLater));
    U.setText('laterNote', 'Saving for ' + (inp.years - inp.delay) + ' years');
    U.setText('catchup', isFinite(res.catchUpSaving) ? U.money(res.catchUpSaving) : '—');
    U.setText('catchupNote', isFinite(res.catchUpSaving) ? 'Instead of ' + U.money(inp.monthlySaving) + ', to end up with the same amount' : 'No time left to catch up');
    U.setText('contrib', U.money(res.contributedNow - res.contributedLater));
    U.setText('contribNote', 'You save this much less, but lose ' + U.money(res.cost) + ' at retirement');

    var ratio = res.contributedNow - res.contributedLater > 0 ? res.cost / (res.contributedNow - res.contributedLater) : 0;
    document.getElementById('explain').textContent = 'Starting ' + inp.delay + ' years later means putting in ' +
      U.money(res.contributedNow - res.contributedLater) + ' less, but ending up with ' + U.money(res.cost) + ' less' +
      (ratio > 1 ? ', about ' + ratio.toFixed(1) + ' times as much. ' : '. ') +
      'The earliest years matter most because that money has the longest to compound.';

    var labels = res.pathNow.map(function (_, y) { return 'Yr ' + y; });
    RCChart.render(document.getElementById('chart'), {
      ariaLabel: 'Start now versus start later',
      labels: labels,
      series: [
        { values: res.pathNow, stroke: 'var(--save)', fill: 'var(--save-fill)' },
        { values: res.pathLater, stroke: 'var(--draw)', fill: 'var(--draw-fill)' }
      ],
      markers: inp.delay > 0 ? [{ index: inp.delay, label: 'Start later' }] : [],
      yFormat: U.compact,
      tip: function (i) {
        return '<b>Year ' + i + '</b><span>Start today ' + U.money(res.pathNow[i]) + '</span><span>Start later ' + U.money(res.pathLater[i]) + '</span>';
      }
    });

    var delays = [0, 1, 2, 3, 5, 10, 15, 20].filter(function (d) { return d < inp.years; });
    document.getElementById('rows').innerHTML = delays.map(function (d) {
      var r = RC.costOfDelay({ monthlySaving: inp.monthlySaving, portfolio: inp.portfolio, years: inp.years, delay: d, returnRate: inp.returnRate });
      return '<tr><td>' + (d === 0 ? 'Start today' : d + (d === 1 ? ' year' : ' years')) + '</td><td>' + U.money(r.startLater) + '</td><td>' + U.money(r.cost) + '</td></tr>';
    }).join('');
  });
})();
