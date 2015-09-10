walletApp.controller("ClaimCtrl", ($scope, Wallet, $translate, $stateParams, $state) => {
  const balance = Wallet.fetchBalanceForRedeemCode($stateParams.code);
  Wallet.goal.claim = {code: $stateParams.code, balance: balance};
  if (!Wallet.status.isLoggedIn) {
    Wallet.displayInfo("Please login to your wallet or create a new one to proceed.", true);
    $state.go("login.show");
  }
});