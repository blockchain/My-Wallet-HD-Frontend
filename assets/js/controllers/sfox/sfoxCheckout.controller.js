angular
  .module('walletApp')
  .controller('SfoxCheckoutController', SfoxCheckoutController);

function SfoxCheckoutController ($scope, $timeout, $stateParams, $q, Wallet, MyWalletHelpers, Alerts, currency, modals, sfox, accounts, $rootScope, showCheckout, buyMobile) {
  let exchange = $scope.vm.external.sfox;

  $scope.trades = exchange.trades;
  $scope.dollars = currency.currencies.filter(c => c.code === 'USD')[0];
  $scope.bitcoin = currency.bitCurrencies.filter(c => c.code === 'BTC')[0];

  $scope.buying = sfox.buying;
  $scope.buyHandler = (...args) => sfox.buy(...args);
  $scope.buyQuoteHandler = sfox.fetchQuote.bind(null, exchange);
  $scope.buyLimits = () => ({
    min: 10,
    max: sfox.profile && sfox.profile.limits.buy || 100
  });

  $scope.selling = sfox.selling;
  $scope.sellHandler = (...args) => sfox.sell(...args);
  $scope.sellQuoteHandler = sfox.fetchSellQuote.bind(null, exchange);
  $scope.sellLimits = () => ({
    min: 10,
    max: sfox.profile && sfox.profile.limits.sell || 100
  });

  $scope.openSfoxSignup = (quote) => {
    $scope.modalOpen = true;
    return modals.openSfoxSignup(exchange, quote).finally(() => { $scope.modalOpen = false; });
  };

  $scope.state = {
    account: accounts[0],
    trades: exchange.trades,
    buyLevel: exchange.profile && exchange.profile.verificationStatus.level
  };

  $scope.setState = () => {
    $scope.state.trades = exchange.trades;
    $scope.state.buyLevel = exchange.profile && exchange.profile.verificationStatus.level;
  };

  $scope.stepDescription = () => {
    let stepDescriptions = {
      'verify': { text: 'Verify Identity', i: 'ti-id-badge' },
      'upload': { text: 'Verify Identity', i: 'ti-id-badge' },
      'link': { text: 'Link Payment', i: 'ti-credit-card bank bank-lrg' }
    };
    let step = sfox.determineStep(exchange, accounts);
    return stepDescriptions[step];
  };

  $scope.userId = exchange.user;
  $scope.siftScienceEnabled = false;

  $scope.signupCompleted = accounts[0] && accounts[0].status === 'active';
  $scope.showCheckout = $scope.signupCompleted || (showCheckout && !$scope.userId);

  $scope.inspectTrade = modals.openTradeSummary;

  $scope.tabs = {
    selectedTab: $stateParams.selectedTab || 'BUY_BITCOIN',
    options: ['BUY_BITCOIN', 'SELL_BITCOIN', 'ORDER_HISTORY'],
    select (tab) { this.selectedTab = this.selectedTab ? tab : null; }
  };

  $scope.buySuccess = (trade) => {
    sfox.watchTrade(trade);
    $scope.tabs.select('ORDER_HISTORY');
    modals.openTradeSummary(trade, 'initiated');
    exchange.fetchProfile().then($scope.setState);
    buyMobile.callMobileInterface(buyMobile.BUY_COMPLETED);
    // Send SFOX user identifier and trade id to Sift Science, inside an iframe:
    if ($scope.qaDebugger) {
      console.info('Load Sift Science iframe');
    }
    $scope.tradeId = trade.id;
    $scope.siftScienceEnabled = true;
  };
}
