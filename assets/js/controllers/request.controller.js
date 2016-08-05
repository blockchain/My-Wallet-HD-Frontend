angular
  .module('walletApp')
  .controller('RequestCtrl', RequestCtrl);

function RequestCtrl ($rootScope, $scope, Wallet, Alerts, currency, $uibModalInstance, $log, destination, focus, hasLegacyAddress, $translate, $stateParams, filterFilter, $filter, format) {
  $scope.status = Wallet.status;
  $scope.settings = Wallet.settings;
  $scope.accounts = Wallet.accounts;
  $scope.legacyAddresses = Wallet.legacyAddresses;
  $scope.isBitCurrency = currency.isBitCurrency;
  $scope.destinations = [];
  $scope.receiveAddress = null;
  $scope.advanced = false;
  $scope.focus = focus;
  $scope.showPaymentRequestURL = false;

  $scope.destinationLimit = 50;
  $scope.increaseLimit = () => $scope.destinationLimit += 50;

  $scope.hasLegacyAddress = hasLegacyAddress;

  $scope.fields = {
    to: null,
    amount: null,
    label: ''
  };

  for (let account of $scope.accounts()) {
    if (account.index != null && !account.archived) {
      account = format.destination(account);
      $scope.destinations.push(angular.copy(account));
      if ((destination != null) && (destination.index != null) && destination.index === account.index) {
        $scope.fields.to = account;
      }
    }
  }

  for (let address of $scope.legacyAddresses()) {
    address = format.destination(address);

    if (!address.archived) {
      $scope.destinations.push(angular.copy(address));
      if ((destination != null) && (destination.address != null) && destination.address === address.address) {
        $scope.fields.to = address;
      }
    }
  }

  $scope.closeAlert = alert => {
    Alerts.close(alert);
  };

  $scope.advancedReceive = () => {
    $scope.advanced = true;
  };

  $scope.regularReceive = () => {
    $scope.advanced = false;

    $scope.fields.label = '';
    $scope.fields.amount = null;
  };

  $scope.done = () => {
    Alerts.clear();

    if ($scope.fields.label === '' || $scope.fields.to.index == null) {
      $uibModalInstance.dismiss('');
    } else {
      const success = () => {
        $uibModalInstance.dismiss('');
      };

      const error = (error) => {
        if (error === 'NOT_ALPHANUMERIC') {
          $scope.requestForm.label.$error.characters = true;
        } else if (error === 'GAP') {
          $scope.requestForm.label.$error.gap = true;
        }
        $scope.requestForm.label.$valid = false;
      };

      let idx = $scope.fields.to.index;
      Wallet.changeHDAddressLabel($scope.fields.to.index, Wallet.getReceivingAddressIndexForAccount(idx), $scope.fields.label, success, error);
    }
  };

  $scope.cancel = () => {
    Alerts.clear();
    $uibModalInstance.dismiss('');
  };

  $scope.close = () => {
    $scope.cancel();
    $rootScope.$broadcast('enableRequestBeacon');
  };

  $scope.numberOfActiveAccountsAndLegacyAddresses = () => {
    const activeAccounts = filterFilter(Wallet.accounts(), {
      archived: false
    });
    const activeAddresses = filterFilter(Wallet.legacyAddresses(), {
      archived: false
    });
    return activeAccounts.length + activeAddresses.length;
  };

  $scope.$watchCollection('destinations', () => {
    let idx = Wallet.getDefaultAccountIndex();
    if ($scope.hasLegacyAddress) {
      $scope.fields.to = filterFilter(Wallet.legacyAddresses(), {
        isWatchOnly: false,
        archived: false
      })[0];
    }
    if (($scope.fields.to == null) && $scope.accounts().length > 0) {
      if ($stateParams.accountIndex === '' || ($stateParams.accountIndex == null)) {

      } else if ($stateParams.accountIndex === 'imported' || ($stateParams.accountIndex == null)) {

      } else {
        idx = parseInt($stateParams.accountIndex, 10);
      }
      $scope.fields.to = $scope.accounts()[idx];
    }
  });

  $scope.paymentRequestAddress = () => {
    if (!$scope.status.didInitializeHD) return null;

    if (($scope.fields.to != null) && ($scope.fields.to.address != null)) {
      $scope.advanced = false;
      return $scope.fields.to.address;
    } else if ($scope.status.didInitializeHD) {
      let idx = $scope.fields.to.index;
      return Wallet.getReceivingAddressForAccount(idx);
    }
  };

  $scope.paymentRequestURL = () => {
    if ($scope.paymentRequestAddress() == null) return null;

    let url = `bitcoin:${ $scope.paymentRequestAddress() }?`;
    let amount = `amount=${ parseFloat($scope.fields.amount / 100000000) }`;
    let message = `message=${ $scope.fields.label }`;

    if ($scope.fields.amount > 0 && $scope.fields.label !== '') {
      url += amount;
      url += `&`;
      url += message;
    }
    else if ($scope.fields.amount > 0) url += amount;
    else if ($scope.fields.label !== '') url += message;
    else url = url.slice(0, -1);

    return encodeURI(url);
  };
}
