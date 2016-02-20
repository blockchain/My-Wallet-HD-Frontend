angular
  .module('walletApp')
  .controller("NavigationCtrl", NavigationCtrl);

function NavigationCtrl($rootScope, $scope, Wallet, Confirm, currency, SecurityCenter, $translate, $cookies, $state, filterFilter, $interval, $timeout, $uibModal) {
  $scope.status = Wallet.status;
  $scope.security = SecurityCenter.security;
  $scope.settings = Wallet.settings;

  $scope.logout = () => {
    if (!Wallet.isSynchronizedWithServer()) {
      $translate("CHANGES_BEING_SAVED").then( translation => {
        Confirm.open(translation).result.then(() => { $scope.doLogout() });
      })
    } else {
      $scope.doLogout();
    }
  };

  $scope.openZeroBlock = () => {
    const win = window.open('https://zeroblock.com', "_blank");
    win.focus();
  };

  $scope.openBCmarkets = () => {
    const win = window.open('https://markets.blockchain.info/', "_blank");
    win.focus();
  };

//  #################################
//  #           Private             #
//  #################################

  $scope.doLogout = () => {
    $translate("ARE_YOU_SURE_LOGOUT").then( translation => {

      $scope.logoutModal = Confirm.open(translation)

      $scope.logoutModal.result.then(() => {
        $scope.uid = null;
        $scope.password = null;
        $cookies.remove("password");
//      $cookies.remove("uid") // Pending a "Forget Me feature"

        $state.go("wallet.common.transactions", {
          accountIndex: ""
        });
        Wallet.logout();  // Refreshes the browser, so won't return
      });
    });
  };

  const intervalTime = 15 * 60 * 1000;
  $interval((() => {
    if (Wallet.status.isLoggedIn) {
      currency.fetchExchangeRate();
    }
  }), intervalTime);
}
