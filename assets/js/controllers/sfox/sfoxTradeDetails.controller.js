angular
  .module('walletApp')
  .controller('SfoxTradeDetailsController', SfoxTradeDetailsController);

function SfoxTradeDetailsController ($scope, MyWallet, currency, sfox) {
  let trade = $scope.trade;
  let format = currency.formatCurrencyForView;
  let fiat = currency.currencies.find((c) => c.code === 'USD');
  let tx = MyWallet.wallet.txList.transactions(0).find((t) => t.hash === trade.txHash);

  $scope.namespace = 'SFOX';
  $scope.state = '.' + trade.state;
  $scope.type = trade.isBuy ? '.buy' : '.sell';
  $scope.rate = format(1 / trade.outAmount * trade.inAmount, fiat, true);
  $scope.tradeDetails = sfox.sellTradeDetails(null, null, trade, tx);
}
