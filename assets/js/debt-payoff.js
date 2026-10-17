(function () {
  'use strict';
  var U = RCUI;
  var DEFAULT_DEBTS = [
    { name: 'Credit card', balance: 5000, rate: 24, minimum: 150 },
    { name: 'Car loan', balance: 15000, rate: 6, minimum: 300 },
    { name: 'Personal loan', balance: 2000, rate: 12, minimum: 60 }
  ];
  var listEl = document.getElementById('debts');
  var extra = 0;

  // Debts live in the URL as d=name~balance~rate~minimum|...
  function readUrl() {
    var raw = new URLSearchParams(location.search).get('d');
    if (!raw) return DEFAULT_DEBTS.map(function (d) { return Object.assign({}, d); });
    return raw.split('|').map(function (s) {
      var p = s.split('~');
      return { name: p[0] || 'Debt', balance: +p[1] || 0, rate: +p[2] || 0, minimum: +p[3] || 0 };
    });
  }
  function writeUrl(debts) {
    var q = new URLSearchParams(location.search);
    var enc = debts.map(function (d) { return [d.name.replace(/[~|]/g, ' '), d.balance, d.rate, d.minimum].join('~'); }).join('|');
    var def = DEFAULT_DEBTS.map(function (d) { return [d.name, d.balance, d.rate, d.minimum].join('~'); }).join('|');
    if (enc === def) q.delete('d'); else q.set('d', enc);
    var s = q.toString();
    history.replaceState(null, '', location.pathname + (s ? '?' + s : ''));
  }

  function field(label, cls, value, prefix, suffix) {
    return '<div><label>' + label + '</label><div class="input">' + (prefix ? '<span class="affix">' + prefix + '</span>' : '') +
      '<input class="' + cls + '" inputmode="decimal" value="' + value + '">' + (suffix ? '<span class="affix">' + suffix + '</span>' : '') + '</div></div>';
  }
  function row(d) {
    var el = document.createElement('div');
    el.className = 'debt';
    el.innerHTML = '<div class="debt-head"><input class="d-name" aria-label="Debt name"><button type="button" class="d-remove">Remove</button></div>' +
      '<div class="debt-grid">' + field('Balance', 'd-balance', Math.round(d.balance).toLocaleString('en-US'), '$') +
      field('Interest', 'd-rate', d.rate, '', '%') + field('Minimum / mo', 'd-min', Math.round(d.minimum).toLocaleString('en-US'), '$') + '</div>';
    el.querySelector('.d-name').value = d.name;
    el.querySelector('.d-remove').addEventListener('click', function () { el.remove(); update(); });
    el.querySelectorAll('input').forEach(function (i) { i.addEventListener('input', update); });
    listEl.appendChild(el);
  }
  function num(el, sel) { var n = parseFloat(el.querySelector(sel).value.replace(/[^0-9.\-]/g, '')); return isFinite(n) && n >= 0 ? n : 0; }
  function readDebts() {
    return Array.prototype.map.call(listEl.querySelectorAll('.debt'), function (el) {
      return { name: el.querySelector('.d-name').value.trim() || 'Debt', balance: num(el, '.d-balance'), rate: num(el, '.d-rate'), minimum: num(el, '.d-min') };
    });
  }

  document.getElementById('addDebt').addEventListener('click', function () {
    row({ name: 'Debt ' + (listEl.children.length + 1), balance: 1000, rate: 10, minimum: 50 });
    update();
  });

  readUrl().forEach(row);
  var form = U.bindForm(document.getElementById('form'), function (v) { extra = v.extra; update(); });
  document.querySelector('[data-action="reset"]').addEventListener('click', function () {
    listEl.innerHTML = '';
    DEFAULT_DEBTS.forEach(row);
    update();
  });

  function update() {
    var raw = readDebts();
    writeUrl(raw);
    var debts = raw.map(function (d) { return { name: d.name, balance: d.balance, rate: d.rate / 100, minimum: d.minimum }; });
    if (!debts.some(function (d) { return d.balance > 0; })) {
      U.setText('heroValue', 'No debts');
      U.setText('heroSub', 'Add a debt with a balance to compare the two methods.');
      return;
    }
    var av = RC.debtPayoff(debts, extra, 'avalanche');
    var sb = RC.debtPayoff(debts, extra, 'snowball');
    var never = !isFinite(av.months) && !isFinite(sb.months);

    if (never) {
      U.setText('heroValue', 'Never');
      U.setText('heroSub', 'Your payments don’t cover the interest. Increase the extra amount or the minimums.');
    } else {
      var best = Math.min(av.months, sb.months);
      U.setText('heroValue', U.duration(best));
      var diff = sb.totalInterest - av.totalInterest;
      U.setText('heroSub', 'paying ' + U.money(av.budget) + ' a month. ' + (diff > 1
        ? 'Avalanche saves you ' + U.money(diff) + ' in interest compared with snowball.'
        : 'Both methods cost about the same here, so pick the one that keeps you motivated.'));
    }
    show('av', av); show('sb', sb);
    var avWins = av.totalInterest < sb.totalInterest - 1;
    document.getElementById('avBadge').hidden = !avWins;
    document.getElementById('sbBadge').hidden = true;
    document.getElementById('avCard').classList.toggle('winner', avWins);

    var n = Math.max(av.path.length, sb.path.length);
    if (never) n = Math.min(n, 120);
    var labels = [], a = [], s = [];
    for (var m = 0; m < n; m++) {
      labels.push('Mo ' + m);
      a.push(m < av.path.length ? av.path[m] : 0);
      s.push(m < sb.path.length ? sb.path[m] : 0);
    }
    RCChart.render(document.getElementById('chart'), {
      ariaLabel: 'Total debt over time',
      labels: labels,
      series: [
        { values: s, stroke: 'var(--draw)', width: 2 },
        { values: a, stroke: 'var(--save)', fill: 'var(--save-fill)' }
      ],
      yFormat: U.compact,
      tip: function (i) { return '<b>Month ' + i + '</b><span>Avalanche ' + U.money(a[i]) + '</span><span>Snowball ' + U.money(s[i]) + '</span>'; }
    });
    document.getElementById('explain').textContent = 'Snowball clears the smallest balance first, so you see debts disappear sooner and stay motivated. ' +
      'Avalanche targets the highest interest rate first, which usually means paying less interest overall. Either way, keep paying every minimum and send the extra to one debt at a time.';

    document.getElementById('orders').innerHTML = [['Avalanche', av], ['Snowball', sb]].map(function (x) {
      var items = x[1].order.map(function (o, k) { return '<li>' + escapeHtml(o.name) + ' <span style="color:var(--ink-3)">· cleared in ' + U.duration(o.month) + '</span></li>'; }).join('');
      return '<div><strong>' + x[0] + '</strong><ol style="margin:8px 0 0;padding-left:20px">' + (items || '<li>Never paid off</li>') + '</ol></div>';
    }).join('');
  }

  function show(id, r) {
    U.setText(id + 'Time', isFinite(r.months) ? U.duration(r.months) : 'Never');
    U.setText(id + 'Note', isFinite(r.totalInterest) ? 'Total interest ' + U.money(r.totalInterest) : 'Payments don’t cover the interest');
  }
  function escapeHtml(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
})();
