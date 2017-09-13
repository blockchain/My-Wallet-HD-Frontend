angular
  .module('walletApp')
  .controller('BuySellCtrl', BuySellCtrl);

function BuySellCtrl ($rootScope, Env, AngularHelper, $scope, $state, Alerts, Wallet, currency, buySell, MyWallet, $q, $stateParams, modals) {
  $scope.buySellStatus = buySell.getStatus;
  $scope.trades = buySell.trades;

  $scope.status = {
    loading: false,
    modalOpen: false
  };

  $scope.setCurrency = () => {
    if ($stateParams.countryCode) {
      if ($stateParams.countryCode === 'DK') return currency.coinifyCurrencies.filter(c => c.code === 'DKK')[0];
      else if ($stateParams.countryCode === 'GB') return currency.coinifyCurrencies.filter(c => c.code === 'GBP')[0];
      else return currency.coinifyCurrencies.filter(c => c.code === 'EUR')[0];
    }
    buySell.fetchProfile().then(() => {
      return buySell.getExchange().profile.defaultCurrency;
    });
  };

  $scope.walletStatus = Wallet.status;
  $scope.status.metaDataDown = $scope.walletStatus.isLoggedIn && !$scope.buySellStatus().metaDataService;

  $scope.onCloseModal = () => {
    $scope.status.modalOpen = false;
    $scope.kyc = buySell.kycs[0];
    buySell.pollKYC();
  };

  $scope.initialize = () => {
    $scope.currencies = currency.coinifyCurrencies;
    $scope.settings = Wallet.settings;
    $scope.transaction = { fiat: undefined, currency: { code: $scope.setCurrency() } };
    $scope.sellTransaction = { fiat: undefined, currency: { code: $scope.setCurrency() } };
    $scope.sellCurrencySymbol = currency.conversions[$scope.sellTransaction.currency.code];
    $scope.limits = {card: {}, bank: {}};
    $scope.sellLimits = {card: {}, bank: {}};
    $scope.state = {buy: true};
    $scope.rating = 0;

    $scope.buy = (quote, trade) => {
      if (!$scope.status.modalOpen) {
        $scope.status.modalOpen = true;
        modals.openBuyView(quote, trade).result.finally($scope.onCloseModal).catch($scope.onCloseModal);
      }
    };

    $scope.sell = (trade, bankMedium, payment, options) => {
      if (!$scope.status.modalOpen) {
        $scope.status.modalOpen = true;
        buySell.openSellView(trade, bankMedium, payment, options).finally(() => {
          $scope.onCloseModal();
        });
      }
    };

    // for quote
    buySell.getExchange();

    $scope.$watch('settings.currency', () => {
      $scope.transaction.currency = $scope.setCurrency();
      $scope.sellTransaction.currency = $scope.setCurrency();
    }, true);

    $scope.$watch('sellTransaction.currency', (newVal, oldVal) => {
      let curr = $scope.sellTransaction.currency || null;
      $scope.sellCurrencySymbol = currency.conversions[curr.code];
    });

    if (buySell.getStatus().metaDataService && buySell.getExchange().user) {
      $scope.status.loading = true;
      $scope.exchange = buySell.getExchange();
      $scope.exchangeCountry = $scope.exchange._profile._country || $stateParams.countryCode;

      buySell.fetchProfile().then(() => {
        let currency = buySell.getExchange().profile.defaultCurrency;
        $scope.transaction = { currency: { code: currency } };
        $scope.sellTransaction = { currency: { code: currency } };
        let getCurrencies = buySell.getExchange().getBuyCurrencies().then(currency.updateCoinifyCurrencies);

        let getTrades = buySell.getTrades().then(() => {
          let pending = buySell.trades.pending;
          $scope.pendingTrade = pending.sort((a, b) => b.id - a.id)[0];
        }).catch(() => {
          $scope.fetchTradeError = true;
        });

        let getKYCs = buySell.getKYCs().then(() => {
          $scope.kyc = buySell.kycs[0];
          if ($scope.exchange.profile) { // NOTE added .profile here
            if (+$scope.exchange.profile.level.name < 2) {
              if ($scope.kyc) {
                buySell.pollKYC();
              } else {
                buySell.getKYCs().then(kycs => {
                  if (kycs.length > 0) buySell.pollKYC();
                  $scope.kyc = kycs[0];
                });
              }
            }
          } else {
            $scope.$watch(buySell.getExchange, (ex) => $scope.exchange = ex);
          }
        }).catch(() => {
          $scope.fetchKYCError = true;
        });

        $q.all([getTrades, getKYCs, getCurrencies]).then(() => {
          $scope.status.loading = false;
          $scope.status.disabled = false;
        });
      }).catch(() => {
        $scope.status.loading = false;
        $scope.status.exchangeDown = true;
        AngularHelper.$safeApply($scope);
      });
    } else {
      $scope.status.disabled = false;
    }

    $scope.openKyc = () => {
      $q.resolve(buySell.getOpenKYC())
        .then((kyc) => $scope.buy(null, kyc));
    };

    $scope.openSellKyc = () => {
      if (!$scope.kyc) {
        buySell.triggerKYC().then(kyc => $scope.sell(kyc));
      } else {
        $scope.sell($scope.kyc);
      }
    };

    $scope.changeCurrency = (curr) => {
      if (curr && $scope.currencies.some(c => c.code === curr.code)) {
        $scope.transaction.currency = curr;
      }
    };

    $scope.changeSellCurrency = (curr) => {
      if (curr && $scope.currencies.some(c => c.code === curr.code)) {
        $scope.sellTransaction.currency = curr;
        $scope.sellCurrencySymbol = currency.conversions[curr.code];
      }
    };

    $scope.submitFeedback = (rating) => buySell.submitFeedback(rating);
  };

  let watchLogin;

  if (Wallet.status.isLoggedIn) {
    $scope.initialize();
  } else {
    watchLogin = $scope.$watch('status.isLoggedIn', (isLoggedIn) => {
      if (isLoggedIn) {
        $scope.initialize();
        watchLogin();
      }
    });
  }

  let disabled;

  Env.then(env => {
    disabled = env.partners.coinify.disabled;
  });

  $scope.getIsTradingDisabled = () => {
    let profile = $scope.exchange && $scope.exchange.profile;
    let canTrade = profile && profile.canTrade;

    return canTrade === false || disabled;
  };

  $scope.getIsTradingDisabledReason = () => {
    let profile = $scope.exchange && $scope.exchange.profile;
    let cannotTradeReason = profile && profile.cannotTradeReason;

    if (disabled) cannotTradeReason = 'disabled';
    return cannotTradeReason;
  };

  $scope.setSellLimits = () => {
    if ($scope.exchange._profile) {
      $scope.sellLimits = $scope.exchange._profile._currentLimits._bank._outRemaining;
    }
  };

  const ONE_DAY_MS = 86400000;

  $scope.getDays = () => {
    let profile = buySell.getExchange().profile;
    let verifyDate = profile && profile.canTradeAfter;
    return isNaN(verifyDate) ? 1 : Math.ceil((verifyDate - Date.now()) / ONE_DAY_MS);
  };

  let email = MyWallet.wallet.accountInfo.email;
  Env.then(env => {
    // TODO: don't pass all of 'env' into shouldDisplaySellTab()
    $scope.canSeeSellTab = MyWallet.wallet.external.shouldDisplaySellTab(email, env, 'coinify');
    $scope.tabs = {
      selectedTab: $stateParams.selectedTab || 'BUY_BITCOIN',
      options: $rootScope.inMobileBuy || !$scope.canSeeSellTab
      ? ['BUY_BITCOIN', 'ORDER_HISTORY']
      : ['BUY_BITCOIN', 'SELL_BITCOIN', 'ORDER_HISTORY'],
      select (tab) {
        this.selectedTab = this.selectedTab ? tab : null;
        $state.params.selectedTab = this.selectedTab;
      }
    };
  });

  $rootScope.$on('fetchExchangeProfile', () => {
    $scope.status.disabled = true;
    $scope.initialize();
  });

  AngularHelper.installLock.call($scope);
}
