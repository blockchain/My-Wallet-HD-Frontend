angular
  .module('walletApp')
  .controller("SettingsAccountsController", SettingsAccountsController);

function SettingsAccountsController($scope, Wallet, $uibModal, filterFilter) {
  $scope.accounts = Wallet.accounts;
  $scope.display = {
    archived: false
  };

  $scope.numberOfActiveAccounts = () => {
    return Wallet.accounts().filter(a => !a.archived).length
  };

  $scope.newAccount = () => {
    Wallet.clearAlerts();
    let modalInstance = $uibModal.open({
      templateUrl: "partials/account-form.jade",
      controller: "AccountFormCtrl",
      resolve: {
        account: () => void 0
      },
      windowClass: "bc-modal"
    });
    if (modalInstance != null) {
      modalInstance.opened.then(() => {
        Wallet.store.resetLogoutTimeout();
      });
    }
  };

  $scope.editAccount = (account) => {
    Wallet.clearAlerts();
    let modalInstance = $uibModal.open({
      templateUrl: "partials/account-form.jade",
      controller: "AccountFormCtrl",
      resolve: {
        account: () => account
      },
      windowClass: "bc-modal"
    });
    if (modalInstance != null) {
      modalInstance.opened.then(() => {
        Wallet.store.resetLogoutTimeout();
      });
    }
  };

  $scope.showAddress = (account) => {
    let modalInstance = $uibModal.open({
      templateUrl: "partials/request.jade",
      controller: "RequestCtrl",
      resolve: {
        destination: () => account
      },
      windowClass: "bc-modal"
    });
    if (modalInstance != null) {
      modalInstance.opened.then(() => {
        Wallet.store.resetLogoutTimeout();
      });
    }
  };

  $scope.revealXpub = (account) => {
    let modalInstance = $uibModal.open({
      templateUrl: "partials/reveal-xpub.jade",
      controller: "RevealXpubCtrl",
      resolve: {
        account: () => account
      },
      windowClass: "bc-modal"
    });
    if (modalInstance != null) {
      modalInstance.opened.then(() => {
        Wallet.store.resetLogoutTimeout();
      });
    }
  };

  $scope.makeDefault = (account) => {
    Wallet.setDefaultAccount(account);
    Wallet.saveActivity(3);
  };

  $scope.transfer = () => {
    let modalInstance = $uibModal.open({
      templateUrl: "partials/send.jade",
      controller: "SendCtrl",
      resolve: {
        paymentRequest: () => ({
          fromAccount: Wallet.accounts()[Wallet.getDefaultAccountIndex()],
          amount: 0
        })
      },
      windowClass: "bc-modal"
    });
    if (modalInstance != null) {
      modalInstance.opened.then(() => {
        Wallet.store.resetLogoutTimeout();
      });
    }
  };

  $scope.archive = (account) => { Wallet.archive(account) };
  $scope.unarchive = (account) => { Wallet.unarchive(account) };
  $scope.isDefault = (account) => Wallet.isDefaultAccount(account);

}
