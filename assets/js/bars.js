// Renders a list of labelled horizontal bars into a container.
// rows: [{ label, value, kind: ''|'neg'|'muted', total: bool }]
(function (root) {
  'use strict';
  root.RCBars = function (el, rows, format) {
    var max = rows.reduce(function (m, r) { return Math.max(m, Math.abs(r.value)); }, 0) || 1;
    el.innerHTML = rows.map(function (r) {
      var w = Math.max(0, Math.min(100, Math.abs(r.value) / max * 100));
      return '<div class="bar-row' + (r.total ? ' total' : '') + '"><span class="bar-label">' + r.label + '</span>' +
        '<span class="bar-track"><span class="bar-fill ' + (r.kind || '') + '" style="width:' + w.toFixed(1) + '%;display:block"></span></span>' +
        '<span class="bar-value">' + format(r.value) + '</span></div>';
    }).join('');
  };
})(this);
