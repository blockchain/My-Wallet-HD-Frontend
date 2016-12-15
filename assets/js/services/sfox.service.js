angular
  .module('walletApp')
  .factory('sfox', sfox);

function sfox ($q, Alerts, modals) {
  const watching = {};

  const service = {
    init,
    displayError,
    determineStep,
    fetchExchangeData,
    watchTrades,
    watchTrade
  };

  return service;

  function init (exchange) {
    if (exchange.trades) service.watchTrades(exchange.trades);
    exchange.monitorPayments();
  }

  function displayError (error) {
    if (angular.isString(error)) {
      try {
        error = JSON.parse(error).error;
      } catch (e) {
      }
    } else {
      error = error.error || error.message || error.initial_error || error;
    }
    Alerts.displayError(error);
  }

  function determineStep (exchange, accounts) {
    let profile = exchange.profile;
    if (!profile) {
      return 'create';
    } else {
      let { level, required_docs = [] } = profile.verificationStatus;
      let didVerify = (level === 'verified') || (level === 'pending' && required_docs.length === 0);
      let hasAccount = accounts.length && accounts[0].status === 'active';
      if (!didVerify) {
        return 'verify';
      } else if (!hasAccount) {
        return 'link';
      } else {
        return 'buy';
      }
    }
  }

  function fetchExchangeData (exchange) {
    return $q.resolve(exchange.fetchProfile())
      .then(() => exchange.getTrades())
      .then(service.watchTrades);
  }

  function watchTrades (trades) {
    trades
      .filter(t => !t.bitcoinReceived && !watching[t.receiveAddress])
      .forEach(service.watchTrade);
  }

  function watchTrade (trade) {
    watching[trade.receiveAddress] = true;
    $q.resolve(trade.watchTrade())
      .then(() => trade.refresh())
      .then(() => { modals.openTradeSummary(trade, 'success'); });
  }
}
