/*
 * Share results: adds a "Share results" button to the hero card of any calculator page.
 * It reads the results already on the page (hero, stat cards, inputs), so tools need no extra code.
 * Outputs: a branded 1080x1080 image, social share links, email, and copyable text.
 */
(function () {
  'use strict';

  var BRAND = 'LearnwithStanley Calculators';
  var DOMAIN = 'learnwithstanley.com';
  var DISCLAIMER = 'For education only. Not financial advice. Results are hypothetical.';
  var NAVY_900 = '#071a33', NAVY_800 = '#0b2545', NAVY_700 = '#13315c', NAVY_600 = '#1e4f8a';

  var hero = document.querySelector('.hero');
  if (!hero) return;

  // ---- Read the page ---------------------------------------------------------------
  function text(el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }
  function ownText(el) {
    if (!el) return '';
    var c = el.cloneNode(true);
    c.querySelectorAll('.badge').forEach(function (b) { b.remove(); });
    return text(c);
  }

  function collect() {
    var tool = document.title.split(' · ')[0];
    var stats = Array.prototype.map.call(document.querySelectorAll('.results .stat'), function (s) {
      return { label: ownText(s.querySelector('.label')), value: text(s.querySelector('.value')), note: text(s.querySelector('.note')) };
    }).filter(function (s) { return s.value && s.value !== '—'; });
    var inputs = Array.prototype.map.call(document.querySelectorAll('#form .field'), function (f) {
      var inp = f.querySelector('[data-key]');
      if (!inp) return null;
      var pre = f.querySelector('.input .affix:first-child');
      var suf = f.querySelector('.input .affix:last-child');
      var v = (pre && pre !== suf ? text(pre) : '') + inp.value + (suf && suf !== pre ? ' ' + text(suf) : '');
      return { label: text(f.querySelector('label')), value: v };
    }).filter(Boolean);
    document.querySelectorAll('#debts .debt').forEach(function (d) {
      inputs.unshift({
        label: d.querySelector('.d-name').value || 'Debt',
        value: '$' + d.querySelector('.d-balance').value + ' at ' + d.querySelector('.d-rate').value + '%, minimum $' + d.querySelector('.d-min').value + '/mo'
      });
    });
    return {
      tool: tool,
      label: text(hero.querySelector('.label')),
      big: text(hero.querySelector('.big')),
      sub: text(hero.querySelector('.sub')),
      stats: stats,
      inputs: inputs
    };
  }

  function link(withNumbers) {
    return withNumbers ? location.href : location.origin + location.pathname;
  }

  function shortText(d) {
    var lines = [d.tool + ': my results', '', d.label + ': ' + d.big];
    if (d.sub) lines.push(d.sub);
    d.stats.slice(0, 2).forEach(function (s) { lines.push('• ' + s.label + ': ' + s.value); });
    lines.push('', 'Made with ' + BRAND + ' (' + DOMAIN + ')');
    return lines.join('\n');
  }

  function fullText(d, url) {
    var lines = [d.tool + ' — ' + BRAND, '', d.label + ': ' + d.big];
    if (d.sub) lines.push(d.sub);
    if (d.stats.length) {
      lines.push('', 'Results');
      d.stats.forEach(function (s) { lines.push('• ' + s.label + ': ' + s.value + (s.note ? ' (' + s.note + ')' : '')); });
    }
    if (d.inputs.length) {
      lines.push('', 'Based on');
      d.inputs.forEach(function (i) { lines.push('• ' + i.label + ': ' + i.value); });
    }
    lines.push('', 'Open these numbers again: ' + url, '', BRAND + ' · ' + DOMAIN, DISCLAIMER);
    return lines.join('\n');
  }

  // ---- Branded image ---------------------------------------------------------------
  function fontsReady() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.all([
      document.fonts.load('700 40px "Playfair Display"'),
      document.fonts.load('400 24px "DM Sans"'),
      document.fonts.load('700 24px "DM Sans"')
    ]).catch(function () {});
  }

  var SERIF = '"Playfair Display", Georgia, serif';
  var SANS = '"DM Sans", "Helvetica Neue", Arial, sans-serif';

  function wrap(ctx, str, maxWidth, maxLines) {
    var words = str.split(' '), lines = [], line = '';
    words.forEach(function (w) {
      var test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w; } else line = test;
    });
    if (line) lines.push(line);
    if (lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      var last = lines[maxLines - 1];
      while (ctx.measureText(last + '…').width > maxWidth && last.length) last = last.slice(0, -1);
      lines[maxLines - 1] = last.replace(/\s+\S*$/, '') + '…';
    }
    return lines;
  }

  function fitFont(ctx, str, family, weight, start, min, maxWidth) {
    var size = start;
    do { ctx.font = weight + ' ' + size + 'px ' + family; size -= 2; } while (ctx.measureText(str).width > maxWidth && size >= min);
    return size + 2;
  }

  function drawCard(canvas, d) {
    var S = 1080, P = 72;
    canvas.width = S; canvas.height = S;
    var ctx = canvas.getContext('2d');
    ctx.textBaseline = 'alphabetic';

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, S, S);
    var topH = 560;
    var g = ctx.createLinearGradient(0, 0, S, topH);
    g.addColorStop(0, NAVY_900); g.addColorStop(0.5, NAVY_800); g.addColorStop(1, NAVY_600);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, topH);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 60;
    ctx.beginPath(); ctx.arc(S - 40, 40, 190, 0, Math.PI * 2); ctx.stroke();

    // Brand row
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, P, P - 8, 56, 56, 8); ctx.fill();
    ctx.fillStyle = NAVY_800;
    ctx.font = '700 24px ' + SERIF;
    ctx.textAlign = 'center';
    ctx.fillText('LS', P + 28, P + 29);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 34px ' + SERIF;
    ctx.fillText(BRAND, P + 76, P + 31);

    // Tool name + result
    var y = 220;
    ctx.fillStyle = '#b9cdea';
    ctx.font = '700 24px ' + SANS;
    ctx.fillText(spaced(d.tool.toUpperCase()), P, y);
    y += 62;
    ctx.fillStyle = '#dbe5f3';
    ctx.font = '400 30px ' + SANS;
    ctx.fillText(d.label, P, y);
    y += 96;
    ctx.fillStyle = '#ffffff';
    fitFont(ctx, d.big, SERIF, '700', 92, 44, S - 2 * P);
    ctx.fillText(d.big, P, y);
    y += 58;
    ctx.fillStyle = '#dbe5f3';
    ctx.font = '400 28px ' + SANS;
    wrap(ctx, d.sub, S - 2 * P, 2).forEach(function (l) { ctx.fillText(l, P, y); y += 40; });

    // Stats (2 x 2)
    var stats = d.stats.slice(0, 4);
    var colW = (S - 2 * P - 40) / 2;
    var rows = Math.ceil(stats.length / 2);
    var areaTop = topH + Math.max(40, (S - 120 - topH - (rows * 150 - 38)) / 2);
    stats.forEach(function (s, i) {
      var x = P + (i % 2) * (colW + 40);
      var top = areaTop + Math.floor(i / 2) * 150;
      ctx.fillStyle = NAVY_700;
      ctx.fillRect(x, top, 5, 112);
      ctx.fillStyle = '#697586';
      ctx.font = '600 24px ' + SANS;
      wrap(ctx, s.label, colW - 28, 1).forEach(function (l) { ctx.fillText(l, x + 26, top + 30); });
      ctx.fillStyle = '#0a0f1a';
      fitFont(ctx, s.value, SANS, '700', 44, 26, colW - 28);
      ctx.fillText(s.value, x + 26, top + 82);
      ctx.fillStyle = '#697586';
      ctx.font = '400 20px ' + SANS;
      wrap(ctx, s.note, colW - 28, 1).forEach(function (l) { ctx.fillText(l, x + 26, top + 110); });
    });

    // Footer
    var fH = 120;
    ctx.fillStyle = '#0a0f1a';
    ctx.fillRect(0, S - fH, S, fH);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 32px ' + SERIF;
    ctx.fillText(DOMAIN, P, S - fH + 56);
    ctx.fillStyle = '#a9b4c4';
    ctx.font = '400 20px ' + SANS;
    ctx.fillText('Try it yourself: ' + DOMAIN + '/recalculator', P, S - fH + 90);
    ctx.textAlign = 'right';
    ctx.fillText('For education only.', S - P, S - fH + 52);
    ctx.fillText('Not financial advice.', S - P, S - fH + 80);
    ctx.textAlign = 'left';
  }

  function spaced(s) { return s.split('').join(String.fromCharCode(8202)); }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  function toBlob(canvas) {
    return new Promise(function (res) { canvas.toBlob(res, 'image/png'); });
  }

  function fileName(d) {
    return 'learnwithstanley-' + d.tool.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.png';
  }

  // ---- UI ----------------------------------------------------------------------------
  var ICONS = {
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v13"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>'
  };

  var actions = document.createElement('div');
  actions.className = 'hero-actions';
  actions.innerHTML = '<button type="button" class="btn btn-share">' + ICONS.share + 'Share results</button>';
  hero.appendChild(actions);

  var dlg = document.createElement('dialog');
  dlg.className = 'share-dialog';
  dlg.setAttribute('aria-labelledby', 'shareTitle');
  dlg.innerHTML =
    '<div class="share-head"><h2 id="shareTitle">Share your results</h2><button type="button" class="share-close" aria-label="Close">&times;</button></div>' +
    '<div class="share-body">' +
      '<canvas class="share-preview" aria-label="Preview of your branded results image"></canvas>' +
      '<div class="share-grid">' +
        '<button type="button" class="btn btn-primary" data-share="native">' + ICONS.share + 'Share image…</button>' +
        '<button type="button" class="btn" data-share="download">' + ICONS.download + 'Download image</button>' +
        '<button type="button" class="btn" data-share="email">Email to myself</button>' +
        '<button type="button" class="btn" data-share="whatsapp">WhatsApp</button>' +
        '<button type="button" class="btn" data-share="telegram">Telegram</button>' +
        '<button type="button" class="btn" data-share="facebook">Facebook</button>' +
        '<button type="button" class="btn" data-share="linkedin">LinkedIn</button>' +
        '<button type="button" class="btn" data-share="x">X (Twitter)</button>' +
        '<button type="button" class="btn" data-share="copytext">Copy summary</button>' +
      '</div>' +
      '<label class="share-note"><input type="checkbox" id="shareNumbers" checked> Include my numbers in the link</label>' +
      '<p class="share-toast" role="status"></p>' +
      '<p class="share-note">Nothing is sent anywhere until you choose where to share it. For Instagram, download the image and post it from your phone.</p>' +
    '</div>';
  document.body.appendChild(dlg);

  var canvas = dlg.querySelector('canvas');
  var toast = dlg.querySelector('.share-toast');
  var numbers = dlg.querySelector('#shareNumbers');
  var current = null;
  var nativeBtn = dlg.querySelector('[data-share="native"]');
  var dlBtn = dlg.querySelector('[data-share="download"]');
  if (!navigator.share) {
    nativeBtn.hidden = true;
    dlBtn.classList.add('btn-primary');
  }

  function say(msg) { toast.textContent = msg; clearTimeout(say.t); say.t = setTimeout(function () { toast.textContent = ''; }, 2500); }

  actions.querySelector('button').addEventListener('click', function () {
    current = collect();
    toast.textContent = '';
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    fontsReady().then(function () { drawCard(canvas, current); });
  });
  dlg.querySelector('.share-close').addEventListener('click', function () { dlg.close(); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });

  function open(url) { window.open(url, '_blank', 'noopener,noreferrer'); }
  function enc(s) { return encodeURIComponent(s); }
  function copy(str, msg) {
    if (navigator.clipboard) navigator.clipboard.writeText(str).then(function () { say(msg); }, function () { prompt('Copy this', str); });
    else prompt('Copy this', str);
  }

  dlg.querySelector('.share-grid').addEventListener('click', function (e) {
    var b = e.target.closest('[data-share]');
    if (!b || !current) return;
    var url = link(numbers.checked);
    var short = shortText(current);
    switch (b.dataset.share) {
      case 'native':
        toBlob(canvas).then(function (blob) {
          var file = new File([blob], fileName(current), { type: 'image/png' });
          var data = { title: current.tool + ' · ' + BRAND, text: short + '\n' + url };
          if (navigator.canShare && navigator.canShare({ files: [file] })) data.files = [file];
          else data.url = url;
          return navigator.share(data);
        }).catch(function () {});
        break;
      case 'download':
        toBlob(canvas).then(function (blob) {
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = fileName(current);
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
          say('Image downloaded');
        });
        break;
      case 'email':
        location.href = 'mailto:?subject=' + enc('My ' + current.tool + ' results · ' + BRAND) + '&body=' + enc(fullText(current, url));
        break;
      case 'whatsapp': open('https://wa.me/?text=' + enc(short + '\n' + url)); break;
      case 'telegram': open('https://t.me/share/url?url=' + enc(url) + '&text=' + enc(short)); break;
      case 'facebook': open('https://www.facebook.com/sharer/sharer.php?u=' + enc(url)); break;
      case 'linkedin': open('https://www.linkedin.com/sharing/share-offsite/?url=' + enc(url)); break;
      case 'x': open('https://twitter.com/intent/tweet?text=' + enc(current.tool + ': ' + current.label + ' ' + current.big + '. Made with ' + BRAND) + '&url=' + enc(url)); break;
      case 'copytext': copy(fullText(current, url), 'Summary copied'); break;
    }
  });
})();
