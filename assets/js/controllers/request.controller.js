angular
  .module('walletApp')
  .controller('RequestCtrl', RequestCtrl);

function RequestCtrl ($rootScope, $scope, Wallet, Alerts, currency, $uibModalInstance, $log, destination, $translate, $stateParams, filterFilter, $filter, $q, format, smartAccount, Labels) {
  $scope.status = Wallet.status;
  $scope.settings = Wallet.settings;
  $scope.accounts = Wallet.accounts;
  $scope.legacyAddresses = Wallet.legacyAddresses;
  $scope.isBitCurrency = currency.isBitCurrency;
  $scope.format = currency.formatCurrencyForView;
  $scope.fromSatoshi = currency.convertFromSatoshi;

  $scope.destinationLimit = 50;
  $scope.increaseLimit = () => $scope.destinationLimit += 50;

  $scope.state = {
    to: null,
    label: '',
    amount: null
  };

  $scope.destinations = smartAccount.getOptions();
  $scope.state.to = destination || Wallet.my.wallet.hdwallet.defaultAccount;

  $scope.createPaymentRequest = () => {
    $scope.lock();
    Alerts.clear();

    const success = () => $scope.requestCreated = true;

    const error = (error) => {
      if (error === 'NOT_ALPHANUMERIC') {
        $scope.requestForm.label.$error.characters = true;
      } else if (error === 'GAP') {
        $scope.requestForm.label.$error.gap = true;
      } else if (error === 'KV_LABELS_READ_ONLY') {
        Alerts.displayError('NEEDS_REFRESH');
      }
      $scope.requestForm.label.$valid = false;
    };

    let { label, to, amount } = $scope.state;

    if (Wallet.my.wallet.isMetadataReady) {
      $q.resolve(Labels.addLabel(to.index, 15, label, amount))
        .then(success).catch(error).finally($scope.free);
    } else {
      Wallet.askForSecondPasswordIfNeeded().then(pw => {
        Wallet.my.wallet.cacheMetadataKey.bind(Wallet.my.wallet)(pw).then(() => {
          Alerts.displayError('NEEDS_REFRESH');
        });
      });
    }
  };

  $scope.numberOfActiveAccountsAndLegacyAddresses = () => {
    const activeAccounts = filterFilter(Wallet.accounts(), {archived: false});
    const activeAddresses = filterFilter(Wallet.legacyAddresses(), {archived: false});
    return activeAccounts.length + activeAddresses.length;
  };

  $scope.address = () => {
    if (!$scope.status.didInitializeHD) return null;

    if (($scope.state.to != null) && ($scope.state.to.address != null)) {
      return $scope.state.to.address;
    } else if ($scope.status.didInitializeHD) {
      let idx = $scope.state.to.index;
      return Wallet.getReceivingAddressForAccount(idx);
    }
  };

  $scope.paymentRequestURL = () => {
    let { amount, label } = $scope.state;
    let { currency } = $scope.settings;

    let url = $rootScope.rootURL + 'payment_request?' + 'address=' + $scope.address() + '&';
    url += amount ? 'amount_local=' + $scope.fromSatoshi(amount || 0, currency) + '&' : '';
    url += label ? 'message=' + label + ' ' : '';
    return encodeURI(url.slice(0, -1));
  };

  $scope.installLock();
}
