angular
  .module('walletApp')
  .controller('BuySellCtrl', BuySellCtrl);

function BuySellCtrl ($scope, $state, Alerts, Wallet, currency, buySell, MyWallet) {
  $scope.status = buySell.getStatus();

  $scope.status.loading = true;

  $scope.currencies = currency.coinifyCurrencies;
  $scope.settings = Wallet.settings;
  $scope.transaction = { fiat: undefined, currency: buySell.getCurrency() };
  $scope.currencySymbol = currency.conversions[$scope.transaction.currency.code];
  $scope.buy = (...args) => buySell.openBuyView(...args).finally($scope.onCloseModal);
  $scope.limits = {card: {}, bank: {}};
  $scope.state = {buy: true};
  $scope.rating = 0;

  $scope.onCloseModal = () => {
    $scope.kyc = buySell.kycs[0];
  };

  $scope.poll = () => {
    buySell.pollUserLevel($scope.kyc)
      .then(() => Alerts.displaySuccess('KYC_APPROVED', true))
      .then(() => {
        $scope.buy();
        $state.go('wallet.common.buy-sell');
      });
  };

  $scope.getMaxMin = () => {
    const calculateMin = (rate) => {
      $scope.limits.card.min = (rate * 10).toFixed(2);
    };

    const calculateMax = (rate) => {
      $scope.limits.bank.max = buySell.calculateMax(rate, 'bank').max;
      $scope.limits.card.max = buySell.calculateMax(rate, 'card').max;
      $scope.limits.currency = $scope.currencySymbol;
    };

    buySell.fetchProfile().then(() => {
      buySell.getRate('EUR', $scope.transaction.currency.code).then(calculateMin);
      buySell.getRate($scope.exchange.profile.defaultCurrency, $scope.transaction.currency.code).then(calculateMax);
    });
  };

  // for quote
  buySell.getExchange();

  buySell.login().finally(() => {
    $scope.trades = buySell.trades;
    $scope.kyc = buySell.kycs[0];
    $scope.exchange = buySell.getExchange();
    $scope.status.loading = false;
    $scope.getMaxMin();

    if ($scope.exchange) {
      if (+$scope.exchange.profile.level.name < 2) {
        if ($scope.kyc) return $scope.poll();
        buySell.getKYCs().then(kycs => {
          if (kycs.length > 0) $scope.poll();
          $scope.kyc = kycs[0];
        });
      }
    } else {
      $scope.$watch(buySell.getExchange, (ex) => $scope.exchange = ex);
    }
  });

  let kycStates = ['pending', 'manual_review', 'declined', 'rejected'];
  $scope.showKycStatus = () => (
    $scope.kyc &&
    $scope.exchange.profile.level.name < 2 &&
    kycStates.indexOf($scope.kyc.state) > -1
  );

  $scope.openKyc = () => {
    ['declined', 'rejected'].indexOf($scope.kyc.state) > -1
      ? buySell.triggerKYC().then(kyc => $scope.buy(null, kyc, 'active-tx'))
      : $scope.buy(null, $scope.kyc, 'active-tx');
  };

  $scope.changeCurrency = (curr) => {
    if (curr && $scope.currencies.some(c => c.code === curr.code)) {
      $scope.transaction.currency = curr;
    }
  };

  $scope.submitFeedback = (rating) => buySell.submitFeedback(rating);

  $scope.$watch('settings.currency', () => {
    $scope.transaction.currency = buySell.getCurrency();
  }, true);

  $scope.$watch('transaction.currency', (newVal, oldVal) => {
    let curr = $scope.transaction.currency || null;
    $scope.currencySymbol = currency.conversions[curr.code];
    if (newVal !== oldVal) $scope.getMaxMin();
  });
}
