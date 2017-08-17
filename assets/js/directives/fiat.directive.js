
angular
  .module('walletDirectives')
  .directive('fiat', fiat);

fiat.$inject = ['$rootScope', '$q', 'Wallet', 'currency'];

function fiat ($rootScope, $q, Wallet, currency) {
  const directive = {
    restrict: 'E',
    replace: true,
    scope: {
      btc: '=',
      eth: '=',
      date: '=',
      parens: '=',
      currency: '='
    },
    template: `
      <span>
        <img ng-show="fiat.amount == null && !loadFailed" src="img/spinner.gif" width="35" />
        <span ng-show="fiat.amount == null && loadFailed">N/A</span>
        <span ng-show="fiat.amount != null" ng-class="{parens: parens}">{{ fiat.currencySymbol }}{{ fiat.amount }}</span>
      <span>
    `,
    link: link
  };
  return directive;

  function link (scope, elem, attrs) {
    scope.fiat = { currencySymbol: null, amount: null };
    scope.settings = Wallet.settings;
    scope.conversions = currency.conversions;
    scope.ethConversions = currency.ethConversions;

    scope.updateFiat = () => {
      scope.fiat = { currencySymbol: null, amount: null };

      let curr = scope.currency || scope.settings.currency || null;

      if (!curr || !curr.code) return;

      let conversion = scope.conversions[curr.code] || null;
      if (!conversion || conversion.conversion <= 0) return;

      let btc = scope.btc;
      let eth = scope.eth;
      if ((btc == null || isNaN(scope.btc)) && (eth == null || isNaN(scope.eth))) return;

      if (attrs.abs != null && btc < 0) btc *= -1;

      scope.fiat.currencySymbol = conversion.symbol;
      if (scope.date) {
        $q.resolve(currency.getFiatAtTime(scope.date, btc, curr.code))
          .then((fiat) => { scope.fiat.amount = currency.commaSeparate(fiat); })
          .catch(() => { scope.loadFailed = true; });
      } else {
        let fiat;
        if (btc && eth) fiat = currency.convertFromSatoshi(btc, curr) + currency.convertFromEther(eth, curr);
        else if (btc) fiat = currency.convertFromSatoshi(btc, curr);
        else fiat = currency.convertFromEther(eth, curr);
        scope.fiat.amount = currency.commaSeparate((Math.floor(fiat * 100) / 100).toFixed(2));
      }
    };

    scope.$watchCollection('conversions', () => scope.updateFiat());
    scope.$watchCollection('ethConversions', () => scope.updateFiat());
    scope.$watch('settings.currency.code + btc + eth + currency', () => scope.updateFiat());
    $rootScope.$on('refresh', () => scope.updateFiat());
  }
}
