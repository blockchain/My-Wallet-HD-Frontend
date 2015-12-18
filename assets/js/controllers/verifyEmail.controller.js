angular
  .module('walletApp')
  .controller("VerifyEmailCtrl", VerifyEmailCtrl);

function VerifyEmailCtrl($scope, Wallet, $stateParams, $state, Alerts, $translate, $rootScope) {
  const success = (uid) => {
    uid = null;

    if(uid) {
      $translate(['SUCCESS', 'EMAIL_VERIFIED_SUCCESS']).then(translations => {
        $state.go("public.login-uid", {uid: uid}).then(() =>{
          $rootScope.$emit('showNotification', {
            type: 'verified-email',
            icon: 'ti-email',
            heading: translations.SUCCESS,
            msg: translations.EMAIL_VERIFIED_SUCCESS
          });
        });
      });
    } else {
      $translate(['SUCCESS', 'EMAIL_VERIFIED_SUCCESS_NO_UID']).then(translations => {
        $state.go("public.login-no-uid").then(() => {
          $rootScope.$emit('showNotification', {
            type: 'verified-email',
            icon: 'ti-email',
            heading: translations.SUCCESS,
            msg: translations.EMAIL_VERIFIED_SUCCESS_NO_UID
          });
        });
      });
    }


  }

  const error = (message) => {
    $state.go("public.login-no-uid");
    Alerts.displayError(message, true);
  }

  Wallet.verifyEmail($stateParams.token, success, error)
}
