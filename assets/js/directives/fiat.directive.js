
angular
  .module('walletApp')
  .directive('fiat', fiat);

fiat.$inject = ['$rootScope', '$q', 'Wallet', 'currency'];

function fiat ($rootScope, $q, Wallet, currency) {
  const directive = {
    restrict: 'E',
    replace: true,
    scope: {
      btc: '=',
      date: '=',
      currency: '='
    },
    template: `
      <span>
        <img ng-show="fiat.amount == null && !loadFailed" src="img/spinner.gif" width="35" />
        <span ng-show="fiat.amount == null && loadFailed">N/A</span>
        <span ng-show="fiat.amount != null">{{ fiat.currencySymbol }}{{ fiat.amount }}</span>
      <span>
    `,
    link: link
  };
  return directive;

  function link (scope, elem, attrs) {
    scope.fiat = { currencySymbol: null, amount: null };
    scope.settings = Wallet.settings;
    scope.conversions = currency.conversions;

    scope.updateFiat = () => {
      scope.fiat = { currencySymbol: null, amount: null };

      let curr = scope.currency || scope.settings.currency || null;

      if (!curr || !curr.code) return;

      let conversion = scope.conversions[curr.code] || null;
      if (!conversion || conversion.conversion <= 0) return;

      let btc = scope.btc;
      if (btc == null || isNaN(scope.btc)) return;

      if (attrs.abs != null && btc < 0) btc *= -1;

      scope.fiat.currencySymbol = conversion.symbol;

      if (scope.date) {
        $q.resolve(currency.getFiatAtTime(scope.date, btc, curr.code))
          .then((fiat) => { scope.fiat.amount = currency.commaSeparate(fiat); })
          .catch(() => { scope.loadFailed = true; });
      } else {
        let fiat = currency.convertFromSatoshi(btc, curr);
        scope.fiat.amount = currency.commaSeparate((Math.floor(fiat * 100) / 100).toFixed(2));
      }
    };

    scope.$watchCollection('conversions', () => scope.updateFiat());
    scope.$watch('settings.currency.code + btc + currency', () => scope.updateFiat());
    $rootScope.$on('refresh', () => scope.updateFiat());
  }
}
