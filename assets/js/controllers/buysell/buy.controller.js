angular
  .module('walletApp')
  .controller('BuyCtrl', BuyCtrl);

function BuyCtrl ($scope, $filter, $q, MyWallet, Wallet, MyWalletHelpers, Alerts, currency, $uibModalInstance, trade, buyOptions, $timeout, $interval, formatTrade, buySell, $rootScope) {
  $scope.settings = Wallet.settings;
  $scope.btcCurrency = $scope.settings.btcCurrency;
  $scope.currencies = currency.coinifyCurrencies;
  $scope.user = Wallet.user;
  $scope.trades = buySell.trades;
  $scope.alerts = [];
  $scope.status = {};
  $scope.trade = trade;
  $scope.quote = buyOptions.quote;

  $scope.buySellDebug = $rootScope.buySellDebug;

  let accountIndex = $scope.trade && $scope.trade.accountIndex ? $scope.trade.accountIndex : MyWallet.wallet.hdwallet.defaultAccount.index;
  $scope.label = MyWallet.wallet.hdwallet.accounts[accountIndex].label;

  let exchange = buySell.getExchange();
  $scope.exchange = exchange && exchange.profile ? exchange : {profile: {}};

  $scope.isKYC = $scope.trade && $scope.trade.constructor.name === 'CoinifyKYC';
  $scope.needsKyc = () => $scope.isMedium('bank') && +$scope.exchange.profile.level.name < 2;
  $scope.needsISX = () => $scope.trade && !$scope.trade.bankAccount && buySell.tradeStateIn(buySell.states.pending)($scope.trade) || $scope.isKYC;
  $scope.needsReview = () => $scope.trade && buySell.tradeStateIn(buySell.states.pending)($scope.trade);

  $scope.expiredQuote = $scope.trade && new Date() > $scope.trade.quoteExpireTime && $scope.trade.id;
  let updateBTCExpected = (quote) => { $scope.status.gettingQuote = false; $scope.btcExpected = quote; };

  let eventualError = (message) => Promise.reject.bind(Promise, { message });

  $scope.steps = {
    'select-country': 0,
    'email': 1,
    'accept-terms': 2,
    'select-payment-method': 3,
    'summary': 4,
    'isx': 5,
    'trade-in-review': 6,
    'trade-formatted': 7
  };

  $scope.onStep = (...steps) => steps.some(s => $scope.step === $scope.steps[s]);
  $scope.afterStep = (step) => $scope.step > $scope.steps[step];
  $scope.beforeStep = (step) => $scope.step < $scope.steps[step];
  $scope.currentStep = () => Object.keys($scope.steps).filter($scope.onStep)[0];

  $scope.goTo = (step) => $scope.step = $scope.steps[step];

  $scope.formattedTrade = undefined;
  $scope.bitcoinReceived = buyOptions.bitcoinReceived && $scope.trade && $scope.trade.bitcoinReceived;

  $scope.fields = { email: $scope.user.email, countryCode: $scope.exchange.profile.country };

  $scope.transaction = trade == null
    ? ({ fiat: buyOptions.fiat, btc: buyOptions.btc, fee: 0, total: 0, currency: buyOptions.currency || buySell.getCurrency() })
    : ({ fiat: $scope.trade.inAmount / 100, btc: 0, fee: 0, total: 0, currency: buySell.getCurrency($scope.trade) });

  $scope.changeCurrencySymbol = (curr) => { $scope.currencySymbol = currency.conversions[curr.code]; };
  $scope.changeCurrencySymbol($scope.transaction.currency);

  $timeout(() => !$scope.isKYC && $scope.changeCurrency($scope.transaction.currency));
  $timeout(() => $scope.rendered = true, $scope.bitcoinReceived ? 0 : 4000);

  $scope.hideQuote = () => (
    $scope.afterStep('isx') ||
    $scope.isMedium('bank') ||
    $scope.expiredQuote || ($scope.quote && !$scope.quote.id && !$scope.trade)
  );

  $scope.userHasExchangeAcct = $scope.exchange.user;

  $scope.getPaymentMethods = () => {
    if (!$scope.exchange.user) { return; }

    $scope.status.waiting = true;

    let success = (methods) => {
      $scope.methods = methods;
      $scope.status.waiting = false;
      $scope.method && $scope.updateAmounts();
    };

    let methodsError = eventualError('ERROR_PAYMENT_METHODS_FETCH');
    return $scope.quote.getPaymentMethods().then(success, methodsError);
  };

  $scope.changeCurrency = (curr) => {
    if (!curr) curr = buySell.getCurrency();
    if ($scope.trade && !$scope.isKYC) curr = {code: $scope.trade.inCurrency};
    $scope.transaction.currency = curr;
    $scope.changeCurrencySymbol(curr);
    $scope.getQuote();
  };

  $scope.standardError = (err) => {
    console.log(err);
    $scope.status = {};
    try {
      let e = JSON.parse(err);
      let msg = e.error.toUpperCase();
      if (msg === 'EMAIL_ADDRESS_IN_USE') $scope.rejectedEmail = true;
      else Alerts.displayError(msg, true, $scope.alerts, {user: $scope.exchange.user});
    } catch (e) {
      let msg = e.error || err.message;
      if (msg) Alerts.displayError(msg, true, $scope.alerts);
      else Alerts.displayError('INVALID_REQUEST', true, $scope.alerts);
    }
  };

  $scope.updateAmounts = () => {
    if (!$scope.trade && (!$scope.quote || !$scope.exchange.user)) return;

    if ($scope.quote) {
      $scope.transaction.methodFee = ($scope.quote.paymentMethods[$scope.method].fee / 100).toFixed(2);
      $scope.transaction.total = ($scope.quote.paymentMethods[$scope.method].total / 100).toFixed(2);
    } else if ($scope.trade) {
      $scope.transaction.total = ($scope.trade.sendAmount / 100).toFixed(2);
    }
  };

  $scope.getQuote = () => {
    if ($scope.trade) { $scope.updateAmounts(); return; }

    $scope.quote = null;
    $scope.transaction.btc = 0;
    $scope.status.gettingQuote = true;
    $scope.status.waiting = true;
    if (!$scope.transaction.fiat) { $scope.status = {}; return; }

    let quoteError = eventualError('ERROR_QUOTE_FETCH');
    let currCode = $scope.transaction.currency.code;
    let amount = Math.round($scope.transaction.fiat * 100);

    const success = (quote) => {
      $scope.status = {};
      $scope.expiredQuote = false;
      $scope.quote = quote;
      Alerts.clear($scope.alerts);
      $scope.transaction.btc = quote.quoteAmount / 100000000;
    };

    return buySell.getExchange().getBuyQuote(amount, currCode)
      .then(success, quoteError)
      .then($scope.getPaymentMethods)
      .catch($scope.standardError);
  };

  $scope.isCurrencySelected = (currency) => currency === $scope.transaction.currency;

  $scope.nextStep = () => {
    if (!$scope.trade) {
      if (!$scope.isCountrySelected && !$scope.exchange.user) {
        $scope.goTo('select-country');
        $scope.isCountrySelected = true;
      } else if ((!$scope.user.isEmailVerified || $scope.rejectedEmail) && !$scope.exchange.user) {
        $scope.goTo('email');
      } else if (!$scope.exchange.user) {
        $scope.goTo('accept-terms');
      } else if (!$scope.isMethodSelected) {
        $scope.goTo('select-payment-method');
        $scope.isMethodSelected = true;
      } else {
        $scope.goTo('summary');
      }
    } else {
      if ($scope.needsISX() && !$scope.formattedTrade) {
        $scope.goTo('isx');
      } else if ($scope.needsReview()) {
        $scope.goTo('trade-in-review');
      } else {
        $scope.goTo('trade-formatted');
      }
    }
  };

  $scope.prevStep = () => {
    if ($scope.status.waiting) return;

    if ($scope.exchange.user && $scope.afterStep('accept-terms')) {
      $scope.goTo('select-payment-method');
    } else if ($scope.afterStep('email')) {
      $scope.goTo('select-country');
    } else {
      $scope.step--;
    }
  };

  $scope.isDisabled = () => {
    if ($scope.onStep('select-country')) {
      return !$scope.fields.countryCode || $scope.isCountryBlacklisted;
    } else if ($scope.onStep('accept-terms')) {
      return !$scope.signupForm.$valid;
    } else if ($scope.onStep('select-payment-method')) {
      return !$scope.quote || !$scope.method;
    } else if ($scope.onStep('summary')) {
      return $scope.editAmount || !$scope.limits.max;
    }
  };

  $scope.watchAddress = () => {
    if ($rootScope.buySellDebug) {
      console.log('$scope.watchAddress() for', $scope.trade);
    }
    if (!$scope.trade || $scope.bitcoinReceived || $scope.isKYC) return;
    const success = () => $timeout(() => $scope.bitcoinReceived = true);
    $scope.trade.watchAddress().then(success);
  };

  $scope.formatTrade = (state) => {
    if ($scope.isKYC || $scope.needsKyc()) state = 'kyc';
    $scope.formattedTrade = formatTrade[state]($scope.trade);

    if ($scope.needsKyc()) {
      let poll = buySell.pollUserLevel(buySell.kycs[0]);
      $scope.$on('$destroy', poll.cancel);
      return poll.result.then($scope.buy);
    }
  };

  if ($scope.trade && !$scope.needsISX()) {
    let state = $scope.trade.state;
    if (!$scope.bitcoinReceived) $scope.watchAddress();
    if ($scope.trade.bankAccount && $scope.trade.state === 'awaiting_transfer_in') state = 'bank_transfer';

    $scope.formattedTrade = formatTrade[state]($scope.trade);
  }

  $scope.onResize = (step) => $scope.isxStep = step;

  $scope.cancel = () => {
    $rootScope.$broadcast('fetchExchangeProfile');
    $uibModalInstance.dismiss('');
    $scope.trade = null;
  };

  $scope.close = (acct) => {
    let text, action;
    if (acct) {
      [text, action] = ['CONFIRM_CLOSE', 'IM_DONE'];
    } else {
      [text, action] = ['CONFIRM_CLOSE_ACCT', 'IM_DONE'];
    }
    Alerts.confirm(text, {action: action}).then($scope.cancel);
  };

  $scope.getQuoteHelper = () => {
    if ($scope.quote && !$scope.expiredQuote && $scope.beforeStep('trade-formatted')) return 'AUTO_REFRESH';
    else if ($scope.quote && !$scope.quote.id) return 'EST_QUOTE_1';
    else if ($scope.expiredQuote) return 'EST_QUOTE_2';
    else return 'RATE_WILL_EXPIRE';
  };

  $scope.fakeBankTransfer = () => $scope.trade.fakeBankTransfer().then(() => {
    $scope.formatTrade('processing');
    $scope.$digest();
  });

  $scope.$watch('method', (newVal) => newVal && $scope.updateAmounts());
  $scope.$watchGroup(['exchange.user', 'paymentInfo', 'formattedTrade'], $scope.nextStep);
  $scope.$watch('user.isEmailVerified', () => $scope.onStep('email') && $scope.nextStep());
  $scope.$watch('bitcoinReceived', (newVal) => newVal && ($scope.formattedTrade = formatTrade['success']($scope.trade)));

  $scope.$watch('expiredQuote', (newVal) => {
    if (newVal && !$scope.isKYC) {
      $scope.status.gettingQuote = true;
      if (!$scope.trade) $scope.getQuote();
      else $scope.trade.btcExpected().then(updateBTCExpected);
    }
  });
}
