walletApp.directive('labelOrigin', (Wallet) ->
  {
    restrict: "E"
    replace: true
    templateUrl: 'templates/label-origin.jade'
    scope: {
      origin: '='
      fee: '='
      highlight: '='
    }
    link: (scope, elem, attrs) ->

      scope.settings = Wallet.settings
      scope.isBitCurrency = Wallet.isBitCurrency

      scope.determineAvailableBalance = (balance) ->
        return unless balance? && scope.fee?
        final = parseInt(balance) - parseInt(scope.fee)
        return if final < 0 then 0 else final

      scope.determineLabel = (origin) ->
        return unless origin?
        origin.label || origin.address

  }
)
