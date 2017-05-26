angular
  .module('walletApp')
  .controller('CoinifySellController', CoinifySellController);

function CoinifySellController ($scope, Wallet, Alerts, currency, $uibModalInstance, trade, buySellOptions, buySell, $q, $rootScope, accounts, $state, $stateParams, bankMedium, payment, Env) {
  $scope.fields = {};
  $scope.user = Wallet.user;
  $scope.isSweepTransaction = buySellOptions.isSweepTransaction;

  this.user = Wallet.user;
  this.trade = trade;
  this.quote = trade.quote;
  this.totalBalance = currency.convertFromSatoshi(Wallet.my.wallet.balanceActiveAccounts, currency.bitCurrencies[0]);
  this.selectedBankAccount = null;
  this.accounts = accounts;
  this.payment = payment;
  if (bankMedium) this.paymentAccount = bankMedium;
  this.message = 'SELL.QUOTE_EXPIRES';
  this.now = () => new Date().getTime();
  this.timeToExpiration = () => this.quote ? this.quote.expiresAt - this.now() : '';
  this.refreshQuote = () => {
    return $q.resolve(buySell.getSellQuote(-this.transaction.btc, 'BTC', this.transaction.currency.code)).then(onRefreshQuote);
  };

  const onRefreshQuote = (quote) => {
    this.quote = quote;
    this.transaction.fiat = quote.quoteAmount / 100;
    if (this.selectedBankAccount) {
      this.selectedBankAccount.updateQuote(quote);
    }
  };

  this.steps = {
    'email': 0,
    'accept-terms': 1,
    'account': 2,
    'bank-link': 3,
    'summary': 4,
    'trade-complete': 5,
    'isx': 6
  };
  this.onStep = (...steps) => steps.some(s => this.step === this.steps[s]);
  this.goTo = (step) => {
    this.step = this.steps[step];
    this.setTitle(step);
  };
  this.setTitle = (step) => {
    switch (step) {
      case 'account':
        this.title = 'SELL.ADD_BANK_ACCOUNT';
        break;
      case 'bank-link':
        this.title = 'SELL.LINKED_ACCOUNTS';
        break;
      case 'summary':
        this.title = 'SELL.CONFIRM_SELL_ORDER';
        break;
      case 'trade-complete':
        this.title = 'SELL.SELL_BITCOIN';
        this.hide = true;
        break;
      default:
        this.title = 'SELL.SELL_BITCOIN';
        break;
    }
  };

  this.nextStep = () => {
    if (this.isKYC) {
      this.goTo('isx');
      return;
    }
    if ((this.trade.state && !this.trade.iSignThisID) && this.exchange.profile) {
      this.sellTrade = this.trade;
      this.goTo('trade-complete');
      return;
    } else {
      if ((!this.user.isEmailVerified || this.rejectedEmail) && !this.exchange.user) {
        this.goTo('email');
      } else if (!this.exchange.user) {
        this.goTo('accept-terms');
      } else if (!this.accounts.length) {
        this.goTo('account');
      } else if (this.accounts.length) {
        this.goTo('bank-link');
      } else {
        this.goTo('summary');
      }
    }
  };

  this.getQuoteHelper = () => {
    if (this.quote && !this.quote.id) return 'EST_QUOTE_1';
    else return 'SELL.QUOTE_WILL_EXPIRE';
  };

  if (!this.trade.btc && !this.trade.fiat) {
    this.isKYC = this.trade && this.trade.constructor.name === 'CoinifyKYC';
    this.isKYC ? this.nextStep() : '';
  }

  this.transaction = {
    btc: this.trade.btc,
    fiat: this.trade.fiat,
    currency: { name: 'Euro', code: 'EUR' },
    fee: { btc: null, fiat: null }
  };

  $scope.assignFiatCurrency = () => {
    if (this.trade.state) return;
    if (this.trade.quote.quoteCurrency === 'BTC') {
      $scope.assignFiatHelper('baseCurrency');
    } else {
      $scope.assignFiatHelper('quoteCurrency');
    }
  };
  $scope.assignFiatHelper = (currencyType) => {
    this.transaction.currency.code = this.trade.quote[currencyType];
    this.transaction.currency.symbol = currency.conversions[this.trade.quote[currencyType]]['symbol'];
  };

  $scope.assignFiatCurrency();

  let exchange = buySell.getExchange();
  this.exchange = exchange && exchange.profile ? exchange : {profile: {}};
  this.country = exchange.profile ? exchange.profile.country : $stateParams.countryCode;
  this.fiat = () => this.transaction.currency.code;

  $scope.fields = { email: $scope.user.email };

  this.goToOrderHistory = () => {
    if ((this.onStep('trade-complete')) && $state.params.selectedTab !== 'ORDER_HISTORY') {
      $state.go('wallet.common.buy-sell.coinify', {selectedTab: 'ORDER_HISTORY'});
    } else {
      $uibModalInstance.dismiss('');
    }
  };

  $scope.startPayment = () => {
    if (this.trade.state) return;
    let firstBlockFee = this.payment.absoluteFeeBounds[0];
    if ($scope.isSweepTransaction) firstBlockFee = this.payment.sweepFees[0];
    this.finalPayment = Wallet.my.wallet.createPayment(this.payment);
    this.finalPayment.fee(firstBlockFee);
    this.transaction.fee.btc = currency.convertFromSatoshi(firstBlockFee, currency.bitCurrencies[0]);
    this.transaction.btcAfterFee = parseFloat((this.transaction.btc + this.transaction.fee.btc).toFixed(8));
    return {transaction: this.transaction};
  };

  this.cancel = () => {
    $rootScope.$broadcast('fetchExchangeProfile');
    $uibModalInstance.dismiss('');
    this.reset();
    this.trade = null;
    buySell.getTrades().then(() => {
      this.goToOrderHistory();
    });
  };

  let links;

  Env.then(env => {
    links = env.partners.coinify.sellSurveyLinks;
  });

  this.close = () => {
    let index;
    if (!this.exchange.user) index = 0;
    else if (this.onStep('account')) index = 1;
    else if (this.onStep('summary')) index = 2;
    Alerts.surveyCloseConfirm('survey-opened', links, index, true).then(this.cancel);
  };

  let startedPayment = $scope.startPayment();
  if (startedPayment) this.transaction = Object.assign(this.transaction, startedPayment.transaction);

  if (!this.step) this.nextStep();

  this.selectAccount = (bank) => {
    this.selectedBankAccount = bank;
  };

  this.onSellSuccess = (trade) => this.sellTrade = trade;
  this.dismiss = () => $uibModalInstance.dismiss('');

  this.state = { email: { valid: true } };

  this.onEmailChange = (valid) => {
    this.state.email.valid = valid;
  };

  this.onSignupComplete = () => {
    this.refreshQuote();
    this.quote.getPayoutMediums().then(mediums => {
      this.paymentAccount = mediums.bank;
      mediums.bank.getBankAccounts().then(bankAccounts => {
        this.accounts = bankAccounts;
        this.goTo('account');
      });
    });
  };

  const handleError = (e) => {
    let accountError = JSON.parse(e);
    Alerts.displayError(accountError.error_description);
    if (accountError.error === 'invalid_iban') {
      this.ibanError = true;
    }
  };

  this.onCreateBankSuccess = (bank) => {
    this.selectedBankAccount = bank;
    this.goTo('summary');
  };

  this.addBankAccount = (bankObj, userObj) => {
    this.ibanError = false;
    let holder = { holder: {} };
    Object.assign(holder.holder, userObj);
    let obj = Object.assign(bankObj, holder);
    obj.account.currency = this.transaction.currency.code;
    $q.resolve(this.paymentAccount.addBankAccount(obj))
      .then(this.onCreateBankSuccess)
      .catch(handleError);
  };

  this.reset = () => {
    this.transaction.btc = null;
    this.transaction.fiat = null;
  };
}
