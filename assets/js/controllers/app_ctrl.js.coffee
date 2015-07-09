walletApp.controller "AppCtrl", ($scope, Wallet, $state, $rootScope, $location, $cookieStore, $timeout, $modal, $window, $translate) ->
  $scope.status    = Wallet.status
  $scope.settings = Wallet.settings
  $rootScope.isMock = Wallet.isMock
  $scope.goal = Wallet.goal

  $scope.menu = { isCollapsed: false }
  $scope.toggleMenu = () ->
    $scope.menu.isCollapsed = !$scope.menu.isCollapsed
  $scope.hideMenu = () ->
    $scope.menu.isCollapsed = false

  # getUserMedia is not supported by Safari and IE.
  $rootScope.browserWithCamera = (navigator.getUserMedia || navigator.mozGetUserMedia ||  navigator.webkitGetUserMedia || navigator.msGetUserMedia) != undefined

  $scope.request = () ->
    Wallet.clearAlerts()

    modalInstance = $modal.open(
      templateUrl: "partials/request.jade"
      controller: "RequestCtrl"
      resolve:
        destination: -> null
      windowClass: "bc-modal"
    )
    if modalInstance?
      modalInstance.opened.then () ->
        Wallet.store.resetLogoutTimeout()

  $scope.send = () ->
    Wallet.clearAlerts()
    modalInstance = $modal.open(
      templateUrl: "partials/send.jade"
      controller: "SendCtrl"
      resolve:
        paymentRequest: ->
          {address: "", amount: ""}
      windowClass: "bc-modal"

    )
    if modalInstance?
      modalInstance.opened.then () ->
        Wallet.store.resetLogoutTimeout()

  #################################
  #           Private             #
  #################################

  $scope.$on('$stateChangeSuccess', (event, toState, toParams, fromState, fromParams) ->
    if toState.name != "login.show" && toState.name != "login" && toState.name != "register" && toState.name != "open" && toState.name != "verify-email" && toState.name != "verify-email-with-guid" && $scope.status.isLoggedIn == false
      $state.go("login.show")
    if Wallet.status.isLoggedIn && Wallet.store.resetLogoutTimeout?
      Wallet.store.resetLogoutTimeout()
  )

  $scope.$watch "status.isLoggedIn", () ->
    $timeout(()->
      $scope.checkGoals()
    ,0)

  $scope.$watchCollection "goal", () ->
    $timeout(()->
      $scope.checkGoals()
    ,0)

  $scope.checkGoals = () ->
    if $scope.status.isLoggedIn
      unless Wallet.settings.currency? && Wallet.settings.btcCurrency?
        return $timeout (-> $scope.checkGoals()), 100
      if Wallet.goal?
        if Wallet.goal.send?
          $modal.open(
            templateUrl: "partials/send.jade"
            controller: "SendCtrl"
            resolve:
              paymentRequest: ->
                Wallet.goal.send
            windowClass: "bc-modal"
          )

          Wallet.goal.send = undefined

        if Wallet.goal.claim?
          modalInstance = $modal.open(
            templateUrl: "partials/claim.jade"
            controller: "ClaimModalCtrl"
            resolve:
              claim: ->
                Wallet.goal.claim
            windowClass: "bc-modal"
          )

          modalInstance.result.then(() ->
            Wallet.goal.claim = undefined
          )

        if Wallet.goal.auth
          $translate("AUTHORIZED").then (titleTranslation) ->
            $translate("AUTHORIZED_MESSAGE").then (messageTranslation) ->
              modalInstance = $modal.open(
                templateUrl: "partials/modal-notification.jade"
                controller: "ModalNotificationCtrl"
                windowClass: "notification-modal"
                resolve:
                  notification: ->
                    {
                      type: 'authorization-verified'
                      icon: 'ti-check'
                      heading: titleTranslation
                      msg: messageTranslation
                    }
              )


    # Goals which don't necessarily require a login:
    if Wallet.goal.verifyEmail?
      unless Wallet.status.isLoggedIn
        $translate("PLEASE_LOGIN_FIRST").then (translation) ->
          Wallet.displayInfo translation, true
        $state.go("login.show")
        return

      success = (message) ->
        Wallet.user.isEmailVerified = true

        $state.go("wallet.common.transactions", {accountIndex: "accounts"})

        # Ignoring message, using our own:
        $translate("EMAIL_VERIFIED").then (translation) ->
          Wallet.displaySuccess(translation)

      error = (error) ->
        $state.go "/"

        console.log(error)
        $translate("EMAIL_VERIFICATION_FAILED").then (translation) ->
          Wallet.displayError(translation)

      Wallet.verifyEmail(Wallet.goal.verifyEmail, success, error)

      Wallet.goal.verifyEmail = undefined

  $scope.$on "requireSecondPassword", (notification, defer, insist) ->
    modalInstance = $modal.open(
      templateUrl: "partials/second-password.jade"
      controller: "SecondPasswordCtrl"
      backdrop: if insist then "static" else null # Undismissable if "insist"
      resolve:
        insist: ->
          insist
        defer: ->
          defer

    )

  $scope.$on "needsUpgradeToHD", (notification, continueCallback) ->
    modalInstance = $modal.open(
      templateUrl: "partials/upgrade.jade"
      controller: "UpgradeCtrl",
      backdrop: "static" # Undismissable
      windowClass: "bc-modal"
    )
    modalInstance.result.then(() ->
      continueCallback()
    )

  $scope.back = () ->
    $window.history.back()
