angular
  .module('walletApp')
  .controller('RecoverFundsCtrl', RecoverFundsCtrl);

function RecoverFundsCtrl ($scope, $rootScope, $state, $timeout, $translate, $cookies, Wallet, Alerts) {
  $scope.isValidMnemonic = Wallet.isValidBIP39Mnemonic;
  $scope.currentStep = 1;
  $scope.fields = {
    email: '',
    password: '',
    confirmation: '',
    mnemonic: '',
    bip39phrase: ''
  };

  $scope.browser = {disabled: true};

  $scope.performImport = () => {
    $scope.working = true;

    const success = (result) => {
      $cookies.put('session', result.sessionToken);
      $cookies.put('uid', result.guid);

      $scope.working = false;
      $scope.nextStep();
      $rootScope.$safeApply();

      const loginSuccess = () => {
        Alerts.displaySuccess('Successfully recovered wallet!');
      };
      const loginError = (err) => {
        console.error(err);
      };
      $timeout(() => {
        $state.go('public.login-uid', {uid: result.guid});
        Wallet.login(
          result.guid, result.password, null, null, loginSuccess, loginError
        );
      }, 4000);
    };

    const error = (err) => {
      $scope.working = false;
      Alerts.displayError(err || 'RECOVERY_ERROR');
    };

    Wallet.my.recoverFromMnemonic(
      $scope.fields.email,
      $scope.fields.password,
      $scope.fields.mnemonic,
      $scope.fields.bip39phrase,
      success, error
    );
  };

  $scope.getMnemonicLength = () => {
    $scope.isValidMnemonicLength = $scope.fields.mnemonic.split(' ').length === 12;
  };

  $scope.nextStep = () => {
    $scope.working = true;
    $scope.$$postDigest(() => {
      if (!Wallet.my.browserCheck()) {
        $scope.working = false;
        $scope.browser.disabled = true;
        $scope.browser.msg = $translate.instant('UNSUITABLE_BROWSER');
      } else {
        $scope.working = false;
        $scope.currentStep++;
        $scope.fields.confirmation = '';
      }
    });
  };

  $scope.goBack = () => {
    $scope.currentStep--;
  };
}
