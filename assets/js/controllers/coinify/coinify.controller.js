angular
  .module('walletApp')
  .controller('CoinifyController', CoinifyController);

function CoinifyController ($rootScope, $scope, MyWallet, Wallet, Alerts, currency, $uibModalInstance, quote, trade, formatTrade, $timeout, $interval, buySell, $state, options, buyMobile, Env) {
  $scope.settings = Wallet.settings;
  $scope.btcCurrency = $scope.settings.btcCurrency;
  $scope.currencies = currency.coinifyCurrencies;
  $scope.trades = buySell.trades;
  $scope.alerts = [];

  this.user = Wallet.user;
  this.quote = quote;
  this.trade = trade;
  this.baseFiat = () => !currency.isBitCurrency({code: this.quote.baseCurrency});
  this.BTCAmount = () => !this.baseFiat() ? this.quote.baseAmount : this.quote.quoteAmount;
  this.fiatAmount = () => this.baseFiat() ? -this.quote.baseAmount / 100 : -this.quote.quoteAmount / 100;
  this.fiatCurrency = () => this.baseFiat() ? this.quote.baseCurrency : this.quote.quoteCurrency;
  this.refreshQuote = () => {
    if (this.baseFiat()) return buySell.getQuote(-this.quote.baseAmount / 100, this.quote.baseCurrency).then((q) => this.quote = q);
    else return buySell.getQuote(-this.quote.baseAmount / 100000000, this.quote.baseCurrency, this.quote.quoteCurrency).then((q) => this.quote = q);
  };

  Env.then(env => {
    this.buySellDebug = env.buySellDebug;
  });

  let accountIndex = MyWallet.wallet.hdwallet.defaultAccount.index;
  $scope.label = MyWallet.wallet.hdwallet.accounts[accountIndex].label;

  let exchange = buySell.getExchange();
  this.exchange = exchange && exchange.profile ? exchange : {profile: {}};
  this.getMinimumInAmount = (medium, curr) => medium && curr && quote.paymentMediums[medium].minimumInAmounts[curr];

  this.steps = {
    'email': 0,
    'accept-terms': 1,
    'select-payment-medium': 2,
    'summary': 3,
    'isx': 4,
    'trade-complete': 5
  };

  this.onStep = (...steps) => steps.some(s => this.step === this.steps[s]);
  this.currentStep = () => Object.keys(this.steps).filter(this.onStep)[0];
  this.goTo = (step) => this.step = this.steps[step];

  if ((!this.user.isEmailVerified || this.rejectedEmail) && !this.exchange.user) {
    this.goTo('email');
  } else if (!this.exchange.user) {
    this.goTo('accept-terms');
  } else if (!this.trade) {
    this.goTo('select-payment-medium');
  } else if (!buySell.tradeStateIn(buySell.states.completed)(this.trade) && this.trade.medium !== 'bank') {
    this.goTo('isx');
  } else {
    this.goTo('trade-complete');
  }

  this.cancel = () => {
    $rootScope.$broadcast('fetchExchangeProfile');
    $uibModalInstance.dismiss('');
    buySell.getTrades().then(() => {
      $scope.goToOrderHistory();
    });
  };

  this.close = (idx) => {
    let links = options.partners.coinify.surveyLinks;
    if (idx > links.length - 1) { this.cancel(); return; }
    Alerts.surveyCloseConfirm('survey-opened', links, idx).then(this.cancel);
  };

  $scope.exitToNativeTx = () => {
    buyMobile.callMobileInterface(buyMobile.SHOW_TX, $scope.trade.txHash);
  };

  $scope.getQuoteHelper = () => {
    if (this.quote && !this.quote.id) return 'EST_QUOTE_1';
    else if (this.quote) return 'AUTO_REFRESH';
    else if (this.trade) return 'EST_QUOTE_2';
    else return 'RATE_WILL_EXPIRE';
  };

  $scope.goToOrderHistory = () => {
    this.onStep('isx') && $state.go('wallet.common.buy-sell.coinify', {selectedTab: 'ORDER_HISTORY'});
  };

  $scope.$watch('vm.user.email', () => { this.rejectedEmail = false; });
}
