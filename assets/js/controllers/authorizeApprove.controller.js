angular
  .module('walletApp')
  .controller("AuthorizeApproveCtrl", AuthorizeApproveCtrl);

function AuthorizeApproveCtrl($window, $scope, WalletTokenEndpoints, $stateParams, $state, Alerts, $translate, $rootScope) {
  $scope.success = false

  const success = (res) => {

    $scope.checkingToken = false;
    $scope.busyApproving = false;
    $scope.busyRejecting = false;

    // If differentBrowser is called, success will be null:
    if (res.success == null) return;

    $scope.success = true

    $rootScope.$safeApply();
  }

  const error = (res) => {
    $scope.checkingToken = false;
    $scope.busyApproving = false;
    $scope.busyRejecting = false;

    $state.go("public.login-no-uid");
    Alerts.displayError(res.error, true);
    $rootScope.$safeApply();
  }

  const differentBrowser = (details) => {
    $scope.checkingToken = false;

    $scope.differentBrowser = true;
    $scope.details = details;
    $rootScope.$safeApply();
  }

  $scope.checkingToken = true;

  WalletTokenEndpoints.authorizeApprove($stateParams.token, differentBrowser, null)
    .then(success)
    .catch(error);

  $scope.approve = () => {
    $scope.busyApproving = true;
    WalletTokenEndpoints.authorizeApprove($stateParams.token, () => {}, true)
      .then(success)
      .catch(error);
  }

  $scope.reject = () => {
    $scope.busyRejecting = true;

    const rejected = () => {
      $scope.busyRejecting = false;

      $translate('AUTHORIZE_REJECT_SUCCESS').then(translation => {
        $state.go("public.login-no-uid").then(() => {
          Alerts.displaySuccess(translation)
        });
      });
    };

    WalletTokenEndpoints.authorizeApprove($stateParams.token, () => {}, false)
      .then(rejected)
      .catch(error);
  }
}
