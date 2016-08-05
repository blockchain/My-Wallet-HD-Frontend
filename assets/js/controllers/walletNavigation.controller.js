angular
  .module('walletApp')
  .controller('WalletNavigationCtrl', WalletNavigationCtrl);

function WalletNavigationCtrl ($rootScope, $scope, Wallet, Alerts, SecurityCenter, $state, $stateParams, $uibModal, filterFilter, $location) {
  $scope.status = Wallet.status;
  $scope.total = Wallet.total;
  $scope.settings = Wallet.settings;
  $scope.security = SecurityCenter.security;

  $scope.selectedAccountIndex = $stateParams.accountIndex;

  $scope.numberOfActiveLegacyAddresses = () => {
    if (!Wallet.status.isLoggedIn) return null;

    return filterFilter(Wallet.legacyAddresses(), {
      archived: false
    }).length;
  };

  $scope.numberOfActiveAccounts = () => {
    return filterFilter(Wallet.accounts(), {
      archived: false
    }).length;
  };

  $scope.getMainAccountId = () => {
    if (!$scope.status.isLoggedIn) return 0;
    return ($scope.numberOfActiveAccounts() <= 1) ? Wallet.getDefaultAccountIndex() : '';
  };

  $scope.showImported = () => {
    return ($scope.selectedAccountIndex === 'imported' &&
            $state.current.name === 'wallet.common.transactions');
  };

  $scope.accountsRoute = () => [
    'wallet.common.settings.accounts_index',
    'wallet.common.settings.accounts_addresses',
    'wallet.common.settings.imported_addresses'
  ].indexOf($state.current.name) > -1;

  $scope.showOrHide = (path) => $location.url().indexOf(path) !== -1;

  $scope.newAccount = () => {
    Alerts.clear();
    $uibModal.open({
      templateUrl: 'partials/account-form.jade',
      controller: 'AccountFormCtrl',
      windowClass: 'bc-modal sm',
      resolve: {
        account: () => void 0
      }
    });
  };

  $scope.getLegacyTotal = () => Wallet.total('imported');

  $scope.didLoad = () => {
    $scope.accounts = Wallet.accounts;
  };

  $rootScope.supportModal = () => $uibModal.open({
    templateUrl: 'partials/support.jade',
    windowClass: 'bc-modal auto'
  });

  $scope.didLoad();
}
