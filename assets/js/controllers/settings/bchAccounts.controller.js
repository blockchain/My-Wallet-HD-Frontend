angular
  .module('walletApp')
  .controller('SettingsBchAccountsController', SettingsBchAccountsController);

function SettingsBchAccountsController ($scope, $stateParams, Wallet, Alerts, $uibModal, modals, BitcoinCash) {
  $scope.bchAccounts = Wallet.my.wallet.bch.accounts;
  $scope.importedBch = Wallet.my.wallet.bch.importedAddresses;

  $scope.editAccount = (account) => {
    Alerts.clear();
    $uibModal.open({
      templateUrl: 'partials/account-form.pug',
      windowClass: 'bc-modal sm',
      resolve: {
        account: () => account
      },
      controller: ($scope, account, $uibModalInstance, BitcoinCash) => {
        $scope.name = account.label;
        $scope.status = { edit: true };
        $scope.isNameUnused = (name) => BitcoinCash.accounts.every(a => a.label !== name);

        $scope.submit = () => {
          $scope.status.busy = true;
          account.label = $scope.name;
          $uibModalInstance.dismiss();
        };
      }
    });
  };

  $scope.revealXpub = (account) => {
    $uibModal.open({
      templateUrl: 'partials/reveal-xpub.pug',
      controller: 'RevealXpubCtrl',
      resolve: {
        account: () => account
      },
      windowClass: 'bc-modal'
    });
  };
}
