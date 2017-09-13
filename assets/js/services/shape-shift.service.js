angular
  .module('walletApp')
  .factory('ShapeShift', ShapeShift);

function ShapeShift (Wallet, modals, MyWalletHelpers, Ethereum, Env, BrowserHelper) {
  const service = {
    get shapeshift () {
      return Wallet.my.wallet.shapeshift;
    },
    get isInBlacklistedCountry () {
      let country = Wallet.my.wallet.accountInfo.countryCodeGuess;
      return this.countries === '*' || this.countriesBlacklist.indexOf(country) > -1;
    },
    get isInWhitelistedState () {
      let state = Wallet.my.wallet.accountInfo.stateCodeGuess;
      return this.statesWhitelist === [] || this.statesWhitelist.indexOf(state) > -1;
    },
    get isInRolloutGroup () {
      return this.rolloutFraction === 1 || MyWalletHelpers.isStringHashInFraction(Wallet.my.wallet.guid, this.rolloutFraction);
    },
    get userHasAccess () {
      if (Wallet.my.wallet == null) return false;
      return Ethereum.userHasAccess && !this.isInBlacklistedCountry && this.isInWhitelistedState && this.isInRolloutGroup;
    },
    get userAccessReason () {
      let reason;
      if (!Ethereum.userHasAccess) reason = `they do not have access to Ethereum (${Ethereum.userAccessReason})`;
      else if (this.isInBlacklistedCountry) reason = 'they are in a blacklisted country';
      else if (!this.isInWhitelistedState) reason = 'they are not in a whitelisted state';
      else if (!this.isInRolloutGroup) reason = 'they are not in the rollout group';
      else reason = 'Ethereum is initialized, they are not in a blacklisted country, and are in the rollout group';
      return `User can${this.userHasAccess ? '' : 'not'} see ShapeShift because ${reason}`;
    },
    get USAState () {
      return Wallet.my.wallet.shapeshift.USAState;
    }
  };

  service.getRate = (pair) => {
    return service.shapeshift.getRate(pair);
  };

  service.getApproximateQuote = (pair, amount) => {
    return service.shapeshift.getApproximateQuote(pair, amount);
  };

  service.getQuote = (pair, amount) => {
    return service.shapeshift.getQuote(pair, amount);
  };

  service.shift = (quote) => {
    return Wallet.askForSecondPasswordIfNeeded()
                 .then((secPass) => service.shapeshift.shift(quote, secPass));
  };

  service.watchTradeForCompletion = (trade) => {
    return service.shapeshift.watchTradeForCompletion(trade);
  };

  service.buildPayment = (quote, fee) => {
    return service.shapeshift.buildPayment(quote, fee);
  };

  service.checkForCompletedTrades = () => {
    service.shapeshift.checkForCompletedTrades(modals.openShiftTradeDetails);
  };

  service.fetchFullTrades = () => {
    return service.shapeshift.fetchFullTrades();
  };

  service.isDepositTx = (hash) => {
    return service.shapeshift.isDepositTx(hash);
  };

  service.isWithdrawalTx = (hash) => {
    return service.shapeshift.isWithdrawalTx(hash);
  };

  service.setUSAState = (state) => {
    return service.shapeshift.setUSAState(state);
  };

  service.signupForShift = (email, state) => {
    BrowserHelper.safeWindowOpen(`https://docs.google.com/forms/d/e/1FAIpQLSd0r6NU82pQNka87iUkQJc3xZq6y0UHYHo09eZH-6SQZlTZrg/viewform?entry.1192956638=${email}&entry.387129390=${state}`);
  };

  Env.then((options) => {
    let { shapeshift } = options;
    if (shapeshift && !isNaN(shapeshift.rolloutFraction)) {
      service.countriesBlacklist = shapeshift.countriesBlacklist || [];
      service.statesWhitelist = shapeshift.statesWhitelist || [];
      service.rolloutFraction = shapeshift.rolloutFraction || 0;
    }
  });

  return service;
}
