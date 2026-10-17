(function () {
  'use strict';
  var U = RCUI;
  var last = null;
  var view = U.bindToggle(document.getElementById('view'), function () { if (last) draw(last.inp, last.res); });

  U.bindForm(document.getElementById('form'), function (v) {
    var inp = {
      monthlyIncome: v.income,
      currentAge: v.age,
      years: Math.round(v.years),
      portfolio: v.portfolio,
      returnRate: v.ret,
      retirementReturn: v.retDraw,
      inflation: v.infl,
      withdrawalRate: v.wr
    };
    var res = RC.planGoal(inp);
    last = { inp: inp, res: res };
    summarize(inp, res);
    draw(inp, res);
  });

  function summarize(inp, res) {
    var retireAge = inp.currentAge + inp.years;

    if (res.alreadyOnTrack) {
      U.setText('heroLabel', 'Good news');
      U.setText('heroValue', 'You’re on track');
      U.setText('heroSub', 'Your current portfolio alone should grow past the ' + U.money(res.target) + ' you need by age ' + retireAge + ', without saving another dollar.');
    } else {
      U.setText('heroLabel', 'Save every month');
      U.setText('heroValue', U.money(res.monthlySaving));
      U.setText('heroSub', 'for ' + inp.years + ' years to retire at ' + retireAge + ' with ' + U.money(res.target) + '.');
    }

    U.setText('target', U.money(res.target));
    U.setText('targetNote', U.money(res.targetToday) + ' in today’s dollars');
    U.setText('futureIncome', U.money(res.futureMonthlyIncome));
    U.setText('futureIncomeNote', 'Same buying power as ' + U.money(inp.monthlyIncome) + ' today');
    U.setText('alone', U.money(res.projectedWithoutSaving));

    var card = document.getElementById('lastsCard');
    card.classList.remove('good', 'warn', 'bad');
    if (!res.depleted) {
      U.setText('lasts', RC.MAX_RETIREMENT_YEARS + '+ years');
      U.setText('lastsNote', 'Returns keep up with your withdrawals');
      card.classList.add('good');
    } else {
      U.setText('lasts', U.duration(res.lastsMonths));
      U.setText('lastsNote', 'Runs out around age ' + Math.floor(res.runOutAge));
      card.classList.add(res.runOutAge >= 95 ? 'good' : res.runOutAge >= 85 ? 'warn' : 'bad');
    }

    var pct = function (x) { return (Math.round(x * 1000) / 10) + '%'; };
    var explain = 'You want ' + U.money(inp.monthlyIncome) + ' a month in today’s money. After ' + inp.years +
      ' years of ' + pct(inp.inflation) + ' inflation that is ' + U.money(res.futureMonthlyIncome) + ' a month, or ' +
      U.money(res.futureMonthlyIncome * 12) + ' a year. At a ' + pct(inp.withdrawalRate) + ' drawdown rate you need ' +
      U.money(res.futureMonthlyIncome * 12) + ' ÷ ' + pct(inp.withdrawalRate) + ' = ' + U.money(res.target) + '. ';
    if (res.depleted) {
      explain += 'Because your income keeps rising with inflation and the portfolio earns ' + pct(inp.retirementReturn) +
        ', the money runs out after about ' + U.duration(res.lastsMonths) + '. A lower drawdown rate makes it last longer.';
    } else {
      explain += 'At a ' + pct(inp.retirementReturn) + ' return, the portfolio keeps pace with your inflation-adjusted withdrawals indefinitely.';
    }
    document.getElementById('explain').textContent = explain;
  }

  function draw(inp, res) {
    var real = view() === 'real';
    var deflate = function (p) { return real ? p.balance / Math.pow(1 + inp.inflation, p.year) : p.balance; };

    var endYear = res.depleted
      ? Math.ceil(inp.years + res.lastsMonths / 12)
      : Math.max(inp.years + 30, 100 - inp.currentAge);
    var path = res.path.filter(function (p) { return p.year <= endYear; });

    var labels = path.map(function (p) { return String(inp.currentAge + p.year); });
    var save = path.map(function (p) { return p.year <= inp.years ? deflate(p) : null; });
    var drawdown = path.map(function (p) { return p.year >= inp.years ? deflate(p) : null; });

    var markers = [{ index: inp.years, label: 'Retire at ' + (inp.currentAge + inp.years) }];
    if (res.depleted) markers.push({ index: path.length - 1, label: 'Runs out ~' + Math.floor(res.runOutAge) });

    RCChart.render(document.getElementById('chart'), {
      ariaLabel: 'Portfolio balance by age',
      labels: labels,
      series: [
        { values: save, stroke: 'var(--save)', fill: 'var(--save-fill)' },
        { values: drawdown, stroke: 'var(--draw)', fill: 'var(--draw-fill)' }
      ],
      markers: markers,
      yFormat: U.compact,
      tip: function (i) {
        var p = path[i];
        return '<b>Age ' + labels[i] + (p.year === inp.years ? ' · retirement' : '') + '</b>' +
          '<span>' + U.money(deflate(p)) + (real ? ' (today’s $)' : '') + '</span>';
      }
    });

    var rows = res.path.filter(function (p) { return p.year <= endYear; }).map(function (p) {
      var phase = p.year < inp.years ? 'Saving' : p.year === inp.years ? 'Retire' : 'Drawing down';
      return '<tr class="' + (p.year > inp.years ? 'phase-draw' : '') + '"><td>' + (inp.currentAge + p.year) + '</td><td>' + phase +
        '</td><td>' + U.money(p.balance) + '</td><td>' + U.money(p.balance / Math.pow(1 + inp.inflation, p.year)) + '</td></tr>';
    });
    document.getElementById('rows').innerHTML = rows.join('');
  }
})();
