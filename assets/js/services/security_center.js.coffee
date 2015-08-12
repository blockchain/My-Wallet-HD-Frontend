angular.module("securityCenter", []).factory "SecurityCenter", ($log, Wallet, $rootScope, filterFilter) ->
  settings = Wallet.settings
  user = Wallet.user
  status = Wallet.status
  hasLoaded = false
  # transactions = Wallet.transactions
  # legacyAddresses = []
  # unfilteredLegacyAddresses = Wallet.legacyAddresses

  service = {
    security: {
      level: null
      score: null
    }
  }

  # Legacy addresses are no longer considered for the security level
  # # Check for any level:
  # $rootScope.$watch(
  #   () -> status.legacyAddressBalancesLoaded,
  #   () ->
  #     if legacyAddresses.length == 0 && status.legacyAddressBalancesLoaded == true
  #       for address in filterFilter(filterFilter(unfilteredLegacyAddresses, {archived: false, isWatchOnlyLegacyAddress: false}), greaterThan('balance', 50000))
  #         legacyAddresses.push address
  #     updateLevel()
  # )

  # Check for when it should update the security level:
  $rootScope.$watch(
    () -> status.didConfirmRecoveryPhrase + user.passwordHint + settings.needs2FA + user.isMobileVerified + settings.blockTOR + user.isEmailVerified,
    () ->
      updateLevel()
  )

  # # Check for upgrade to level 3 (transactions that might sweep legacy addresses)
  # $rootScope.$watchCollection(
  #   () -> transactions,
  #   () ->
  #     updateLevel()
  # )

  # greaterThan = (prop, val) ->
  #   (item) ->
  #     if item[prop] > val
  #       true
  #
  # The user may perform these steps in any order, so we need to check for all levels after each change:
  updateLevel = () ->
    # if !status.legacyAddressBalancesLoaded
    #   service.security.level = null
    #   return

    securityObjectives = [
      user.isEmailVerified
      status.didConfirmRecoveryPhrase
      user.passwordHint
      settings.needs2FA
      user.isMobileVerified
      settings.blockTOR
    ]

    securityLevel = 0

    for objective in securityObjectives
      if objective
        securityLevel++

    securityScore = securityLevel / securityObjectives.length
    securityPercent = Math.floor(securityScore * 100) + '%'

    # Update the activity list if the level has changed
    if hasLoaded
      if securityLevel > service.security.level
        Wallet.saveActivity(1)
      else if securityLevel < service.security.level
        Wallet.saveActivity(1)

    if status.didLoadSettings
      hasLoaded = true

    service.security.level = securityLevel
    service.security.score = securityScore

  return service
