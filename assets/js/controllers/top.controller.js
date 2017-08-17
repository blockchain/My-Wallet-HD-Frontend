angular
  .module('walletApp')
  .controller('TopCtrl', TopCtrl);

function TopCtrl ($scope, $filter, Wallet, currency, browser, Ethereum, assetContext, MyBlockchainApi) {
  let isUsingRequestQuickCopyExperiment = MyBlockchainApi.createExperiment(1);

  $scope.copied = false;
  $scope.status = Wallet.status;
  $scope.settings = Wallet.settings;
  $scope.isBitCurrency = currency.isBitCurrency;
  $scope.BTCCurrency = currency.bitCurrencies.filter(c => c.code === 'BTC')[0];

  $scope.browser = browser;

  $scope.toggleDisplayCurrency = () => Wallet.toggleDisplayCurrency();

  $scope.getTotal = () => Wallet.total();
  $scope.getEthTotal = () => Ethereum.balance;

  $scope.hideBtcBalance = () => assetContext.getContext().balance === 'eth';
  $scope.hideEthBalance = () => assetContext.getContext().balance === 'btc';
  $scope.showBtcClipboard = () => assetContext.getContext().defaultTo === 'btc';
  $scope.showAll = () => !$scope.hideBtcBalance() && !$scope.hideEthBalance();
  $scope.showAsset = () => $scope.hideBtcBalance() || $scope.hideEthBalance();

  $scope.resetCopy = () => $scope.copied = false;

  $scope.nextAddress = () => {
    if ($scope.copied) return;
    $scope.copied = true;
    isUsingRequestQuickCopyExperiment.recordB();
    let defaultIdx = Wallet.my.wallet.hdwallet.defaultAccountIndex;
    return Wallet.getReceivingAddressForAccount(defaultIdx);
  };
}
