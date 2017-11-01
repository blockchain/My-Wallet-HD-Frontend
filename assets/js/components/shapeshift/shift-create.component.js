angular
  .module('walletApp')
  .component('shiftCreate', {
    bindings: {
      fees: '<',
      asset: '<',
      wallet: '<',
      wallets: '<',
      onComplete: '&',
      handleRate: '&',
      handleQuote: '&',
      buildPayment: '&',
      handleApproximateQuote: '&'
    },
    templateUrl: 'templates/shapeshift/create.pug',
    controller: ShiftCreateController,
    controllerAs: '$ctrl'
  });

function ShiftCreateController (Env, AngularHelper, $translate, $scope, $q, currency, Wallet, MyWalletHelpers, $uibModal, Exchange, Ethereum, ShapeShift, buyStatus, MyWallet) {
  let UPPER_LIMIT;
  Env.then(env => {
    UPPER_LIMIT = env.shapeshift.upperLimit || 500;
    getRate().then(() => $scope.getAvailableBalance());
  });

  this.from = this.wallet || Wallet.getDefaultAccount();
  this.to = this.wallet ? Wallet.getDefaultAccount() : Ethereum.defaultAccount;

  this.origins = this.wallet ? [this.wallet] : this.wallets;
  this.destinations = this.wallets;

  $scope.forms = $scope.state = {};
  $scope.dollars = Wallet.settings.currency;
  $scope.country = MyWallet.wallet.accountInfo.countryCodeGuess;
  $scope.fiat = $scope.country === 'US'
    ? currency.currencies.filter(c => c.code === 'USD')[0]
    : currency.currencies.filter(c => c.code === 'EUR')[0];
  $scope.ether = currency.ethCurrencies.filter(c => c.code === 'ETH')[0];
  $scope.bitcoin = currency.bitCurrencies.filter(c => c.code === 'BTC')[0];
  $scope.bitcoinCash = currency.bchCurrencies.filter(c => c.code === 'BCH')[0];

  $scope.bitCurrencyMap = {
    'eth': { currency: $scope.ether, convert: currency.convertToEther, icon: 'icon-ethereum' },
    'btc': { currency: $scope.bitcoin, convert: currency.convertToSatoshi, icon: 'icon-bitcoin' },
    'bch': { currency: $scope.bitcoinCash, convert: currency.convertToBitcoinCash, icon: 'icon-bitcoin-cash' }
  };

  let state = $scope.state = {
    input: { amount: null },
    output: { amount: null },
    rate: { min: null, max: null },
    baseCurr: $scope.$ctrl.from.coinCode,
    get baseInput () { return this.baseCurr === $scope.$ctrl.from.coinCode; }
  };

  $scope.getQuoteArgs = (state) => ({
    to: this.to,
    from: this.from,
    amount: state.baseInput ? $scope.forms.shiftForm.input.$viewValue : -$scope.forms.shiftForm.output.$viewValue
  });

  $scope.refreshQuote = MyWalletHelpers.asyncOnce(() => {
    $scope.lock();
    let fetchSuccess = (quote) => {
      let input = $scope.bitCurrencyMap[this.from.coinCode];
      let output = $scope.bitCurrencyMap[this.to.coinCode];

      $scope.free();
      $scope.quote = quote; state.error = null; state.loadFailed = false;
      if (state.baseInput) state.output.amount = output.convert(Number.parseFloat(quote.withdrawalAmount), output.currency);
      else state.input.amount = input.convert(Number.parseFloat(quote.depositAmount), input.currency);
      AngularHelper.$safeApply();
    };

    let fetchError = () => {
      state.loadFailed = true;
      $scope.free();
    };

    this.handleApproximateQuote($scope.getQuoteArgs(state)).then(fetchSuccess, fetchError);
  }, 500, () => {
    $scope.quote = null;
  });

  $scope.refreshIfValid = (field) => {
    if ($scope.state[field].amount) {
      $scope.quote = null;
      state.loadFailed = false;
      $scope.refreshQuote();
    }
  };

  $scope.getSendAmount = () => {
    $scope.busy = true;
    state.baseCurr = this.from.coinCode;
    this.handleQuote($scope.getQuoteArgs(state)).then((quote) => {
      $scope.busy = false;
      let payment = this.buildPayment({quote: quote, fee: $scope.cachedFee, from: this.from});
      payment.getFee().then((fee) => this.onComplete({payment: payment, fee: fee, quote: quote, destination: this.to}));
    }).catch(() => $scope.busy = false);
  };

  let getRate = () => {
    let input = $scope.bitCurrencyMap[this.from.coinCode];
    let upperLimit = input.convert(UPPER_LIMIT, $scope.fiat);

    return $q.resolve(this.handleRate({rate: this.from.coinCode + '_' + this.to.coinCode}))
              .then((rate) => {
                let maxLimit = input.convert(rate.maxLimit, input.currency);
                state.rate.min = input.convert(rate.minimum, input.currency);
                state.rate.max = maxLimit < upperLimit ? maxLimit : upperLimit;
              });
  };

  $scope.getAvailableBalance = () => {
    let fetchSuccess = (balance, fee) => {
      state.error = null;
      state.balanceFailed = false;
      $scope.cachedFee = balance.fee;
      $scope.maxAvailable = balance.amount;
      if (this.wallet) state.input.amount = Math.min(state.rate.max, $scope.maxAvailable);
    };

    let fetchError = (err) => {
      $scope.maxAvailable = 0;
      state.balanceFailed = true;
      if (Exchange.interpretError(err) === 'No free outputs to spend') {
        state.error = $translate.instant('.NO_FUNDS_TO_EXCHANGE');
      } else {
        state.error = Exchange.interpretError(err);
      }
    };

    let fee = this.fees[this.from.coinCode];
    return $q.resolve(this.from.getAvailableBalance(fee)).then(fetchSuccess, fetchError);
  };

  $scope.switch = () => {
    [this.from, this.to] = [this.to, this.from];
    state.input.amount = state.output.amount = null;
  };

  $scope.setWallet = (direction, change) => {
    let needsSelection = this.from.coinCode === this.to.coinCode;
    let selection = needsSelection && this.wallets.filter((w) => w.coinCode !== this[direction].coinCode);
    needsSelection && (this[change] = selection[0]);
  };

  $scope.setMin = () => state.input.amount = state.rate.min;
  $scope.setMax = () => state.input.amount = $scope.maxAvailable < state.rate.max ? $scope.maxAvailable : state.rate.max;

  $scope.$watch('$ctrl.to.coinCode', () => state.baseInput && $scope.refreshIfValid('input'));
  $scope.$watch('state.input.amount', () => state.baseInput && $scope.refreshIfValid('input'));
  $scope.$watch('state.output.amount', () => !state.baseInput && $scope.refreshIfValid('output'));
  $scope.$watch('$ctrl.from.balance', (n, o) => { if (n !== o) { getRate().then($scope.getAvailableBalance); } });

  // Stat: how often do users see the "max limit" error?
  let sawMaxLimit = false;
  Wallet.api.incrementShapeshiftStat();
  $scope.$watch('forms.shiftForm.input.$error.max && maxAvailable >= state.rate.max', (errorShown) => {
    if (errorShown && !sawMaxLimit) {
      sawMaxLimit = true;
      Wallet.api.incrementShapeshiftStat({ maxLimitError: true });
    }
  });

  AngularHelper.installLock.call($scope);
  buyStatus.canBuy().then((res) => $scope.canBuy = res);
}
