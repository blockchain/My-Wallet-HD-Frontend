angular
  .module('walletApp')
  .controller("UnsubscribeCtrl", UnsubscribeCtrl);

function UnsubscribeCtrl($scope, $rootScope, WalletTokenEndpoints, $stateParams, $state, Alerts, $translate) {
  Alerts.clear()

  const success = (res) => {
    $translate('UNSUBSCRIBE_SUCCESS').then(translation => {
      $state.go("public.login-uid", {uid: res.guid}).then(() => {
        Alerts.displaySuccess(translation)
      });
    });

    $rootScope.$safeApply();
  }

  const error = (res) => {
    $state.go("public.login-no-uid").then(() => {
      Alerts.displayError(res.error, true);
    });
    $rootScope.$safeApply();
  }

  WalletTokenEndpoints.unsubscribe($stateParams.token).then(success).catch(error);
}
