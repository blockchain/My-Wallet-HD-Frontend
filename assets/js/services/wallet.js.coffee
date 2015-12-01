"use strict"

##################
# MyWallet hacks #
##################

# Avoid lazy loading (complicates asset management)
loadScript = (src, success, error) ->
  success()

# Don't allow it to play sound:
playSound = (id) ->
  return

##################################
# Wallet service                 #
#                                #
# AngularJS wrapper for MyWallet #
##################################

walletServices = angular.module("walletServices", [])
walletServices.factory "Wallet", ($log, $http, $window, $timeout, Alerts, MyWallet, MyBlockchainApi, MyBlockchainSettings, MyWalletStore, MyWalletPayment, $rootScope, ngAudio, $cookieStore, $translate, $filter, $state, $q, bcPhoneNumber) ->
  wallet = {
    goal: {auth: false},
    status: {isLoggedIn: false, didUpgradeToHd: null, didInitializeHD: false, didLoadSettings: false, didLoadTransactions: false, didLoadBalances: false, didConfirmRecoveryPhrase: false},
    settings: {currency: null,  displayCurrency: null, language: null, btcCurrency: null, needs2FA: null, twoFactorMethod: null, feePerKB: null, handleBitcoinLinks: false, blockTOR: null, rememberTwoFactor: null, secondPassword: null, ipWhitelist: null, apiAccess: null, restrictToWhitelist: null, loggingLevel: null},
    user: {current_ip: null, email: null, mobile: null, passwordHint: "", internationalMobileNumber: null}
  }

  wallet.fiatHistoricalConversionCache = {}

  wallet.conversions = {}

  wallet.paymentRequests = []
  wallet.my = MyWallet
  wallet.settings_api = MyBlockchainSettings
  wallet.store = MyWalletStore
  wallet.payment = MyWalletPayment
  wallet.api = MyBlockchainApi
  wallet.transactions = []
  wallet.languages = []
  wallet.currencies = []
  wallet.btcCurrencies = [{ serverCode: 'BTC', code: 'BTC', conversion: 100000000 }, { serverCode: 'MBC', code: 'mBTC', conversion: 100000 }, { serverCode: 'UBC', code: 'bits', conversion: 100 }]
  wallet.api_code = '1770d5d9-bcea-4d28-ad21-6cbd5be018a8'

  wallet.store.setAPICode(wallet.api_code)

  ##################################
  #             Public             #
  ##################################

  wallet.didLogin = (uid, successCallback) ->
    wallet.status.isLoggedIn = true
    wallet.status.didUpgradeToHd = wallet.my.wallet.isUpgradedToHD
    if wallet.my.wallet.isUpgradedToHD
      wallet.status.didConfirmRecoveryPhrase = wallet.my.wallet.hdwallet.isMnemonicVerified

    wallet.user.uid = uid

    wallet.settings.secondPassword = wallet.my.wallet.isDoubleEncrypted
    # todo: jaume: implement pbkdf2 iterations out of walletstore in mywallet
    wallet.settings.pbkdf2 = wallet.my.wallet.pbkdf2_iterations;
    # todo: jaume: implement logout time in mywallet
    wallet.settings.logoutTimeMinutes = wallet.my.wallet.logoutTime / 60000

    if wallet.my.wallet.isUpgradedToHD and not wallet.status.didInitializeHD
      wallet.status.didInitializeHD = true

    # Get email address, etc
    # console.log "Getting info..."
    wallet.settings_api.get_account_info((result)->
      # console.log result
      $window.name = "blockchain-"  + result.guid
      wallet.settings.ipWhitelist = result.ip_lock || ""
      wallet.settings.restrictToWhitelist = result.ip_lock_on
      wallet.settings.apiAccess = result.is_api_access_enabled
      wallet.settings.rememberTwoFactor = !result.never_save_auth_type
      wallet.settings.needs2FA = result.auth_type != 0
      wallet.settings.twoFactorMethod = result.auth_type
      wallet.settings.loggingLevel = result.logging_level
      wallet.user.email = result.email
      wallet.user.current_ip = result.my_ip
      wallet.status.currentCountryCode = result.country_code
      if result.sms_number
         wallet.user.mobile = {country: result.sms_number.split(" ")[0], number: result.sms_number.split(" ")[1]}
         wallet.user.internationalMobileNumber = bcPhoneNumber.format(result.sms_number)
      else # Field is not present if not entered
        wallet.user.mobile = {country: "+" + result.dial_code, number: ""}
        wallet.user.internationalMobileNumber = "+" + result.dial_code

      wallet.settings.notifications = result.notifications_type && result.notifications_type.length > 0 && result.notifications_type.indexOf(1) > -1 && result.notifications_on > 0

      wallet.user.isEmailVerified = result.email_verified
      wallet.user.isMobileVerified = result.sms_verified
      wallet.user.passwordHint = result.password_hint1 # Field not present if not entered

      wallet.setLanguage($filter("getByProperty")("code", result.language, wallet.languages))

      # Get currencies:
      wallet.settings.currency = ($filter("getByProperty")("code", result.currency, wallet.currencies))
      wallet.settings.btcCurrency = ($filter("getByProperty")("serverCode", result.btc_currency, wallet.btcCurrencies))
      wallet.settings.displayCurrency = wallet.settings.btcCurrency
      wallet.settings.feePerKB = wallet.my.wallet.fee_per_kb
      wallet.settings.blockTOR = !!result.block_tor_ips
      wallet.status.didLoadSettings = true

      # Fetch transactions:
      if wallet.my.wallet.isUpgradedToHD
        didFetchTransactions = () ->
          console.log("%cStop!", "color:white; background:red; font-size: 16pt");
          console.log("%cThis browser feature is intended for developers. If someone told you to copy-paste something here, it is a scam and will give them access to your money!", "font-size: 14pt");

          wallet.status.didLoadBalances = true
          wallet.updateTransactions()

        wallet.my.wallet.getHistory().then(didFetchTransactions)

      wallet.applyIfNeeded()
    )

    if successCallback?
      successCallback()

    wallet.applyIfNeeded()

  wallet.login = (uid, password, two_factor_code, needsTwoFactorCallback, successCallback, errorCallback) ->

    needsTwoFactorCode = (method) ->
      Alerts.displayWarning("Please enter your 2FA code")
      wallet.settings.needs2FA = true
      # 2: Email
      # 3: Yubikey
      # 4: Google Authenticator
      # 5: SMS

      needsTwoFactorCallback()

      wallet.settings.twoFactorMethod = method
      wallet.applyIfNeeded()

    wrongTwoFactorCode = (message) ->
      errorCallback("twoFactor", message)
      wallet.applyIfNeeded()

    loginError = (error) ->
      console.log(error)
      if error.indexOf("Unknown Wallet Identifier") > -1 # Brittle, for lack of a more useful server response
        errorCallback("uid", error)
      else if error.indexOf("password") > -1 # Brittle
         errorCallback("password", error)
      else
        Alerts.displayError(error, true)
        errorCallback()

      wallet.applyIfNeeded()

    if two_factor_code? && two_factor_code != ""
      wallet.settings.needs2FA = true
    else
      two_factor_code = null

    authorizationProvided = () ->
      wallet.goal.auth = true
      wallet.applyIfNeeded()

    authorizationRequired = (callback) ->
      callback(authorizationProvided())
      Alerts.displayWarning("Please check your email to approve this login attempt.", true)
      wallet.applyIfNeeded()

    didLogin = () ->
      wallet.didLogin(uid, successCallback)
      return

    betaCheckFinished = () ->
      $window.root = "https://blockchain.info/"

      wallet.my.login(
        uid,
        null, # sharedKey
        password,
        two_factor_code,
        didLogin,
        needsTwoFactorCode,
        wrongTwoFactorCode,
        authorizationRequired,
        loginError,  # other_error
        () -> return,     # fetch_success
        () -> return,     # decrypt_success
        () -> return      # build_hd_success
      )

      wallet.fetchExchangeRate()
      return

    # If BETA=1 is set in .env then in index.html/jade $rootScope.beta is set.
    # The following checks are not ideal as they can be bypassed with some creative Javascript commands.
    if $rootScope.beta
      # Check if there is an invite code associated with
      $http.post("/check_guid_for_beta_key", {guid: uid}
      ).success((data) ->
        if(data.verified)
          betaCheckFinished()
        else
          if(data.error && data.error.message)
            Alerts.displayError(data.error.message)
          errorCallback()
      ).error () ->
        Alerts.displayError("Unable to verify your wallet UID.")
        errorCallback()

    else
      betaCheckFinished()

  wallet.upgrade = (successCallback, cancelSecondPasswordCallback) ->
    # if success after upgrade
    success = () ->
      wallet.status.didUpgradeToHd = true
      wallet.status.didInitializeHD = true
      wallet.my.wallet.getHistory().then(() ->
        wallet.status.didLoadBalances = true
        wallet.updateTransactions()
      )
      successCallback()
      wallet.applyIfNeeded()
    # if failure saving upgrade
    error = () ->
      wallet.store.enableLogout()
      wallet.store.setIsSynchronizedWithServer(true);
      $window.location.reload()

    proceed = (password) ->
      $translate("FIRST_ACCOUNT_NAME").then (translation) ->
        wallet.my.wallet.newHDWallet(translation, password, success, error)

    wallet.askForSecondPasswordIfNeeded().then(proceed).catch(cancelSecondPasswordCallback)



  wallet.legacyAddresses = () ->
    wallet.my.wallet.keys


  hdAddresses = {}
  wallet.hdAddresses = (accountIdx) ->

    (refresh=false) ->
      if refresh || !hdAddresses[accountIdx]?
        account = wallet.accounts()[accountIdx]

        hdAddresses[accountIdx] = account.receivingAddressesLabels.map((address) ->
          index: address.index
          label: address.label
          address: account.receiveAddressAtIndex(address.index)
          account: account
        )

      hdAddresses[accountIdx]

  wallet.addAddressForAccount = (account, successCallback, errorCallback) ->
    success = () ->
      wallet.hdAddresses(account.index)(true)
      successCallback()
      wallet.applyIfNeeded()

    $translate("DEFAULT_NEW_ADDRESS_LABEL").then (translation) ->
      account.setLabelForReceivingAddress(account.receiveIndex, translation).then(success).catch(errorCallback)

  wallet.resendTwoFactorSms = (uid, successCallback, errorCallback) ->
    success = () ->
      $translate("RESENT_2FA_SMS").then (translation) ->
        Alerts.displaySuccess(translation)

      successCallback()
      wallet.applyIfNeeded()

    error = (e) ->
      $translate("RESENT_2FA_SMS_FAILED").then (translation) ->
        Alerts.displayError(translation)
      errorCallback()
      wallet.applyIfNeeded()

    wallet.my.resendTwoFactorSms(uid, success, error)

  wallet.create = (password, email, currency, language, success_callback) ->
    success = (uid) ->
      Alerts.displaySuccess("Wallet created with identifier: " + uid, true)
      wallet.status.firstTime = true

      loginSuccess = () ->
        success_callback(uid)

      loginError = (error) ->
        console.log(error)
        Alerts.displayError("Unable to login to new wallet")

      # Associate the UID with the beta key:
      if $rootScope.beta
        $http.post("/register_guid", {guid: uid, email: email}
        ).success((data) ->
          if(data.success)
            wallet.login(uid, password, null, null, loginSuccess, loginError)
          else
            if(data.error && data.error.message)
              Alerts.displayError(data.error.message)
        ).error () ->
          Alerts.displayWarning("Unable to associate your new wallet with your invite code. Please try to login using your UID " + uid + " or register again.", true)
      else
        wallet.login(uid, password, null, null, loginSuccess, loginError)

    error = (error) ->
      if error.message != undefined
        Alerts.displayError(error.message)
      else
        Alerts.displayError(error)

    currency_code = "USD"
    language_code = "en"

    if currency?
      currency_code = currency.code

    if language?
      language_code = language.code

    $translate("FIRST_ACCOUNT_NAME").then (translation) ->
      wallet.my.createNewWallet(email, password, translation,language_code, currency_code, success, error)

  wallet.askForSecondPasswordIfNeeded = () ->
    defer = $q.defer()
    if wallet.my.wallet.isDoubleEncrypted
      $rootScope.$broadcast "requireSecondPassword", defer
    else
      defer.resolve(null)
    return defer.promise

  wallet.saveActivity = () ->
    # TYPES: ['transactions', 'security', 'settings', 'accounts']
    $rootScope.$broadcast('updateActivityFeed')
    # console.log "Should save activity"

  addressBook = undefined
  wallet.addressBook = (refresh) ->
    myAddressBook = wallet.my.wallet.addressBook
    if addressBook == undefined || refresh
      addressBook = Object.keys(myAddressBook).map(
        (key) -> { address: key, label: myAddressBook[key] }
      );

    return addressBook

  wallet.removeAddressBookEntry = (address) ->
    wallet.my.wallet.removeAddressBookEntry(address.address)
    wallet.addressBook(true)

  wallet.createAccount = (label, successCallback, errorCallback, cancelCallback) ->
    proceed = (password) ->
      newAccount = wallet.my.wallet.newAccount(label, password)
      wallet.my.wallet.getHistory().then(wallet.updateTransactions)
      successCallback && successCallback()
    wallet.askForSecondPasswordIfNeeded().then(proceed).catch(cancelCallback)

  wallet.renameAccount = (account, name, successCallback, errorCallback) ->
    account.label = name
    successCallback()

  wallet.fetchMoreTransactions = (where, successCallback, errorCallback, allTransactionsLoadedCallback) ->
    success = (res) ->
      wallet.appendTransactions(res)
      successCallback()
      wallet.applyIfNeeded()

    error = () ->
      errorCallback()
      wallet.applyIfNeeded()

    allTransactionsLoaded = () ->
      allTransactionsLoadedCallback() if allTransactionsLoadedCallback?
      wallet.applyIfNeeded()

    if where == ""
      wallet.my.fetchMoreTransactionsForAll(success, error, allTransactionsLoaded)
    else if where == "imported"
      wallet.my.fetchMoreTransactionsForLegacyAddresses(success, error, allTransactionsLoaded)
    else
      wallet.my.fetchMoreTransactionsForAccount(parseInt(where), success, error, allTransactionsLoaded)

  wallet.changeLegacyAddressLabel = (address, label, successCallback, errorCallback) ->
    address.label = label
    successCallback()
    return

  wallet.changeHDAddressLabel = (accountIdx, index, label, successCallback, errorCallback) ->
    success = () ->
      wallet.hdAddresses(accountIdx)(true)
      successCallback()
      wallet.applyIfNeeded()


    error = (msg) ->
      errorCallback(msg)
      wallet.applyIfNeeded()

    account = wallet.accounts()[parseInt(accountIdx)]

    account.setLabelForReceivingAddress(index, label).then(success).catch(error)

    return

  wallet.logout = () ->
    wallet.didLogoutByChoice = true
    $window.name = "blockchain"
    wallet.my.logout(true)
    return

  wallet.makePairingCode = (successCallback, errorCallback) ->
    success = (code) ->
      successCallback(code)
      wallet.applyIfNeeded()

    error = () ->
      errorCallback()
      wallet.applyIfNeeded()

    wallet.my.makePairingCode(success, error)

  wallet.confirmRecoveryPhrase = () ->
    wallet.my.wallet.hdwallet.verifyMnemonic()
    wallet.status.didConfirmRecoveryPhrase = true

  wallet.isCorrectMainPassword = (candidate) ->
    wallet.store.isCorrectMainPassword(candidate)

  wallet.isCorrectSecondPassword = (candidate) ->
    wallet.my.wallet.validateSecondPassword(candidate)

  wallet.changePassword = (newPassword, successCallback, errorCallback) ->
    wallet.store.changePassword(newPassword, (()->
      $translate("CHANGE_PASSWORD_SUCCESS").then (translation) ->
        Alerts.displaySuccess(translation)
        successCallback(translation)
    ),() ->
      $translate("CHANGE_PASSWORD_FAILED").then (translation) ->
        Alerts.displayError(translation)
        errorCallback(translation)
    )

  wallet.setIPWhitelist = (ips, successCallback, errorCallback) ->
    success = () ->
      wallet.settings.ipWhitelist = ips
      successCallback()
      wallet.applyIfNeeded()

    error = () ->
      errorCallback()
      wallet.applyIfNeeded()

    wallet.settings_api.update_IP_lock(ips, success, error)

  wallet.resendEmailConfirmation = (successCallback, errorCallback) ->
    success = () ->
      successCallback()
      wallet.applyIfNeeded()

    error = () ->
      errorCallback()
      wallet.applyIfNeeded()

    wallet.settings_api.resendEmailConfirmation(wallet.user.email, success, error)

  wallet.setPbkdf2Iterations = (n, successCallback, errorCallback, cancelCallback) ->
    proceed = (password) ->
      wallet.my.wallet.changePbkdf2Iterations(parseInt(n), password)
      wallet.settings.pbkdf2 = wallet.my.wallet.pbkdf2_iterations
      successCallback()
      # wallet.applyIfNeeded()
    wallet.askForSecondPasswordIfNeeded().then(proceed).catch(cancelCallback)

  wallet.setLoggingLevel = (level) ->
    wallet.settings_api.updateLoggingLevel(level, () ->
      wallet.settings.loggingLevel = level
      wallet.saveActivity(4)
      wallet.applyIfNeeded()
    , () ->
      Alerts.displayError('Failed to update logging level')
      wallet.applyIfNeeded()
    )

  ####################
  #   Transactions   #
  ####################

  # amount in Satoshi (we must compute the fee using the tx, not the amount and origin)
  wallet.recommendedTransactionFee = (origin, amount) -> wallet.my.getBaseFee()

  #############
  # Spend BTC #
  #############

  # Converts units of fiat to BTC (not Satoshi)
  wallet.fiatToSatoshi = (amount, currency) ->
    return null if currency == "BTC"
    return null unless amount?
    return null unless wallet.conversions[currency]?
    return parseInt(numeral(amount).multiply(wallet.conversions[currency].conversion).format("0"))

  # amount in BTC, returns formatted amount in fiat
  wallet.BTCtoFiat = (amount, currency) ->
    return null if currency == "BTC"
    return null unless amount?
    return null unless wallet.conversions[currency]?
    return numeral(100000000).multiply(amount).divide(wallet.conversions[currency].conversion).format("0.00")

  wallet.isBitCurrency = (currency) ->
    return null unless currency?
    return ['BTC', 'mBTC', 'bits'].indexOf(currency.code) > -1

  wallet.convertCurrency = (amount, currency1, currency2) ->
    return null unless amount?
    return null unless (wallet.conversions[currency1.code]? || wallet.conversions[currency2.code]?)
    if wallet.isBitCurrency(currency1)
      return parseFloat(numeral(currency1.conversion).multiply(amount).divide(wallet.conversions[currency2.code].conversion).format("0.00"))
    else
      return parseFloat(numeral(amount).multiply(wallet.conversions[currency1.code].conversion).divide(currency2.conversion).format("0.00000000"))

  wallet.convertToSatoshi = (amount, currency) ->
    return null unless amount?
    return null unless currency?
    if wallet.isBitCurrency(currency)
      return Math.round(amount * currency.conversion)
    else if wallet.conversions[currency.code]?
      return Math.ceil(amount * wallet.conversions[currency.code].conversion)
    else
      return null

  wallet.convertFromSatoshi = (amount, currency) ->
    return null unless amount?
    return null unless currency?
    if wallet.isBitCurrency(currency)
      return (amount / currency.conversion)
    else if wallet.conversions[currency.code]?
      return (amount / wallet.conversions[currency.code].conversion)
    else
      return null

  # Takes a satoshi amount and converts it to a given currency
  # while formatting it to how it should look when displayed
  wallet.formatCurrencyForView = (amount, currency) ->
    return unless amount && currency && currency.code
    code = currency.code
    amount = amount.toFixed(8) if code == 'BTC'
    amount = amount.toFixed(6) if code == 'mBTC'
    amount = amount.toFixed(4) if code == 'bits'
    amount = amount.toFixed(2) if !wallet.isBitCurrency(currency)
    return parseFloat(amount) + ' ' + code

  wallet.toggleDisplayCurrency = () ->
    if wallet.isBitCurrency(wallet.settings.displayCurrency)
      wallet.settings.displayCurrency = wallet.settings.currency
    else
      wallet.settings.displayCurrency = wallet.settings.btcCurrency

  wallet.getFiatAtTime = (amount, time, currency) ->
    defer = $q.defer()
    # Cache the result since historical rates don't change within one session and we don't want to hammer the server
    key = amount + currency + time

    success = (fiat) ->
      wallet.fiatHistoricalConversionCache[key] = fiat
      defer.resolve(numeral(fiat).format("0.00"))

    error = (reason) ->
      defer.reject(reason)

    if wallet.fiatHistoricalConversionCache[key]
      success(wallet.fiatHistoricalConversionCache[key])
    else
      # The currency argument in the API is case sensitive.
      # Time argument in milliseconds
      wallet.api.getFiatAtTime(time * 1000, amount, currency.toLowerCase()).then(success).catch(error)

    return defer.promise

  wallet.checkAndGetTransactionAmount = (amount, currency, success, error) ->
    amount = wallet.convertToSatoshi(amount, currency)

    if !success? || !error?
      console.error "Success and error callbacks are required"
      return

    return amount

  wallet.addAddressOrPrivateKey = (addressOrPrivateKey, needsBipPassphraseCallback, successCallback, errorCallback, cancel) ->
    success = (address) ->
      successCallback(address)
      wallet.applyIfNeeded()

    proceed = (secondPassword='') ->
      error = (message) ->
        if message == "needsBip38"
          needsBipPassphraseCallback(proceedWithBip38)
        else
          errorCallback(message)

        wallet.applyIfNeeded()

      proceedWithBip38 = (bipPassphrase) ->
        wallet.my.wallet.importLegacyAddress(
          addressOrPrivateKey, "", secondPassword, bipPassphrase
        ).then(success, error)

      proceedWithoutBip38 = () ->
        wallet.my.wallet.importLegacyAddress(
          addressOrPrivateKey, "", secondPassword, ""
        ).then(success, error)

      proceedWithoutBip38()


    wallet.askForSecondPasswordIfNeeded()
      .then proceed, cancel

  wallet.fetchBalanceForRedeemCode = (code) ->
    defer = $q.defer();

    success = (balance) ->
      defer.resolve(balance)

    error = (error) ->
      console.log "Could not retrieve balance"
      console.log error
      defer.reject()

    wallet.my.getBalanceForRedeemCode(code, success, error)

    return defer.promise

  wallet.getAddressBookLabel = (address) ->
    wallet.my.wallet.getAddressBookLabel(address)

  wallet.getMnemonic = (successCallback, errorCallback, cancelCallback) ->

    proceed = (password) ->
      mnemonic = wallet.my.wallet.getMnemonic(password)
      successCallback(mnemonic)

    wallet.askForSecondPasswordIfNeeded()
      .then proceed
      .catch cancelCallback

  wallet.importWithMnemonic = (mnemonic, bip39pass, successCallback, errorCallback, cancelCallback) ->
    cancel  = () ->
      cancelCallback()
    restore = (password) ->
      console.log("restoring...")
      wallet.transactions.splice(0, wallet.transactions.length)
      wallet.my.wallet.restoreHDWallet(mnemonic, bip39pass, password)
    update = () ->
      console.log("updating...")
      wallet.my.wallet.getHistory().then(wallet.updateTransactions)
      successCallback()

    wallet.askForSecondPasswordIfNeeded()
      .then(restore)
      .then(update)
      .catch(cancel)

  wallet.getDefaultAccountIndex = () ->
    return 0 unless wallet.my.wallet?
    if wallet.my.wallet.isUpgradedToHD then wallet.my.wallet.hdwallet.defaultAccountIndex else 0


  wallet.getReceivingAddressForAccount = (idx) ->
    if wallet.my.wallet.isUpgradedToHD then wallet.my.wallet.hdwallet.accounts[idx].receiveAddress else ""

  wallet.getReceivingAddressIndexForAccount = (idx) ->
    if wallet.my.wallet.isUpgradedToHD then wallet.my.wallet.hdwallet.accounts[idx].receiveIndex else null


  ###################
  # URL: bitcoin:// #
  ###################

  wallet.parsePaymentRequest = (url) ->
    result = { address: null, amount: null, label: null, message: null }
    result.isValid = true

    if url.indexOf('bitcoin:') == 0
      withoutPrefix = url.replace('bitcoin://', '').replace('bitcoin:', '')
      qIndex = withoutPrefix.indexOf('?')

      if qIndex != -1
        result.address = withoutPrefix.substr(0, qIndex)
        keys = withoutPrefix.substr(qIndex + 1).split('&')

        keys.forEach (item) ->
          key = item.split('=')[0]
          value = item.split('=')[1]

          if key == 'amount'
            result.amount = wallet.convertToSatoshi(parseFloat(value), wallet.btcCurrencies[0])
          else if result[key] != undefined
            result[key] = value

      else
        result.address = withoutPrefix

    else if wallet.my.isValidAddress(url)
      result.address = url

    else
      result.isValid = false

    return result

  ###################
  #      Other      #
  ###################

  wallet.isSynchronizedWithServer = () ->
    return wallet.store.isSynchronizedWithServer()

  window.onbeforeunload = (event) ->
    if not wallet.isSynchronizedWithServer() and wallet.my.wallet.isEncryptionConsistent
      event.preventDefault()
      # This works in Chrome:
      return "There are unsaved changes. Are you sure?"

  wallet.isValidAddress = (address) ->
    return wallet.my.isValidAddress(address)

  wallet.archive = (address_or_account) ->
    wallet.saveActivity(3)
    address_or_account.archived = true
    address_or_account.active = false

  wallet.unarchive = (address_or_account) ->
    wallet.saveActivity(3)
    address_or_account.archived = false
    address_or_account.active = true

  wallet.deleteLegacyAddress = (address) ->
    wallet.saveActivity(3)
    wallet.my.wallet.deleteLegacyAddress(address)

  ##################################
  #        Private (other)         #
  ##################################

  wallet.accounts = () ->
    if wallet.my.wallet.hdwallet?
      return wallet.my.wallet.hdwallet.accounts
    else
      return []

  wallet.total = (accountIndex) ->
    return unless wallet.my.wallet?
    switch accountIndex
      when ""
        if wallet.my.wallet.isUpgradedToHD then wallet.my.wallet.hdwallet.balanceActiveAccounts + wallet.my.wallet.balanceSpendableActiveLegacy else wallet.my.wallet.balanceSpendableActiveLegacy
      when "imported"
        wallet.my.wallet.balanceSpendableActiveLegacy
      when undefined
        if wallet.my.wallet.isUpgradedToHD then wallet.my.wallet.hdwallet.balanceActiveAccounts + wallet.my.wallet.balanceSpendableActiveLegacy else wallet.my.wallet.balanceSpendableActiveLegacy
      else
        account = wallet.accounts()[parseInt(accountIndex)]
        if account == null then null else account.balance

  wallet.updateTransactions = () ->
    for tx in wallet.store.getAllTransactions().reverse()
      match = false
      for candidate in wallet.transactions
        if candidate.hash == tx.hash
          match = true
          if !candidate.note?
            candidate.note = wallet.my.wallet.getNote(tx.hash) # In case a note was just set
          break

      if !match
        transaction = angular.copy(tx)
        transaction.note = wallet.my.wallet.getNote(transaction.hash)

        wallet.transactions.unshift transaction
    wallet.status.didLoadTransactions = true
    wallet.applyIfNeeded()

  wallet.appendTransactions = (transactions, override) ->
    if not transactions? or not wallet.transactions?
      return
    for tx in transactions
      match = false
      for candidate in wallet.transactions
        if candidate.hash == tx.hash
          if override
            wallet.transactions.splice(wallet.transactions.splice(candidate))
          else
            match = true
          break

      if !match
        transaction = angular.copy(tx)
        transaction.note = wallet.my.wallet.getNote(transaction.hash)
        wallet.transactions.push transaction

  ####################
  # Notification     #
  ####################

  wallet.beep = () ->
    sound = ngAudio.load("beep.wav")
    sound.play()

  wallet.monitor = (event, data) ->
    if event == "on_tx" or event == "on_block"
      before = wallet.transactions.length
      wallet.updateTransactions()
      numberOfTransactions = wallet.transactions.length
      if numberOfTransactions > before
        wallet.beep()
        if wallet.transactions[0].result > 0 && !wallet.transactions[0].intraWallet
          $translate("JUST_RECEIVED_BITCOIN").then (translation) ->
            Alerts.displayReceivedBitcoin(translation)
          wallet.saveActivity(0)
    else if event == "error_restoring_wallet"
      # wallet.applyIfNeeded()
      return
    else if event == "did_set_guid" # Wallet retrieved from server
    else if event == "on_wallet_decrypt_finish" # Non-HD part is decrypted
    else if event == "hd_wallets_does_not_exist"
      wallet.status.didUpgradeToHd = false
      $timeout(()->
        $rootScope.$broadcast "needsUpgradeToHD"
        , 1000
      )
    else if event == "wallet not found" # Only works in the mock atm
      $translate("WALLET_NOT_FOUND").then (translation) ->
        Alerts.displayError(translation)
    else if event == "ticker_updated" || event == "did_set_latest_block"
      wallet.applyIfNeeded()
    else if event == "logging_out"
      if wallet.didLogoutByChoice
        $translate("LOGGED_OUT").then (translation) ->
          $cookieStore.put("alert-success", translation)
      else
        $translate("LOGGED_OUT_AUTOMATICALLY").then (translation) ->
          $cookieStore.put("alert-warning", translation)
          wallet.applyIfNeeded()

      wallet.status.isLoggedIn = false
      while wallet.transactions.length > 0
        wallet.transactions.pop()
      while wallet.paymentRequests.length > 0
        wallet.paymentRequests.pop()
      wallet.user.uid = ""
      wallet.password = ""
      # $state.go("wallet.common.home")
    else if event == "ws_on_close" || event == "ws_on_open"
      # Do nothing
    else if event.type != undefined
      if event.type == "error"
        Alerts.displayError(event.msg)
        # console.log event
        wallet.applyIfNeeded()
      else if event.type == "success"
        Alerts.displaySuccess(event.msg)
        wallet.applyIfNeeded()
      else if event.type == "notice"
        Alerts.displayWarning(event.msg)
        wallet.applyIfNeeded()
      else
        # console.log event
    else
      # console.log event

  wallet.store.addEventListener((event, data) -> wallet.monitor(event, data))

  message = $cookieStore.get("alert-warning")
  if message != undefined && message != null
    Alerts.displayWarning(message, true)
    $cookieStore.remove("alert-warning")

  message = $cookieStore.get("alert-success")
  if message != undefined && message != null
    Alerts.displaySuccess(message)
    $cookieStore.remove("alert-success")

  ##################
  # Notes and tags #
  ##################
  wallet.setNote = (tx, text) ->
    wallet.my.wallet.setNote(tx.hash, text)

  wallet.deleteNote = (tx) ->
    wallet.my.wallet.deleteNote(tx.hash)

  ############
  # Settings #
  ############

  wallet.setLogoutTime = (minutes, success, error) ->
    wallet.store.setLogoutTime(minutes * 60000)
    wallet.settings.logoutTimeMinutes = minutes
    success()

  wallet.getLanguages = () ->
    # Get and sort languages:
    tempLanguages = []

    for code, name of wallet.store.getLanguages()
      language = {code: code, name: name}
      tempLanguages.push language

    tempLanguages = $filter('orderBy')(tempLanguages, "name")

    for language in tempLanguages
      wallet.languages.push language


  wallet.getCurrencies = () ->
    for code, name of wallet.store.getCurrencies()
      currency = {code: code, name: name}
      wallet.currencies.push currency

  wallet.getCurrency = () ->
    wallet.my.getCurrency()

  wallet.setLanguage = (language) ->
    $translate.use(language.code)
    wallet.settings.language = language

  wallet.changeLanguage = (language) ->
    wallet.settings_api.change_language(language.code, (()->))
    wallet.setLanguage(language)

  wallet.changeCurrency = (currency) ->
    wallet.settings_api.change_local_currency(currency.code)
    wallet.settings.currency = currency
    # wallet.fetchExchangeRate()

  wallet.changeBTCCurrency = (btcCurrency) ->
    wallet.settings_api.change_btc_currency(btcCurrency.serverCode)
    wallet.settings.btcCurrency = btcCurrency

  wallet.changeEmail = (email, successCallback, errorCallback) ->
    wallet.settings_api.change_email(email, (()->
      wallet.user.email = email
      wallet.user.isEmailVerified = false
      successCallback()
      wallet.applyIfNeeded()
    ), ()->
      $translate("CHANGE_EMAIL_FAILED").then (translation) ->
        Alerts.displayError(translation)
        wallet.applyIfNeeded()

      errorCallback()
    )

  wallet.enableNotifications = () ->
    success = () ->
      wallet.settings.notifications = true
      wallet.applyIfNeeded()

    error = () ->
      Alerts.displayError("Failed to enable notifications");
      wallet.applyIfNeeded()

    wallet.my.wallet.enableNotifications(success, error)

  wallet.disableNotifications = () ->
    success = () ->
      wallet.settings.notifications = false
      wallet.applyIfNeeded()

    error = () ->
      Alerts.displayError("Failed to disable notifications");
      wallet.applyIfNeeded()

    wallet.my.wallet.disableNotifications(success, error)

  wallet.setFeePerKB = (fee, successCallback, errorCallback) ->
    wallet.my.wallet.fee_per_kb = fee
    wallet.settings.feePerKB = fee
    successCallback()

  wallet.fetchExchangeRate = () ->
      # Exchange rate is loaded asynchronously:
      success = (result) ->
        for code, info of result
          # Converion:
          # result: units of fiat per BTC
          # convert to: units of satoshi per unit of fiat
          wallet.conversions[code] = {symbol: info.symbol, conversion: parseInt(numeral(100000000).divide(numeral(info["last"])).format("1"))}

        wallet.applyIfNeeded()

      fail = (error) ->
        console.log("Failed to load ticker:")
        console.log(error)

      wallet.api.getTicker().then(success).catch(fail)

  wallet.getActivityLogs = (success) ->
    wallet.settings_api.getActivityLogs success, () ->
      console.log "Failed to load activity logs"

  wallet.isEmailVerified = () ->
    wallet.my.isEmailVerified

  wallet.internationalPhoneNumber = (mobile) ->
    return null unless mobile?
    mobile.country + " " + mobile.number.replace(/^0*/, '')

  wallet.changeMobile = (mobile, successCallback, errorCallback) ->

    wallet.settings_api.changeMobileNumber(this.internationalPhoneNumber(mobile), (()->
      wallet.user.mobile = mobile
      wallet.user.isMobileVerified = false
      successCallback()
      wallet.applyIfNeeded()
    ), ()->
      $translate("CHANGE_MOBILE_FAILED").then (translation) ->
        Alerts.displayError(translation)
      errorCallback()
      wallet.applyIfNeeded()
    )

  wallet.verifyMobile = (code, successCallback, errorCallback) ->
    wallet.settings_api.verifyMobile(code, (()->
      wallet.user.isMobileVerified = true
      successCallback()
      wallet.applyIfNeeded()
    ), ()->
      $translate("VERIFY_MOBILE_FAILED").then (translation) ->
        errorCallback(translation)
      wallet.applyIfNeeded()
    )

  wallet.applyIfNeeded = () ->
    if MyWallet.mockShouldReceiveNewTransaction == undefined
      $rootScope.$safeApply()

  wallet.changePasswordHint = (hint, successCallback, errorCallback) ->
    wallet.settings_api.update_password_hint1(hint,(()->
      wallet.user.passwordHint = hint
      successCallback()
      wallet.applyIfNeeded()
    ),(err)->
      errorCallback(err)
      wallet.applyIfNeeded()
    )

  wallet.isMobileVerified = () ->
    wallet.my.isMobileVerified

  wallet.disableSecondFactor = () ->
    wallet.settings_api.unsetTwoFactor(()->
      wallet.settings.needs2FA = false
      wallet.settings.twoFactorMethod = null
      wallet.applyIfNeeded()
    ,()->
      console.log "Failed"
      wallet.applyIfNeeded()
    )

  wallet.setTwoFactorSMS = () ->
    wallet.settings_api.setTwoFactorSMS(()->
      wallet.settings.needs2FA = true
      wallet.settings.twoFactorMethod = 5
      wallet.applyIfNeeded()
    ,()->
      console.log "Failed"
      wallet.applyIfNeeded()
    )

  wallet.setTwoFactorEmail = () ->
    wallet.settings_api.setTwoFactorEmail(()->
      wallet.settings.needs2FA = true
      wallet.settings.twoFactorMethod = 2
      wallet.applyIfNeeded()
    ,()->
      console.log "Failed"
      wallet.applyIfNeeded()
    )

  wallet.setTwoFactorYubiKey = (code, successCallback, errorCallback) ->
    wallet.settings_api.setTwoFactorYubiKey(
      code
      ()->
        wallet.settings.needs2FA = true
        wallet.settings.twoFactorMethod = 1
        successCallback()
        wallet.applyIfNeeded()
      (error)->
        console.log(error)
        errorCallback(error)
        wallet.applyIfNeeded()
    )

  wallet.setTwoFactorGoogleAuthenticator = () ->
    wallet.settings_api.setTwoFactorGoogleAuthenticator((secret)->
      wallet.settings.googleAuthenticatorSecret = secret
      wallet.applyIfNeeded()
    ,()->
      console.log "Failed"
      wallet.applyIfNeeded()
    )

  wallet.confirmTwoFactorGoogleAuthenticator = (code, successCallback, errorCallback) ->
    wallet.settings_api.confirmTwoFactorGoogleAuthenticator(code, ()->
      wallet.settings.needs2FA = true
      wallet.settings.twoFactorMethod = 4
      wallet.settings.googleAuthenticatorSecret = null
      successCallback()
      wallet.applyIfNeeded()
    ,()->
      errorCallback()
      wallet.applyIfNeeded()
    )

  wallet.enableRememberTwoFactor = (successCallback, errorCallback) ->
    success = () ->
      wallet.settings.rememberTwoFactor = true
      successCallback()
      wallet.applyIfNeeded()

    error = () ->
      errorCallback()
      wallet.applyIfNeeded()

    wallet.settings_api.toggleSave2FA(false, success, error)

  wallet.disableRememberTwoFactor = (successCallback, errorCallback) ->
    success = () ->
      wallet.settings.rememberTwoFactor = false
      successCallback()
      wallet.applyIfNeeded()

    error = () ->
      errorCallback()
      wallet.applyIfNeeded()

    wallet.settings_api.toggleSave2FA(true, success, error)

  wallet.handleBitcoinLinks = () ->
    wallet.saveActivity(2)
    $window.navigator.registerProtocolHandler('bitcoin', $window.location.origin + '/#/open/%s', "Blockchain")

  wallet.enableBlockTOR = () ->
    wallet.settings_api.update_tor_ip_block(1, ()->
      wallet.settings.blockTOR = true
      wallet.applyIfNeeded()
    ,()->
      console.log "Failed"
      wallet.applyIfNeeded()
    )

  wallet.disableBlockTOR = () ->
    wallet.settings_api.update_tor_ip_block(0, ()->
      wallet.settings.blockTOR = false
      wallet.applyIfNeeded()
    ,()->
      console.log "Failed"
      wallet.applyIfNeeded()
    )

  wallet.enableRestrictToWhiteListedIPs = () ->
    wallet.settings_api.update_IP_lock_on(true, ()->
      wallet.settings.restrictToWhitelist = true
      wallet.saveActivity(2)
      wallet.applyIfNeeded()
    ,()->
      console.log "Failed"
      wallet.applyIfNeeded()
    )

  wallet.disableRestrictToWhiteListedIPs = () ->
    wallet.settings_api.update_IP_lock_on(false, ()->
      wallet.settings.restrictToWhitelist = false
      wallet.saveActivity(2)
      wallet.applyIfNeeded()
    ,()->
      console.log "Failed"
      wallet.applyIfNeeded()
    )

  wallet.getTotalBalanceForActiveLegacyAddresses = () ->
    return unless wallet.my.wallet?
    return wallet.my.wallet.balanceSpendableActiveLegacy

  wallet.setDefaultAccount = (account) ->
    wallet.my.wallet.hdwallet.defaultAccountIndex = account.index

  wallet.isDefaultAccount = (account) ->
    wallet.my.wallet.hdwallet.defaultAccountIndex == account.index

  wallet.isValidBIP39Mnemonic = (mnemonic) ->
    wallet.my.isValidateBIP39Mnemonic(mnemonic)

  wallet.removeSecondPassword = (successCallback, errorCallback) ->
    success = () ->
      Alerts.displaySuccess("Second password has been removed.")
      wallet.settings.secondPassword = false
      successCallback()
    error = () ->
      Alerts.displayError("Second password cannot be unset. Contact support.")
      errorCallback();
    cancel = errorCallback
    decrypting = () -> console.log("Decrypting...")
    syncing = () -> console.log("Syncing...")
    proceed = (password) -> wallet.my.wallet.decrypt(password, success, error, decrypting, syncing)
    wallet.askForSecondPasswordIfNeeded().then(proceed).catch(cancel)

  wallet.validateSecondPassword = (password) ->
    return wallet.my.wallet.validateSecondPassword(password)

  wallet.setSecondPassword = (password, successCallback) ->
    success = () ->
      Alerts.displaySuccess("Second password set.")
      wallet.settings.secondPassword = true
      successCallback()
    error = () ->
      Alerts.displayError("Second password cannot be set. Contact support.")
    encrypting = () -> console.log("Encrypting...")
    syncing = () -> console.log("Syncing...")
    wallet.my.wallet.encrypt(password, success, error, encrypting, syncing)


  ########################################
  # Testing: only works on mock MyWallet #
  ########################################

  wallet.refresh = () ->
    wallet.my.refresh()
    wallet.updateTransactions()

  wallet.isMock = wallet.my.mockShouldFailToSend != undefined
  wallet.getLanguages()
  wallet.getCurrencies()

  return  wallet
