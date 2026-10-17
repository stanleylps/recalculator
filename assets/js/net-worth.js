(function () {
  'use strict';
  var U = RCUI;

  U.bindForm(document.getElementById('form'), function (v) {
    var assets = v.cash + v.investments + v.retirement + v.property + v.otherAssets;
    var liabilities = v.mortgage + v.carLoan + v.cards + v.otherDebts;
    var net = assets - liabilities;
    var ratio = assets > 0 ? liabilities / assets : 0;

    U.setText('heroValue', U.money(net));
    U.setText('heroSub', 'You own ' + U.money(assets) + ' and owe ' + U.money(liabilities) + '.');
    U.setText('assets', U.money(assets));
    U.setText('liabilities', U.money(liabilities));
    U.setText('liquid', U.money(v.cash + v.investments));
    U.setText('liquidNote', 'Money you could reach fairly quickly');
    U.setText('ratio', Math.round(ratio * 100) + '%');
    U.setText('ratioNote', 'What you owe ÷ what you own');
    var card = document.getElementById('ratioCard');
    card.classList.toggle('good', ratio <= 0.3);
    card.classList.toggle('warn', ratio > 0.3 && ratio <= 0.6);
    card.classList.toggle('bad', ratio > 0.6);

    RCBars(document.getElementById('bars'), [
      { label: 'Cash and savings', value: v.cash },
      { label: 'Investments', value: v.investments },
      { label: 'Retirement accounts', value: v.retirement },
      { label: 'Property', value: v.property },
      { label: 'Vehicles and other', value: v.otherAssets },
      { label: 'Total assets', value: assets, total: true },
      { label: 'Mortgage', value: v.mortgage, kind: 'neg' },
      { label: 'Car loan', value: v.carLoan, kind: 'neg' },
      { label: 'Credit cards', value: v.cards, kind: 'neg' },
      { label: 'Other loans', value: v.otherDebts, kind: 'neg' },
      { label: 'Total liabilities', value: liabilities, kind: 'neg', total: true },
      { label: 'Net worth', value: net, kind: net >= 0 ? '' : 'neg', total: true }
    ], U.money);

    var excl = assets - v.property - v.retirement;
    document.getElementById('explain').textContent = 'Not all net worth is easy to spend. Leaving out your home and retirement accounts, your accessible net worth is ' +
      U.money(excl - (liabilities - v.mortgage)) + '. Tracking this number once or twice a year is a simple way to see whether you’re moving in the right direction.';
  });
})();
