angular
  .module('walletApp')
  .controller('CoinifySummaryController', CoinifySummaryController);

function CoinifySummaryController ($scope, $q, $timeout, MyWallet, AngularHelper, Wallet, coinify, currency, Alerts, Exchange, buyMobile) {
  let { exchange, medium, fiatCurrency } = $scope.vm;

  let limits = $scope.limits = exchange.profile.limits;
  let accountIndex = MyWallet.wallet.hdwallet.defaultAccount.index;

  $scope.max = limits[medium].inRemaining[fiatCurrency()];
  $scope.min = limits[medium].minimumInAmounts[fiatCurrency()];

  $scope.state = {};
  $scope.isBank = medium === 'bank';
  $scope.format = currency.formatCurrencyForView;
  $scope.toSatoshi = currency.convertToSatoshi;
  $scope.fromSatoshi = currency.convertFromSatoshi;
  $scope.label = MyWallet.wallet.hdwallet.accounts[accountIndex].label;

  let tryParse = (json) => {
    try { return JSON.parse(json); } catch (e) { return json; }
  };

  let setTrade = () => {
    let { quote, fiatCurrency, fiatAmount, BTCAmount } = $scope.vm;
    $scope.bitcoin = currency.bitCurrencies.filter(c => c.code === 'BTC')[0];
    $scope.dollars = currency.currencies.filter(c => c.code === fiatCurrency())[0];

    $scope.trade = {
      fee: (quote.paymentMediums[medium].fee).toFixed(2),
      total: (quote.paymentMediums[medium].total).toFixed(2),
      BTCAmount: BTCAmount(),
      fiatAmount: fiatAmount(),
      fiatCurrency: fiatCurrency()
    };

    $scope.tempTrade = angular.copy($scope.trade);
  };

  setTrade();
  $scope.state.editAmount = $scope.trade.fiatAmount > $scope.max || $scope.trade.fiatAmount < $scope.min;

  let getQuote = () => {
    return coinify.getQuote($scope.tempTrade.fiatAmount * 100, $scope.tempTrade.fiatCurrency);
  };

  $scope.commitValues = () => {
    $scope.lock();
    $scope.vm.quote = null;
    getQuote().then((q) => $scope.vm.quote = q)
              .then((q) => q.getPaymentMediums())
              .then((mediums) => mediums[medium].getAccounts())
              .then((accounts) => coinify.accounts = accounts)
              .then(setTrade).then($scope.free)
              .finally(() => $scope.state.editAmount = false);
  };

  $scope.buy = () => {
    $scope.lock();

    let success = (trade) => {
      $scope.vm.quote = null;
      $scope.vm.trade = trade;
      buyMobile.callMobileInterface(buyMobile.BUY_COMPLETED);
    };

    $q.resolve($scope.vm.quote.getPaymentMediums())
      .then((mediums) => mediums[medium].getAccounts())
      .then((accounts) => accounts[0].buy()).then(success)
      .then(() => Exchange.fetchProfile(exchange))
      .then(() => $scope.vm.goTo('isx'))
      .then(() => $scope.vm.trade && $scope.vm.trade.watchAddress())
      .catch((err) => {
        $scope.free();
        err = tryParse(err);
        if (err.error_description) Alerts.displayError(err.error_description);
      });
  };

  $scope.$watch('rateForm', () => {
    $scope.$parent.rateForm = $scope.rateForm;
  });

  AngularHelper.installLock.call($scope);
}
