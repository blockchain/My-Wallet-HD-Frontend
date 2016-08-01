angular
  .module('walletApp')
  .controller('ExportHistoryController', ExportHistoryController);

function ExportHistoryController ($scope, $sce, $translate, $filter, format, Wallet, MyWallet, activeIndex) {
  $scope.limit = 50;
  $scope.incLimit = () => $scope.limit += 50;

  let accounts = Wallet.accounts().filter(a => !a.archived && a.index != null);
  let addresses = Wallet.legacyAddresses().filter(a => !a.archived);

  let allHD = {
    type: $translate.instant('ALL'),
    label: $translate.instant('HD_ADDRESSES'),
    address: accounts.map(a => a.extendedPublicKey)
  };

  let allAddresses = {
    type: $translate.instant('ALL'),
    label: $translate.instant('IMPORTED_ADDRESSES'),
    address: addresses.map(a => a.address)
  };

  $scope.targets = [allHD, allAddresses].concat(accounts.concat(addresses).map(format.origin));
  $scope.isLast = (t) => t === $scope.targets[$scope.limit - 1];

  $scope.activeCount = (
    Wallet.accounts().filter(a => !a.archived).length +
    Wallet.legacyAddresses().filter(a => !a.archived).length
  );

  $scope.setActive = () => {
    let t = $scope.target;
    $scope.active = t.index != null ? t.xpub : t.address;
  };

  if ($scope.activeCount === 1) {
    $scope.target = $scope.targets[$scope.targets.length - 1];
  } else if (activeIndex === '') {
    $scope.target = allHD;
  } else if (activeIndex === 'imported') {
    $scope.target = allAddresses;
  } else if (!isNaN(activeIndex)) {
    for (let i = 0; i < $scope.targets.length; i++) {
      let target = $scope.targets[i];
      if (target.index === parseInt(activeIndex, 10)) {
        $scope.target = target;
        break;
      }
    }
  }

  if ($scope.target) {
    $scope.setActive();
  }

  $scope.format = 'dd/MM/yyyy';
  $scope.options = { minDate: new Date(1231024500000), maxDate: new Date() };

  $scope.exportFormat = 'csv';
  $scope.start = { open: false, date: Date.now() - 604800000 };
  $scope.end = { open: false, date: Date.now() };

  $scope.formatDate = (date) => $filter('date')(date, 'dd/MM/yyyy');

  $scope.submit = () => {
    $scope.busy = true;
    let start = $scope.formatDate($scope.start.date);
    let end = $scope.formatDate($scope.end.date);
    Wallet.exportHistory(start, end, $scope.active).finally(() => $scope.busy = false);
  };
}
