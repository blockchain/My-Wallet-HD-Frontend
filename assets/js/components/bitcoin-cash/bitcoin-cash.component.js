angular
  .module('walletApp')
  .component('bitcoinCash', {
    bindings: {

    },
    templateUrl: 'templates/bitcoin-cash/bitcoin-cash.pug',
    controller: bitcoinCashController,
    controllerAs: '$ctrl'
  });

function bitcoinCashController (modals, MyWallet, Wallet, localStorageService, ShapeShift) {
  this.showBitcoinCashAbout = modals.openBitcoinCashAbout;
  this.showWallets = () => localStorageService.get('bcash-about') || false;
  this.activeWallets = Wallet.accounts().filter(a => !a.archived);
}