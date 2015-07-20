describe "SendCtrl", ->

  scope = undefined
  ngAudio = undefined
  Wallet = undefined

  modalInstance =
    close: ->
    dismiss: ->

  hasErr = (input, err) ->
    scope.sendForm[input].$error[err]

  beforeEach angular.mock.module("walletApp")

  beforeEach ->
    angular.mock.inject ($injector, $rootScope, $controller, $compile) ->
      MyWallet = $injector.get("MyWallet")
      Wallet = $injector.get("Wallet")

      MyWallet.wallet =
        setNote: (-> )
        keys: [
          { address: 'some_address', archived: false, isWatchOnly: false, label: 'some_label' }
          { address: 'watch_address', archived: false, isWatchOnly: true }
          { address: 'other_address', archived: true, isWatchOnly: false }
        ]
        hdwallet:
          defaultAccountIndex: 0
          accounts: [
            { label: "Checking", index: 0, archived: false, balance: 1 }
            { label: "Savings", index: 1, archived: false, balance: 1 }
            { label: "Something", index: 2, archived: true }
          ]

      MyWallet.isValidAddress = (address) ->
        address == 'valid_address'

      Wallet.status =
        isLoggedIn: true
        didLoadBalances: true

      Wallet.settings =
        currency: Wallet.currencies[0]
        btcCurrency: Wallet.btcCurrencies[0]

      Wallet.transaction = (success, error) ->
          send: (from, dests, amts, fee, note) ->
            Wallet.send(from, dests, amts, fee, note)
            success()

      Wallet.send = (-> )

      Wallet.updateAccounts()

      scope = $rootScope.$new()

      $controller "SendCtrl",
        $scope: scope,
        $stateParams: {},
        $modalInstance: modalInstance
        paymentRequest: {address: "", amount: ""}

      element = angular.element(
        '<form role="form" name="sendForm" novalidate>' +
        '<input type="text" name="from" ng-model="transaction.from" required />' +
        '<input type="text" name="destinations0" ng-model="transaction.destinations[0]" required />' +
        '<input type="number" name="amounts0" ng-model="transaction.amounts[0]" ng-change="validateAmounts()" min="1" required />' +
        '<input type="text" name="destinations1" ng-model="transaction.destinations[1]" required />' +
        '<input type="number" name="amounts1" ng-model="transaction.amounts[1]" ng-change="validateAmounts()" min="1" required />' +
        '<input type="number" name="fee" ng-model="transaction.fee" ng-change="validateAmounts()" min="0" required />' +
        '<textarea rows="4" name="note" ng-model="transaction.note" ng-maxlength="512"></textarea>' +
        '</form>'
      )

      $compile(element)(scope)
      scope.$apply()

      scope.qrStream = {}
      scope.qrStream.stop = (-> )

      return

    return

  it "should be able to close", ->
    spyOn(modalInstance, 'dismiss')
    scope.close()
    expect(modalInstance.dismiss).toHaveBeenCalled()

  describe "initialization", ->

    it "should load legacyAddresses", ->
      expect(scope.legacyAddresses().length).toBeGreaterThan(0)

    it "should load accounts", ->
      expect(scope.accounts.length).toBeGreaterThan(0)

    it "should load addressBook", ->
      # TODO: Make the address book work, then wite tests
      pending()

    it "should load wallet status", ->
      expect(scope.status).toBeDefined()

    it "should load wallet settings", ->
      expect(scope.settings).toBeDefined()

    it "should load wallet alerts", ->
      expect(scope.alerts).toEqual(Wallet.alerts)

    it "should know the users fiat currency", ->
      expect(scope.fiatCurrency.code).toEqual('USD')

    it "should know the users btc currency", ->
      expect(scope.btcCurrency.code).toEqual('BTC')

    it "should know that the camera is not on", ->
      expect(scope.cameraIsOn).toBe(false)

    it "should not be sending", ->
      expect(scope.sending).toBe(false)

    it "should initially assume amount to be valid", ->
      expect(scope.amountIsValid).toBe(true)

    it "should not start on the confirmation step", ->
      expect(scope.confirmationStep).toBeFalsy()

    it "should not start in advanced send mode", ->
      expect(scope.advanced).toBeFalsy()

  describe "transaction template", ->

    it "should have a null from field", ->
      expect(scope.transactionTemplate.from).toBeNull()

    it "should have a single, null destination field", ->
      expect(scope.transactionTemplate.destinations.length).toEqual(1)
      expect(scope.transactionTemplate.destinations[0]).toBeNull()

    it "should have a single, null amount field", ->
      expect(scope.transactionTemplate.amounts.length).toEqual(1)
      expect(scope.transactionTemplate.amounts[0]).toBeNull()

    it "should have a fee set to 10,000", ->
      expect(scope.transactionTemplate.fee).toEqual(10000)

    it "should have an empty note field", ->
      expect(scope.transactionTemplate.note).toEqual('')

    it "should have the public note option set to false", ->
      expect(scope.transactionTemplate.publicNote).toBeFalsy()

  describe "origins", ->

    it "should load", ->
      expect(scope.originsLoaded).toBe(true)
      expect(scope.origins.length).toBeGreaterThan(0)

    it "should contain accounts", ->
      accounts = scope.origins.filter (origin) -> origin.index?
      expect(accounts.length).toBe(2)

    it "should contain addresses", ->
      addresses = scope.origins.filter (origin) -> origin.isWatchOnly?
      expect(addresses.length).toBe(1)

    it "should not cointain archived accounts or addresses", ->
      hasArchived = scope.origins.some (origin) -> origin.archived
      expect(hasArchived).toBe(false)

    it "should not contain watch-only addresses", ->
      hasWatchOnly = scope.origins.some (origin) -> origin.isWatchOnly
      expect(hasWatchOnly).toBe(false)

  describe "scope destinations", ->

    it "should load", ->
      expect(scope.destinations.length).toBeGreaterThan(0)

    it "should include accounts",  ->
      hasAccount = scope.destinations.some (dest) -> dest.index?
      expect(hasAccount).toBe(true)

    it "should include addresses",  ->
      hasAddress = scope.destinations.some (dest) -> dest.address?
      expect(hasAddress).toBe(true)

    it "should include watch-only addresses",  ->
      hasWatchOnly = scope.destinations.some (dest) -> dest.isWatchOnly
      expect(hasWatchOnly).toBe(true)

    it "should not include archived accounts", ->
      hasArchived = scope.destinations.some (dest) -> dest.archived
      expect(hasArchived).toBe(false)

  describe "payment request", ->

    beforeEach ->
      scope.paymentRequest = { address: 'request_address', amount: 1738, message: 'hi' }

    it "should be called when the modal opens", ->
      # TODO: Don't know how to test this one
      pending()
      expect(scope.applyPaymentRequest).toHaveBeenCalled()

    it "should set the destination", ->
      scope.applyPaymentRequest(scope.paymentRequest, 0)
      expect(scope.transaction.destinations[0].address).toEqual('request_address')
      expect(scope.transaction.destinations[0].type).toEqual('External')

    it "should set the amount", ->
      scope.applyPaymentRequest(scope.paymentRequest, 0)
      expect(scope.transaction.amounts[0]).toEqual(1738)

    it "should set the note from the message", ->
      scope.applyPaymentRequest(scope.paymentRequest, 0)
      expect(scope.transaction.note).toEqual('hi')

    it "should validate the amount", ->
      spyOn(scope, 'validateAmounts')
      scope.applyPaymentRequest(scope.paymentRequest, 0)
      expect(scope.validateAmounts).toHaveBeenCalled()

    it "should update the to label", ->
      spyOn(scope, 'updateToLabel')
      scope.applyPaymentRequest(scope.paymentRequest, 0)
      expect(scope.updateToLabel).toHaveBeenCalled()

  describe "from", ->

    it "should be invalid if null", ->
      scope.transaction.from = null
      scope.$apply()
      expect(hasErr 'from', 'required').toBe(true)

  describe "destinations", ->

    beforeEach ->
      scope.transaction.from = { label: 'Spending' }
      scope.transaction.destinations = [null, null]

    it "should be invalid if null", ->
      # check first destination
      expect(scope.transaction.destinations[0]).toBeNull()
      expect(hasErr 'destinations0', 'required').toBe(true)

      #check second destination
      expect(scope.transaction.destinations[1]).toBeNull()
      expect(hasErr 'destinations1', 'required').toBe(true)

    it "should check that the destination has a valid address", ->
      # check for invalid first
      scope.transaction.destinations[0] = { address: 'invalid_address' }
      scope.$apply()
      expect(hasErr 'destinations0', 'isValidAddress').toBe(true)

      # check for valid address
      scope.transaction.destinations[0] = { address: 'valid_address' }
      scope.$apply()
      expect(hasErr 'destinations0', 'isValidAddress').not.toBeDefined()

  describe "amounts", ->

    beforeEach ->
      scope.transaction.amounts = [100, 5000]
      scope.$apply()

    it "should be valid", ->
      expect(scope.sendForm.amounts0.$valid).toBe(true)
      expect(scope.sendForm.amounts1.$valid).toBe(true)

    it "should be invalid if null", ->
      scope.transaction.amounts = [null, null]
      scope.$apply()
      expect(hasErr 'amounts0', 'required').toBe(true)
      expect(hasErr 'amounts1', 'required').toBe(true)

    it "should be invalid if amounts are not numbers", ->
      # TODO: $apply throws an error bc 'asdf' is NaN. Not sure how to test...
      pending()
      scope.transaction.amounts = ['asdf', 'probably_not_a_number']
      scope.$apply()
      expect(hasErr 'amounts0', 'number').toBe(true)
      expect(hasErr 'amounts1', 'number').toBe(true)

    it "should be invalid if it is less than 1 satoshi", ->
      scope.transaction.amounts = [-17, 0.3]
      scope.$apply()
      expect(hasErr 'amounts0', 'min').toBe(true)
      expect(hasErr 'amounts1', 'min').toBe(true)

  describe "miners fee", ->

    it "should be valid", ->
      expect(scope.transaction.fee).toEqual(10000)
      expect(scope.sendForm.fee.$valid).toBe(true)

    it "should be invalid if null", ->
      scope.transaction.fee = null
      scope.$apply()
      expect(hasErr 'fee', 'required').toBe(true)

    it "should be invalid if blank", ->
      scope.transaction.fee = ''
      scope.$apply()
      expect(hasErr 'fee', 'required').toBe(true)

    it "should be invalid if it is less than 0 satoshi", ->
      scope.transaction.fee = -23.1738
      scope.$apply()
      expect(hasErr 'fee', 'min').toBe(true)

    it "should be invalid if it is not a number", ->
      # TODO: $apply throws a NaN err (yet again). Still not sure how to test...
      pending()
      scope.transaction.fee = 'nah_tho'
      scope.$apply()
      expect(hasErr 'fee', 'number').toBe(true)

  describe "note", ->

    it "should not be valid after 512 characters", ->
      scope.transaction.note = (new Array(513 + 1)).join('x')
      scope.$apply()
      expect(hasErr 'note', 'maxlength').toBe(true)

  describe "send", ->

    beforeEach ->
      scope.transaction =
        from: scope.accounts[0]
        destinations: scope.legacyAddresses()
        amounts: [100, 200, 300]
        fee: 50
        note: 'this_is_a_note'

    it "should receive the correct callbacks", inject((Wallet) ->
      spyOn(Wallet, 'transaction').and.returnValue { send: (-> ) }
      scope.send()
      expect(Wallet.transaction).toHaveBeenCalledWith(
        jasmine.any(Function), jasmine.any(Function)
      )
    )

    it "should receive the correct arguments", inject((Wallet) ->
      spyOn(Wallet, 'send')
      scope.send()
      expect(Wallet.send).toHaveBeenCalledWith(
        scope.accounts[0], scope.legacyAddresses(),
        [100, 200, 300], 50, undefined
      )
    )

  describe "after send", ->

    beforeEach ->
      scope.transaction.from = scope.accounts[1]
      scope.transaction.destinations[0] = scope.accounts[0]
      scope.transaction.amounts[0] = 420
      scope.transaction.fee = 10

    it "should return sending to false", ->
      scope.send()
      expect(scope.sending).toBe(false)

    it "should close the modal when process succeeds", ->
      spyOn(modalInstance, "close")
      scope.send()
      expect(modalInstance.close).toHaveBeenCalled()

    it "should display an error when process fails", inject((Wallet) ->
      spyOn(Wallet, 'displayError').and.callThrough()
      spyOn(Wallet, 'transaction').and.callFake (success, error) ->
        error('err_message')
        { send: (-> ) }
      expect(scope.alerts.length).toEqual(0)
      scope.send()
      expect(scope.alerts.length).toEqual(1)
      expect(Wallet.displayError).toHaveBeenCalledWith('err_message')
    )

    it "should play \"The Beep\"", inject((Wallet) ->
      spyOn(Wallet, 'beep')
      scope.send()
      expect(Wallet.beep).toHaveBeenCalled()
    )

    it "should clear alerts", inject((Wallet) ->
        spyOn(Wallet, 'clearAlerts')
        scope.send()
        expect(Wallet.clearAlerts).toHaveBeenCalled()
    )

    it "should show a confirmation modal", inject(($modal)->
      spyOn($modal, "open").and.callThrough()
      scope.send()
      expect($modal.open).toHaveBeenCalled()
      expect($modal.open.calls.argsFor(0)[0].windowClass).toEqual("notification-modal")
    )

    it "should show account transactions", inject(($state) ->
      spyOn($state, 'go')
      scope.send()
      expect($state.go).toHaveBeenCalledWith('wallet.common.transactions', { accountIndex: 1 })
    )

    it "should show imported address transactions", inject(($state) ->
      spyOn($state, 'go')
      scope.transaction.from = scope.legacyAddresses()[0]
      scope.send()
      expect($state.go).toHaveBeenCalledWith('wallet.common.transactions', { accountIndex: 'imported' })
    )

    it "should set a note if there is one", inject((Wallet, MyWallet) ->
      spyOn(Wallet, 'setNote').and.callThrough()
      spyOn(MyWallet.wallet, 'setNote')
      scope.transaction.note = 'this_is_a_note'
      scope.send()
      expect(Wallet.setNote).toHaveBeenCalledWith({ hash: undefined }, 'this_is_a_note')
      expect(MyWallet.wallet.setNote).toHaveBeenCalledWith(undefined, 'this_is_a_note')
    )

    it "should not set a note if there is not one", inject((Wallet) ->
      spyOn(Wallet, 'setNote')
      scope.send()
      expect(Wallet.setNote).not.toHaveBeenCalled()
    )

    it "should set a public note if there is one", inject((Wallet) ->
      t = scope.transaction
      spyOn(Wallet, 'send')
      t.note = 'this_is_a_note'
      t.publicNote = true
      scope.send()
      expect(Wallet.send).toHaveBeenCalledWith(t.from, t.destinations, t.amounts, t.fee, 'this_is_a_note')
    )

    it "should not set a public note if there is not one", inject((Wallet) ->
      t = scope.transaction
      spyOn(Wallet, 'send')
      t.note = 'this_is_a_note'
      scope.send()
      expect(Wallet.send).toHaveBeenCalledWith(t.from, t.destinations, t.amounts, t.fee, undefined)
    )

  describe "resetSendForm", ->

    beforeEach ->
      scope.transaction.from = scope.legacyAddresses()[1]
      scope.transaction.destinations = [scope.accounts[1]]
      scope.transaction.amounts = [1111]
      scope.transaction.fee = 9000

    it "should set transaction to equal the template", ->
      scope.resetSendForm()
      expect(scope.transaction.destinations).toEqual([null])
      expect(scope.transaction.amounts).toEqual([null])
      expect(scope.transaction.fee).toEqual(10000)

    it "should set transaction from field to default account", ->
      scope.resetSendForm()
      expect(scope.transaction.from).toEqual(scope.accounts[0])

  describe "numberOfActiveAccountsAndLegacyAddresses", ->

    it "should return the correct amount", ->
      amount = scope.numberOfActiveAccountsAndLegacyAddresses()
      expect(amount).toEqual(4)

  describe "hasZeroBalance", ->

    it "should determine if balance is zero", ->
      expect(scope.hasZeroBalance({balance: 0})).toBe(true)

  describe "processURLfromQR", ->

    it "should process a succesfully scanned QR code", inject((Wallet) ->
      scope.qrIndex = 0
      scope.processURLfromQR("bitcoin://abcdefgh?amount=0.001")
      expect(scope.transaction.amounts[0]).toBe(100000)
      expect(scope.transaction.destinations[0].address).toBe("abcdefgh")
    )

    it "should warn user if QR code is not recognized", inject((Wallet) ->
      expect(scope.alerts.length).toBe(0)
      scope.processURLfromQR("http://www.google.com")
      expect(scope.alerts.length).toBe(1)
    )

  describe "decimal places", ->

    it "should return the correct number for fiat currency", ->
      expect(scope.allowedDecimals(Wallet.currencies[0])).toEqual(2)

    it "should return the correct number for BTC", ->
      expect(scope.allowedDecimals(Wallet.btcCurrencies[0])).toEqual(8)

    it "should return the correct number for mBTC", ->
      expect(scope.allowedDecimals(Wallet.btcCurrencies[1])).toEqual(6)

    it "should return the correct number for bits", ->
      expect(scope.allowedDecimals(Wallet.btcCurrencies[2])).toEqual(4)

    it "should read number of decimal places correctly", ->
      expect(scope.decimalPlaces(1)).toEqual(0)
      expect(scope.decimalPlaces(1.11)).toEqual(2)
      expect(scope.decimalPlaces(1.11111)).toEqual(5)

  describe "updateToLabel", ->

    it "should return if the destinations have not been loaded", ->
      scope.transaction.destinations[0] = null
      scope.updateToLabel()
      expect(scope.toLabel).toBeUndefined()

    it "should set the label to an address", ->
      scope.transaction.destinations[0] = scope.legacyAddresses()[0]
      scope.updateToLabel()
      expect(scope.toLabel).toEqual('some_label')

    it "should set the label to an account", ->
      scope.transaction.destinations[0] = scope.accounts[0]
      scope.updateToLabel()
      expect(scope.toLabel).toEqual('Checking Account')

    it "should set the label when advanced", ->
      scope.advanced = true
      scope.transaction.destinations = scope.legacyAddresses()
      scope.updateToLabel()
      expect(scope.toLabel).toEqual('3 Recipients')

  describe "refreshDestinations", ->

    # TODO: Not entirely sure what needs to be tested here

    it "should not refresh if there are no destinations", ->
      spyOn(scope, 'updateToLabel')
      scope.destinations = []
      scope.refreshDestinations('', 0)
      expect(scope.updateToLabel).not.toHaveBeenCalled()

  describe "getTransactionTotal", ->

    beforeEach ->
      scope.transaction.amounts = [100, 250, 350]
      scope.transaction.fee = 50

    it "should add up the transaction without fee", ->
      total = scope.getTransactionTotal()
      expect(total).toEqual(700)

    it "should add up the transaction with fee", ->
      total = scope.getTransactionTotal(true)
      expect(total).toEqual(750)

  describe "validateAmounts", ->

    beforeEach ->
      scope.amountIsValid = false
      scope.transaction.from = { balance: 100 }
      scope.transaction.amounts = [30, 40]
      scope.transaction.fee = 20

    afterEach ->
      return if scope.amountIsValid
      scope.validateAmounts()
      expect(scope.amountIsValid).toBe(false)

    it "should validate the amounts if possible", ->
      scope.validateAmounts()
      expect(scope.amountIsValid).toBe(true)

    it "should not validate if the balance is too small", ->
      scope.transaction.from.balance = 25

    it "should not validate if one amount is too large", ->
      scope.transaction.amounts[1] = 60

    it "should not validate if the fee is too large", ->
      scope.transaction.fee = 100

  describe "checkForSameDestination", ->

    beforeEach ->
      scope.transaction.destinations = [scope.accounts[0], scope.accounts[1]]

    it "should recognize when all destinations are valid", ->
      scope.transaction.from = scope.legacyAddresses()[0]
      scope.checkForSameDestination()
      expect(hasErr 'destinations0', 'isNotEqual').toBeUndefined()
      expect(hasErr 'destinations1', 'isNotEqual').toBeUndefined()

    it "should recognize when two destinations match", ->
      scope.transaction.from = scope.accounts[1]
      scope.checkForSameDestination()
      expect(hasErr 'destinations0', 'isNotEqual').toBeUndefined()
      expect(hasErr 'destinations1', 'isNotEqual').toBe(true)

  describe "modal navigation", ->

    it "should be able to go to confirmation step", ->
      expect(scope.confirmationStep).toBeFalsy()
      scope.goToConfirmation()
      expect(scope.confirmationStep).toBeTruthy()

    it "should be able to go back from confirmation step", ->
      scope.confirmationStep = true
      scope.backToForm()
      expect(scope.confirmationStep).toBeFalsy()

    it "should be able to switch to advanced send", ->
      expect(scope.advanced).toBeFalsy()
      scope.advancedSend()
      expect(scope.advanced).toBeTruthy()

    it "should be able to switch back to regular send", ->
      scope.advanced = true
      scope.regularSend()
      expect(scope.advanced).toBeFalsy()

    it "should trim destinations when switching back to regular", ->
      scope.transaction.destinations = [null, null]
      scope.regularSend()
      expect(scope.transaction.destinations.length).toEqual(1)

    it "should trim amounts when switching back to regular", ->
      scope.transaction.amounts = [null, null]
      scope.regularSend()
      expect(scope.transaction.amounts.length).toEqual(1)

    beforeEach ->
      scope.transaction.destinations = [null, null]
      scope.transaction.amounts = [0.5, 1.2]

    it "should be able to add a destination", ->
      scope.addDestination()
      expect(scope.transaction.destinations.length).toBe(3)
      expect(scope.transaction.amounts.length).toBe(3)

    it "should be able to remove a destination", ->
      scope.removeDestination(0)
      expect(scope.transaction.destinations.length).toBe(1)
      expect(scope.transaction.amounts.length).toBe(1)

  describe "camera", ->

    it "should turn on", ->
      spyOn(scope, '$broadcast')
      scope.cameraOn(1)
      expect(scope.$broadcast).toHaveBeenCalledWith('ResetSearch1')
      expect(scope.cameraRequested).toBe(true)
      expect(scope.qrIndex).toEqual(1)

    it "should turn off", ->
      scope.cameraIsOn = true
      scope.cameraRequested = true
      scope.qrIndex = 1
      scope.cameraOff()
      expect(scope.cameraIsOn).toBe(false)
      expect(scope.cameraRequested).toBe(false)
      expect(scope.qrIndex).toBeNull()

  describe "getFilter", ->

    it "should always set the filter label to the search string", ->
      expect(scope.getFilter('search_1').label).toEqual('search_1')
      expect(scope.getFilter('search_2', false).label).toEqual('search_2')

    it "should return type '!External' when accounts=true", ->
      expect(scope.getFilter('').type).toEqual('!External')

    it "should return type 'Imported' when accounts=false", ->
      expect(scope.getFilter('', false).type).toEqual('Imported')
