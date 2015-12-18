describe "SignupCtrl", ->
  scope = undefined
  modalInstance =
    close: ->
    dismiss: ->

  beforeEach angular.mock.module("walletApp")

  beforeEach ->
    angular.mock.inject ($injector, $rootScope, $controller, $compile) ->
      Wallet = $injector.get("Wallet")

      Wallet.login = (uid, pass, code, twoFactor, success, error) -> success()
      Wallet.create = (password, email, currency, language, success) -> success("new_guid")
      Wallet.settings_api =
        change_language: (code, success) -> success()
        change_local_currency: () ->
      Wallet.changeCurrency = () ->


      scope = $rootScope.$new()

      $controller "SignupCtrl",
        $scope: scope,
        $stateParams: {},
        $uibModalInstance: modalInstance

      element = angular.element(
        '<form role="form" name="signupForm" novalidate>' +
          '<input type="email"    name="email"          ng-model="fields.email"         required />' +
          '<input type="password" name="password"       ng-model="fields.password"      min-entropy="25" ng-maxlength="255" required />' +
          '<input type="password" name="confirmation"   ng-model="fields.confirmation"  is-valid="fields.confirmation == fields.password" required />' +
          '<input type="checkbox" name="agreement"      ng-model="fields.acceptedAgreement" required />' +
        '</form>'
      )
      scope.model = { fields: { email: '', password: '', confirmation: '', acceptedAgreement: false } }
      $compile(element)(scope)

      scope.$digest()

      return

    return

  it "should close", inject((Alerts) ->
    spyOn(Alerts, "clear")
    scope.close()
    expect(Alerts.clear).toHaveBeenCalled()
  )

  it "should have initial values", ->
    expect(scope.fields.email).toBeDefined()
    expect(scope.fields.password).toBeDefined()
    expect(scope.fields.confirmation).toBeDefined()
    expect(scope.fields.acceptedAgreement).toBe(false)

  it "should not register when invalid", ->
    spyOn(scope, 'createWallet')
    scope.signupForm.password.$setViewValue('')
    scope.$digest()

    scope.signup()
    expect(scope.createWallet).not.toHaveBeenCalled()

  describe "password", ->

    beforeEach ->
      form = scope.signupForm
      form.email.$setViewValue('a@b.com')
      form.agreement.$setViewValue(true)
      scope.$digest()

    it "should not have an error if password confirmation matches", ->
      scope.signupForm.password.$setViewValue('testing')
      scope.signupForm.confirmation.$setViewValue('testing')
      scope.$digest()
      expect(scope.signupForm.confirmation.$valid).toBe(true)

    it "should have an error if password confirmation does not match", ->
      scope.signupForm.password.$setViewValue('testing')
      scope.signupForm.confirmation.$setViewValue('wrong')
      scope.$digest()
      expect(scope.signupForm.confirmation.$valid).toBe(false)

  describe "agreement", ->

    beforeEach ->
      form = scope.signupForm
      form.email.$setViewValue('a@b.com')
      form.password.$setViewValue('my_password12345')
      form.confirmation.$setViewValue('my_password12345')
      scope.$digest()

    it "should not be signed by default", ->
      expect(scope.fields.acceptedAgreement).toBe(false)

    it "should be signed by the user to register", ->
      expect(scope.signupForm.$valid).toBe(false)
      scope.signupForm.agreement.$setViewValue(true)
      scope.$digest()
      expect(scope.signupForm.$valid).toBe(true)

  describe "signup()", ->

    beforeEach ->
      form = scope.signupForm
      form.email.$setViewValue('a@b.com')
      form.password.$setViewValue('my_password12345')
      form.confirmation.$setViewValue('my_password12345')
      form.agreement.$setViewValue(true)
      scope.$digest()

    it "should call createWallet()", ->
      spyOn(scope, "createWallet")
      scope.signup()
      expect(scope.createWallet).toHaveBeenCalled()

    it "should not call createWallet() if validation failed", ->
      spyOn(scope, "createWallet")

      scope.signupForm.password.$setViewValue('weak')
      scope.$digest()

      scope.signup()
      expect(scope.createWallet).not.toHaveBeenCalled()

    it "should create a new wallet", inject((Wallet) ->
      spyOn(Wallet, 'create')
      scope.createWallet (-> )
      expect(Wallet.create).toHaveBeenCalled()
    )

    it "should add uid to cookies", inject(($cookies) ->
      spyOn($cookies, 'put')
      scope.signup()
      expect($cookies.put).toHaveBeenCalledWith('uid', "new_guid")
    )

    it "should add password to cookies in dev mode", inject(($cookies) ->
      spyOn($cookies, 'put')
      scope.savePassword = true
      scope.fields.password = "testing"

      scope.signup()
      expect($cookies.put).toHaveBeenCalledWith('password', "testing")
    )

    it "should not add password to cookies in production mode", inject(($cookies) ->
      spyOn($cookies, 'put')
      scope.savePassword = false
      scope.fields.password = "testing"

      scope.signup()
      expect($cookies.put).not.toHaveBeenCalledWith('password', "testing")
    )

  describe "language", ->
    it "should guess the correct language", ->
      expect(scope.language_guess.code).toBe("en")

    it "should switch interface language to guessed language", inject(($translate, languages) ->
      spyOn($translate, "use")
      expect(scope.language_guess.code).not.toBe(languages[0].code)
      scope.language_guess = languages[0]
      scope.$digest()
      expect($translate.use).toHaveBeenCalledWith(languages[0].code)
    )

  describe "currency", ->
    it "should guess the correct currency", ->
      expect(scope.currency_guess.code).toBe("USD")

    it "should switch to the guessed currency", inject((currency, Wallet) ->
      spyOn(Wallet, "changeCurrency")
      expect(scope.currency_guess.code).not.toBe(currency.currencies[1].code)
      scope.currency_guess = currency.currencies[1]
      scope.$digest()
      expect(Wallet.changeCurrency).toHaveBeenCalledWith(currency.currencies[1])
    )
