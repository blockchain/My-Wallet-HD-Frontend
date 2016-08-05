angular
  .module('walletApp')
  .controller('HomeCtrl', HomeCtrl);

function HomeCtrl ($scope, Wallet, $uibModal) {
  $scope.getTotal = () => Wallet.total('');

  $scope.getLegacyTotal = () => Wallet.total('imported');

  $scope.hasLegacyAddresses = () => {
    if (Wallet.status.isLoggedIn) {
      return Wallet.legacyAddresses().filter(a => !a.archived).length > 0;
    } else {
      return null;
    }
  };

  $scope.activeAccounts = () => {
    if (Wallet.status.isLoggedIn) {
      return Wallet.accounts().filter(a => !a.archived);
    } else {
      return null;
    }
  };
}
