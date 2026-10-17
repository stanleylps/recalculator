/*
 * Tiny dependency-free SVG area/line chart.
 * RCChart.render(container, {
 *   labels: [..],                       // x labels, one per point
 *   series: [{ values, stroke, fill }], // values may contain null gaps
 *   markers: [{ index, label }],        // dashed vertical lines
 *   yFormat: fn(number) -> string,      // axis labels
 *   tip: fn(index) -> html              // hover tooltip content
 * })
 */
(function (root) {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';

  function el(name, attrs, parent) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  function niceStep(range, count) {
    var raw = range / count;
    var mag = Math.pow(10, Math.floor(Math.log10(raw)));
    var norm = raw / mag;
    var nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
    return nice * mag;
  }

  function render(container, opts) {
    container._rcOpts = opts;
    if (!container._rcObserved && 'ResizeObserver' in window) {
      container._rcObserved = true;
      var lastW = 0;
      new ResizeObserver(function () {
        var w = container.clientWidth;
        if (w && Math.abs(w - lastW) > 4) { lastW = w; draw(container); }
      }).observe(container);
    }
    draw(container);
  }

  function draw(container) {
    var opts = container._rcOpts;
    var W = Math.max(container.clientWidth, 280);
    var H = W < 520 ? 240 : 320;
    var pad = { t: 22, r: 12, b: 28, l: W < 520 ? 52 : 64 };
    var n = opts.labels.length;
    var maxV = 0;
    opts.series.forEach(function (s) { s.values.forEach(function (v) { if (v != null && v > maxV) maxV = v; }); });
    if (maxV <= 0) maxV = 1;
    var step = niceStep(maxV, W < 520 ? 4 : 5);
    var top = Math.ceil(maxV / step) * step;

    var x = function (i) { return pad.l + (n <= 1 ? 0 : (i / (n - 1)) * (W - pad.l - pad.r)); };
    var y = function (v) { return pad.t + (1 - v / top) * (H - pad.t - pad.b); };

    container.innerHTML = '';
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': opts.ariaLabel || 'Chart' }, container);

    var grid = el('g', { class: 'grid' }, svg);
    var axis = el('g', { class: 'axis' }, svg);
    for (var v = 0; v <= top + 1e-9; v += step) {
      el('line', { x1: pad.l, x2: W - pad.r, y1: y(v), y2: y(v) }, grid);
      var t = el('text', { x: pad.l - 8, y: y(v) + 4, 'text-anchor': 'end' }, axis);
      t.textContent = opts.yFormat(v);
    }
    var xTicks = Math.min(n - 1, W < 520 ? 5 : 10) || 1;
    var xEvery = Math.ceil((n - 1) / xTicks) || 1;
    for (var i = 0; i < n; i += xEvery) {
      var tx = el('text', { x: x(i), y: H - 8, 'text-anchor': 'middle' }, axis);
      tx.textContent = opts.labels[i];
    }

    opts.series.forEach(function (s) {
      var segs = [], cur = [];
      s.values.forEach(function (val, i) {
        if (val == null) { if (cur.length) segs.push(cur); cur = []; }
        else cur.push([x(i), y(val)]);
      });
      if (cur.length) segs.push(cur);
      segs.forEach(function (pts) {
        var line = pts.map(function (p, k) { return (k ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
        if (s.fill) {
          var area = line + ' L' + pts[pts.length - 1][0].toFixed(1) + ' ' + y(0) + ' L' + pts[0][0].toFixed(1) + ' ' + y(0) + ' Z';
          el('path', { d: area, fill: s.fill, stroke: 'none' }, svg);
        }
        el('path', { d: line, fill: 'none', stroke: s.stroke, 'stroke-width': s.width || 2.5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', 'stroke-dasharray': s.dash || '' }, svg);
      });
    });

    (opts.markers || []).forEach(function (m) {
      var g = el('g', { class: 'marker' }, svg);
      el('line', { x1: x(m.index), x2: x(m.index), y1: pad.t - 6, y2: y(0) }, g);
      var anchor = x(m.index) > W * 0.75 ? 'end' : 'start';
      var lt = el('text', { x: x(m.index) + (anchor === 'end' ? -6 : 6), y: pad.t - 8, 'text-anchor': anchor }, g);
      lt.textContent = m.label;
    });

    // Hover
    var hover = el('line', { class: 'hover-line', y1: pad.t, y2: y(0), opacity: 0 }, svg);
    var dots = opts.series.map(function (s) { return el('circle', { r: 4, fill: s.stroke, opacity: 0 }, svg); });
    var tip = document.createElement('div');
    tip.className = 'chart-tip';
    container.appendChild(tip);

    function show(evt) {
      var rect = svg.getBoundingClientRect();
      var px = ((evt.touches ? evt.touches[0].clientX : evt.clientX) - rect.left) * (W / rect.width);
      var i = Math.round(((px - pad.l) / (W - pad.l - pad.r)) * (n - 1));
      i = Math.max(0, Math.min(n - 1, i));
      hover.setAttribute('x1', x(i)); hover.setAttribute('x2', x(i)); hover.setAttribute('opacity', 1);
      var minY = H;
      opts.series.forEach(function (s, k) {
        var val = s.values[i];
        if (val == null) { dots[k].setAttribute('opacity', 0); return; }
        dots[k].setAttribute('cx', x(i)); dots[k].setAttribute('cy', y(val)); dots[k].setAttribute('opacity', 1);
        minY = Math.min(minY, y(val));
      });
      tip.innerHTML = opts.tip(i);
      tip.style.opacity = 1;
      var scale = rect.width / W;
      var left = x(i) * scale;
      var half = tip.offsetWidth / 2;
      left = Math.max(half, Math.min(rect.width - half, left));
      tip.style.left = left + 'px';
      tip.style.top = Math.max(tip.offsetHeight, (minY - 10) * scale) + 'px';
    }
    function hide() {
      hover.setAttribute('opacity', 0);
      dots.forEach(function (d) { d.setAttribute('opacity', 0); });
      tip.style.opacity = 0;
    }
    svg.addEventListener('mousemove', show);
    svg.addEventListener('touchstart', show, { passive: true });
    svg.addEventListener('touchmove', show, { passive: true });
    svg.addEventListener('mouseleave', hide);
  }

  root.RCChart = { render: render };
})(this);
