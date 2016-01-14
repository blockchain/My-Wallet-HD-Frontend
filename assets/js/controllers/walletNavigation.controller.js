angular
  .module('walletApp')
  .controller('WalletNavigationCtrl', WalletNavigationCtrl);

function WalletNavigationCtrl($scope, Wallet, Alerts, SecurityCenter, $state, $stateParams, $uibModal, filterFilter, $location) {
  $scope.status = Wallet.status;
  $scope.total = Wallet.total;
  $scope.settings = Wallet.settings;
  $scope.security = SecurityCenter.security;

  $scope.selectedAccountIndex = $stateParams.accountIndex;

  $scope.numberOfActiveLegacyAddresses = () => {
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
    return ($scope.numberOfActiveAccounts() <= 1) ?
      Wallet.getDefaultAccountIndex() : '';
  };

  $scope.showImported = () => {
    return ($scope.selectedAccountIndex === 'imported' &&
            $state.current.name === 'wallet.common.transactions');
  };

  $scope.accountsRoute = () => [
    'wallet.common.settings.accounts_index',
    'wallet.common.settings.accounts_addresses',
    'wallet.common.settings.imported_addresses',
  ].indexOf($state.current.name) > -1

  $scope.showOrHide = (path) => {
    return $location.url().indexOf(path) !== -1;
  };

  $scope.newAccount = () => {
    Alerts.clear();
    let modalInstance = $uibModal.open({
      templateUrl: 'partials/account-form.jade',
      controller: 'AccountFormCtrl',
      resolve: {
        account: () => void 0
      },
      windowClass: 'bc-modal small'
    });
    if (modalInstance != null) {
      modalInstance.opened.then(() => {
        Wallet.store.resetLogoutTimeout();
      });
    }
  };

  $scope.getLegacyTotal = () => Wallet.total('imported');

  $scope.termsOfService = () => {
    let modalInstance = $uibModal.open({
      templateUrl: "partials/user-agreement.jade",
      controller: function () {},
      windowClass: "bc-modal terms-modal"
    });
  }

  $scope.privacyPolicy = () => {
    let modalInstance = $uibModal.open({
      templateUrl: 'partials/privacy-policy.jade',
      windowClass: 'bc-modal terms-modal'
    });
  };

  $scope.didLoad = () => {
    $scope.accounts = Wallet.accounts;
  };

  $scope.didLoad();

}
