(function () {
  'use strict';
  var U = RCUI;
  var pct = function (x) { return (Math.round(x * 1000) / 10) + '%'; };

  U.bindForm(document.getElementById('form'), function (v) {
    var inp = { amount: v.amount, dcaMonths: Math.round(v.months), horizonYears: v.horizon, returnRate: v.ret, cashRate: v.cash, shock: v.shock };
    var res = RC.lumpVsDca(inp);
    var lumpAhead = res.difference >= 0;

    U.setText('heroLabel', 'After ' + inp.horizonYears + (inp.horizonYears === 1 ? ' year' : ' years'));
    U.setText('heroValue', Math.abs(res.difference) < 1 ? 'About the same' : (lumpAhead ? 'Lump sum' : 'Monthly investing') + ' ahead by ' + U.money(Math.abs(res.difference)));
    U.setText('heroSub', inp.shock === 0
      ? 'In a steadily rising market, money invested sooner has longer to grow.'
      : inp.shock < 0
        ? 'A ' + pct(-inp.shock) + ' fall while you invest means the monthly amounts buy in cheaper.'
        : 'A ' + pct(inp.shock) + ' rally while you invest means the monthly amounts buy in at higher prices.');
    U.setText('lump', U.money(res.lump));
    U.setText('lumpNote', 'All ' + U.money(inp.amount) + ' invested today');
    U.setText('dca', U.money(res.dca));
    U.setText('dcaNote', U.money(inp.amount / inp.dcaMonths) + ' a month for ' + inp.dcaMonths + ' months');
    document.getElementById('lumpBadge').hidden = !(res.difference >= 1);
    document.getElementById('dcaBadge').hidden = !(res.difference <= -1);
    document.getElementById('lumpCard').classList.toggle('winner', res.difference >= 1);
    document.getElementById('dcaCard').classList.toggle('winner', res.difference <= -1);

    RCChart.render(document.getElementById('chart'), {
      ariaLabel: 'Lump sum versus monthly investing',
      labels: res.lumpPath.map(function (_, m) { return 'Mo ' + m; }),
      series: [
        { values: res.lumpPath, stroke: 'var(--save)', fill: 'var(--save-fill)' },
        { values: res.dcaPath, stroke: 'var(--draw)', width: 2 }
      ],
      markers: [{ index: inp.dcaMonths, label: 'Fully invested' }],
      yFormat: U.compact,
      tip: function (i) { return '<b>Month ' + i + '</b><span>Lump sum ' + U.money(res.lumpPath[i]) + '</span><span>Monthly ' + U.money(res.dcaPath[i]) + '</span>'; }
    });
    document.getElementById('explain').textContent = 'Markets rise more often than they fall, so investing a lump sum straight away usually comes out ahead. ' +
      'Spreading it out costs some growth, but it softens the blow if the market falls just after you invest and can make it easier to stay invested. ' +
      'Try a negative market move to see the trade-off.';
  });
})();
