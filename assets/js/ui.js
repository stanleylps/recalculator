/*
 * Shared UI helpers: number formatting, form binding, shareable URLs.
 *
 * Inputs opt in with data attributes:
 *   <input data-key="income" data-type="money|percent|number" data-min=".." data-max="..">
 *   <input type="range" data-mirror="income">   (optional slider kept in sync)
 * Percent fields are typed as 6 (meaning 6%) and handed to calculators as 0.06.
 */
(function (root) {
  'use strict';

  var CURRENCY = '$';

  function money(v) {
    if (!isFinite(v)) return '—';
    var sign = v < 0 ? '-' : '';
    return sign + CURRENCY + Math.round(Math.abs(v)).toLocaleString('en-US');
  }

  function compact(v) {
    var a = Math.abs(v);
    if (a >= 1e9) return CURRENCY + trim(v / 1e9) + 'B';
    if (a >= 1e6) return CURRENCY + trim(v / 1e6) + 'M';
    if (a >= 1e3) return CURRENCY + trim(v / 1e3) + 'K';
    return CURRENCY + Math.round(v);
  }
  function trim(x) { return (Math.round(x * 10) / 10).toString(); }

  function duration(months) {
    var y = Math.floor(months / 12);
    var m = Math.floor(months - y * 12);
    if (y === 0) return m + (m === 1 ? ' month' : ' months');
    return y + (y === 1 ? ' year' : ' years') + (m ? ' ' + m + (m === 1 ? ' month' : ' months') : '');
  }

  function parseNum(str) {
    var n = parseFloat(String(str).replace(/[^0-9.\-]/g, ''));
    return isFinite(n) ? n : NaN;
  }

  function showNum(input, n) {
    input.value = input.dataset.type === 'money' ? Math.round(n).toLocaleString('en-US') : String(n);
  }

  /*
   * bindForm(form, onChange)
   * Reads every [data-key] input, validates, and calls onChange(values) on each edit.
   * Values come from the URL query first, then the input's default value.
   */
  function bindForm(form, onChange) {
    var inputs = Array.prototype.slice.call(form.querySelectorAll('[data-key]'));
    var defaults = {};
    var query = new URLSearchParams(location.search);

    inputs.forEach(function (inp) {
      var key = inp.dataset.key;
      defaults[key] = parseNum(inp.value);
      if (query.has(key) && isFinite(parseNum(query.get(key)))) showNum(inp, parseNum(query.get(key)));
      else showNum(inp, defaults[key]);
      inp.setAttribute('inputmode', 'decimal');
      inp.addEventListener('input', function () { syncSlider(key, inp.value); update(); });
      inp.addEventListener('blur', function () {
        var n = parseNum(inp.value);
        if (isFinite(n)) showNum(inp, clamp(inp, n));
        syncSlider(key, inp.value);
        update();
      });
    });

    form.querySelectorAll('[data-mirror]').forEach(function (range) {
      var target = form.querySelector('[data-key="' + range.dataset.mirror + '"]');
      range.value = parseNum(target.value);
      range.addEventListener('input', function () { showNum(target, parseFloat(range.value)); update(); });
    });

    function syncSlider(key, raw) {
      var range = form.querySelector('[data-mirror="' + key + '"]');
      var n = parseNum(raw);
      if (range && isFinite(n)) range.value = n;
    }

    function clamp(inp, n) {
      if (inp.dataset.min != null) n = Math.max(parseFloat(inp.dataset.min), n);
      if (inp.dataset.max != null) n = Math.min(parseFloat(inp.dataset.max), n);
      return n;
    }

    function read() {
      var out = {}, ok = true;
      inputs.forEach(function (inp) {
        var n = parseNum(inp.value);
        var bad = !isFinite(n) || n !== clamp(inp, n);
        inp.closest('.field').classList.toggle('invalid', bad);
        if (bad) { ok = false; n = clamp(inp, isFinite(n) ? n : defaults[inp.dataset.key]); }
        out[inp.dataset.key] = inp.dataset.type === 'percent' ? n / 100 : n;
      });
      return { values: out, ok: ok };
    }

    function writeUrl() {
      var q = new URLSearchParams();
      inputs.forEach(function (inp) {
        var n = parseNum(inp.value);
        if (isFinite(n) && n !== defaults[inp.dataset.key]) q.set(inp.dataset.key, n);
      });
      var s = q.toString();
      history.replaceState(null, '', location.pathname + (s ? '?' + s : ''));
    }

    function update() {
      var r = read();
      writeUrl();
      onChange(r.values, r.ok);
    }

    var reset = form.querySelector('[data-action="reset"]');
    if (reset) reset.addEventListener('click', function () {
      inputs.forEach(function (inp) { showNum(inp, defaults[inp.dataset.key]); syncSlider(inp.dataset.key, inp.value); });
      update();
    });
    var share = form.querySelector('[data-action="share"]');
    if (share) share.addEventListener('click', function () {
      var done = function () { var t = share.textContent; share.textContent = 'Link copied'; setTimeout(function () { share.textContent = t; }, 1600); };
      if (navigator.clipboard) navigator.clipboard.writeText(location.href).then(done, function () { prompt('Copy this link', location.href); });
      else prompt('Copy this link', location.href);
    });

    update();
    return { refresh: update };
  }

  // Two-button toggle; calls onChange(value) and returns the current value getter.
  function bindToggle(el, onChange) {
    var buttons = el.querySelectorAll('button');
    var current = el.querySelector('[aria-pressed="true"]').dataset.value;
    buttons.forEach(function (b) {
      b.addEventListener('click', function () {
        buttons.forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
        current = b.dataset.value;
        onChange(current);
      });
    });
    return function () { return current; };
  }

  function setText(id, text) { var n = document.getElementById(id); if (n) n.textContent = text; }

  root.RCUI = { money: money, compact: compact, duration: duration, bindForm: bindForm, bindToggle: bindToggle, setText: setText };
})(this);
