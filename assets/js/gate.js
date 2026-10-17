/*
 * Email access gate. Visitors can browse the home page freely; opening a calculator
 * asks for an email once. After that, every calculator is unlocked on this device.
 * The email goes to api/subscribe.php, which adds it to the Sender group.
 */
(function () {
  'use strict';
  var KEY = 'lws_calc_access';
  var script = document.currentScript;
  var endpoint = new URL('../../api/subscribe.php', script.src).href;
  var cookiePath = new URL('../../', script.src).pathname;

  function unlocked() {
    try { if (localStorage.getItem(KEY)) return true; } catch (e) {}
    return new RegExp('(^|; )' + KEY + '=').test(document.cookie);
  }
  function unlock() {
    try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {}
    document.cookie = KEY + '=1; max-age=' + 60 * 60 * 24 * 730 + '; path=' + cookiePath + '; SameSite=Lax';
    document.documentElement.classList.remove('gated');
  }

  var isTool = !!document.querySelector('.calc');
  if (unlocked()) { document.documentElement.classList.remove('gated'); return; }

  var home = new URL('../../', script.src).href;
  var overlay = document.createElement('div');
  overlay.className = 'gate';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'gateTitle');
  overlay.innerHTML =
    '<form class="gate-card" novalidate>' +
      '<span class="gate-mark">STAN</span>' +
      '<h2 id="gateTitle">Unlock all the calculators</h2>' +
      '<p>Enter your email once to get free access to every LearnwithStanley calculator, now and as new ones are added.</p>' +
      '<label class="sr-only" for="gateEmail">Email address</label>' +
      '<input id="gateEmail" type="email" name="email" autocomplete="email" inputmode="email" placeholder="you@example.com" required>' +
      '<input class="gate-hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<button type="submit" class="btn btn-primary">Unlock the calculators</button>' +
      '<p class="gate-error" role="alert"></p>' +
      '<p class="gate-fine">By continuing, you agree to receive occasional emails from LearnwithStanley.com. You can unsubscribe at any time. Your calculator numbers are never sent or stored. <a href="' + home + 'disclosure/">Disclosure</a></p>' +
      (isTool ? '<a class="gate-back" href="' + home + '">\u2190 Back to all tools</a>' : '<button type="button" class="gate-back gate-close">Not now</button>') +
    '</form>';

  var pendingHref = null;
  var form = overlay.querySelector('form');
  var input = overlay.querySelector('#gateEmail');
  var error = overlay.querySelector('.gate-error');
  var button = overlay.querySelector('button[type="submit"]');

  function open(href) {
    pendingHref = href || null;
    if (!overlay.isConnected) document.body.appendChild(overlay);
    overlay.hidden = false;
    document.body.classList.add('gate-open');
    setTimeout(function () { input.focus(); }, 50);
  }
  function close() {
    overlay.hidden = true;
    document.body.classList.remove('gate-open');
  }
  function done() {
    unlock();
    close();
    if (pendingHref) location.href = pendingHref;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    error.textContent = '';
    var email = input.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { error.textContent = 'Please enter a valid email address.'; input.focus(); return; }
    button.disabled = true;
    button.textContent = 'Unlocking\u2026';
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, website: form.website.value, tool: document.title.split(' \u00b7 ')[0] })
    }).then(function (res) {
      if (res.status === 422) return res.json().then(function (d) { throw new Error(d.error || 'Please check your email address.'); });
      // Any other outcome still lets the visitor in, so a hiccup never locks people out.
      done();
    }).catch(function (err) {
      if (err && err.message && !/fetch|network|load/i.test(err.message)) {
        error.textContent = err.message;
        button.disabled = false;
        button.textContent = 'Unlock the calculators';
      } else done();
    });
  });

  overlay.addEventListener('click', function (e) {
    if (e.target.classList.contains('gate-close')) close();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !isTool && !overlay.hidden) close();
  });

  if (isTool) {
    open();
  } else {
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a.tool');
      if (!a || unlocked()) return;
      e.preventDefault();
      open(a.href);
    });
  }
})();
