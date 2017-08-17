
angular
  .module('walletApp')
  .component('exchangeCheckout', {
    bindings: {
      quote: '<',
      limits: '<',
      userId: '<',
      dollars: '<',
      buyLevel: '<',
      buyEnabled: '<',
      buyAccount: '<',
      conversion: '<',
      collapseSummary: '<',
      handleBuy: '&',
      handleQuote: '&',
      buySuccess: '&',
      buyError: '&'
    },
    templateUrl: 'templates/exchange/checkout.pug',
    controller: ExchangeCheckoutController,
    controllerAs: '$ctrl'
  });

function ExchangeCheckoutController (Env, AngularHelper, $scope, $timeout, $q, currency, Wallet, MyWalletHelpers, modals, $uibModal, formatTrade, Exchange) {
  $scope.format = currency.formatCurrencyForView;
  $scope.toSatoshi = currency.convertToSatoshi;
  $scope.fromSatoshi = currency.convertFromSatoshi;
  $scope.dollars = this.dollars;
  $scope.bitcoin = currency.bitCurrencies.filter(c => c.code === 'BTC')[0];
  $scope.hasMultipleAccounts = Wallet.accounts().filter(a => a.active).length > 1;
  $scope.btcAccount = Wallet.getDefaultAccount();
  $scope.siftScienceEnabled = false;

  Env.then(env => {
    $scope.buySellDebug = env.buySellDebug;
  });

  let state = $scope.state = {
    btc: null,
    fiat: null,
    rate: null,
    baseCurr: $scope.dollars,
    get quoteCurr () { return this.baseFiat ? $scope.bitcoin : $scope.dollars; },
    get baseFiat () { return this.baseCurr === $scope.dollars; },
    get total () { return this.fiat; }
  };

  // cached quote from checkout first
  let quote = this.quote;
  if (quote) {
    state.baseCurr = quote.baseCurrency === 'BTC' ? $scope.bitcoin : $scope.dollars;
    state.fiat = state.baseFiat ? $scope.toSatoshi(quote.baseAmount, $scope.dollars) / this.conversion : null;
    state.btc = !state.baseFiat ? quote.baseAmount : null;
  }

  $scope.resetFields = () => {
    state.fiat = state.btc = null;
    state.baseCurr = $scope.dollars;
  };

  $scope.getQuoteArgs = (state) => ({
    amount: state.baseFiat ? state.fiat * this.conversion | 0 : state.btc * 1e8,
    baseCurr: state.baseCurr.code,
    quoteCurr: state.quoteCurr.code
  });

  $scope.cancelRefresh = () => {
    $scope.refreshQuote.cancel();
    $timeout.cancel($scope.refreshTimeout);
  };

  $scope.refreshQuote = MyWalletHelpers.asyncOnce(() => {
    $scope.cancelRefresh();

    let fetchSuccess = (quote) => {
      $scope.quote = quote;
      state.error = null;
      state.loadFailed = false;
      this.collapseSummary = true;
      $scope.refreshTimeout = $timeout($scope.refreshQuote, quote.timeToExpiration);
      if (state.baseFiat) {
        state.btc = quote.quoteAmount / 1e8;
        state.rate = (1 / (quote.quoteAmount / 1e8)) * Math.abs(quote.baseAmount);
      } else {
        state.rate = (1 / (Math.abs(quote.baseAmount) / 1e8)) * (quote.quoteAmount);
        state.fiat = quote.quoteAmount;
      }
    };

    this.handleQuote($scope.getQuoteArgs(state))
      .then(fetchSuccess, () => { state.loadFailed = true; });
  }, 500, () => {
    $scope.quote = null;
  });

  $scope.getInitialQuote = () => {
    let args = { amount: 1e8, baseCurr: $scope.bitcoin.code, quoteCurr: $scope.dollars.code };
    let quoteP = $q.resolve(this.handleQuote(args));
    quoteP.then(quote => { $scope.state.rate = quote.quoteAmount; });
  };

  $scope.refreshIfValid = (field) => {
    if (state[field] && $scope.checkoutForm[field].$valid) {
      $scope.quote = null;
      $scope.refreshQuote();
    } else {
      $scope.cancelRefresh();
    }
  };

  $scope.enableBuy = () => {
    let obj = {
      'BTC Order': $scope.format($scope.fromSatoshi(state.btc || 0, $scope.bitcoin), $scope.bitcoin, true),
      'Payment Method': typeof this.buyAccount === 'object' ? this.buyAccount.accountType + ' (' + this.buyAccount.accountNumber + ')' : null,
      'TOTAL_COST': $scope.format($scope.fromSatoshi(state.total || 0, $scope.dollars), $scope.dollars, true)
    };

    $uibModal.open({
      controller: function ($scope) { $scope.formattedTrade = formatTrade.confirm(obj); },
      templateUrl: 'partials/confirm-trade-modal.pug',
      windowClass: 'bc-modal trade-summary'
    }).result.then($scope.buy);
  };

  $scope.buy = () => {
    $scope.lock();
    let quote = $scope.quote;
    if (this.buyAccount || this.buyEnabled) {
      this.handleBuy({account: this.buyAccount, quote: quote})
        .then(trade => {
          this.buySuccess({trade});
        })
        .catch((err) => {
          $scope.state.loadFailed = true;
          $scope.state.error = Exchange.interpretError(err);
        })
        .finally($scope.resetFields).finally($scope.free);
    } else {
      this.buySuccess({quote});
      $q.resolve().finally($scope.resetFields).finally($scope.free);
    }
  };

  $scope.$watch('state.rate', (rate) => {
    if (!rate) return;
    let limits = this.limits;
    $scope.min = { fiat: limits.min, btc: limits.min / rate };
    $scope.max = { fiat: limits.max, btc: limits.max / rate };
  });
  $scope.$watch('state.fiat', () => state.baseFiat && $scope.refreshIfValid('fiat'));
  $scope.$watch('state.btc', () => !state.baseFiat && $scope.refreshIfValid('btc'));
  $scope.$on('$destroy', $scope.cancelRefresh);
  AngularHelper.installLock.call($scope);
  $scope.getInitialQuote();
}
