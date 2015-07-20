describe "ChangePasswordCtrl", ->
  scope = undefined
  Wallet = undefined

  strongPassword = 't3stp@ssw0rd'

  modalInstance =
    close: ->
    dismiss: ->

  beforeEach angular.mock.module("walletApp")

  beforeEach ->
    angular.mock.inject ($injector, $rootScope, $controller, $compile) ->
      Wallet = $injector.get("Wallet")
      
      Wallet.user = {uid: "12345678-1234-1234-1234-1234567890ab"}
      
      spyOn(Wallet, "isCorrectMainPassword").and.callFake((pwd) ->
        return pwd != "wrong"
      )

      scope = $rootScope.$new()

      $controller "ChangePasswordCtrl",
        $scope: scope,
        $stateParams: {},
        $modalInstance: modalInstance

      element = angular.element(
        '<form role="form" name="passwordForm" novalidate>' +
        '<input type="password" name="currentPassword"    ng-model="fields.currentPassword"   is-valid="isCorrectMainPassword(fields.currentPassword)"      required />' +
        '<input type="password" name="password"           ng-model="fields.password"          is-valid="fields.password != uid"                             min-entropy="25" ng-maxlength="255" required />' +
        '<input type="password" name="confirmation"       ng-model="fields.confirmation"      is-valid="fields.confirmation == fields.password"             required />' +
        '</form>'
      )
      scope.model = { fields: {} }
      $compile(element)(scope)

      scope.$digest()

      return

    return

  it "should be able to close", inject((Wallet) ->
    spyOn(Wallet, "clearAlerts")
    scope.close()
    expect(Wallet.clearAlerts).toHaveBeenCalled()
  )

  it "should get model values from the form", (() ->
    scope.passwordForm.currentPassword.$setViewValue('test')
    expect(scope.fields.currentPassword).toBe('test')

    scope.passwordForm.password.$setViewValue(strongPassword)
    expect(scope.fields.password).toBe(strongPassword)

    scope.passwordForm.confirmation.$setViewValue(strongPassword)
    expect(scope.fields.confirmation).toBe(strongPassword)
  )

  describe "change", ->

    it "should be able to change password", inject((Wallet) ->
      spyOn(Wallet, "changePassword")
      scope.passwordForm.currentPassword.$setViewValue('test')
      scope.passwordForm.password.$setViewValue(strongPassword)
      scope.passwordForm.confirmation.$setViewValue(strongPassword)
      scope.changePassword()
      expect(Wallet.changePassword).toHaveBeenCalled()
    )

    it "should not be able to change password if form is invalid", inject((Wallet) ->
      spyOn(Wallet, "changePassword")
      expect(scope.passwordForm.$invalid).toBe(true)
      scope.changePassword()
      expect(Wallet.changePassword).not.toHaveBeenCalled()
    )

  describe "validate", ->

    it "should not be valid if all fields are empty", ->
      expect(scope.passwordForm.$invalid).toBe(true)
      expect(scope.passwordForm.$valid).toBe(false)

    it "should be valid if all fields are valid", ->
      scope.passwordForm.currentPassword.$setViewValue('test')
      scope.passwordForm.password.$setViewValue(strongPassword)
      scope.passwordForm.confirmation.$setViewValue(strongPassword)
      expect(scope.passwordForm.$invalid).toBe(false)
      expect(scope.passwordForm.$valid).toBe(true)

    describe "currentPassword", ->

      it "should fail if currentPassword is wrong", ->
        scope.passwordForm.currentPassword.$setViewValue('wrong')
        expect(scope.passwordForm.currentPassword.$error.isValid).toBe(true)

      it "should pass if currentPassword is correct", ->
        scope.passwordForm.currentPassword.$setViewValue('test')
        expect(scope.passwordForm.currentPassword.$error.isValid).not.toBe(true)

    describe "password", ->

      it "should display an error if the new password is too weak", ->
        scope.passwordForm.password.$setViewValue('weak')
        expect(scope.passwordForm.password.$error.minEntropy).toBe(true)

      it "should display an error if the new password is too long", ->
        scope.passwordForm.password.$setViewValue(new Array(257).join('x'))
        expect(scope.passwordForm.password.$error.maxlength).toBe(true)

      it "should display an error if the new password is the users guid", ->
        scope.passwordForm.password.$setViewValue("12345678-1234-1234-1234-1234567890ab")
        expect(scope.passwordForm.password.$error.isValid).toBe(true)

      it "should be valid if all requirements are met", ->
        scope.passwordForm.password.$setViewValue(strongPassword)
        expect(scope.passwordForm.password.$valid).toBe(true)
        expect(scope.passwordForm.password.$invalid).toBe(false)

    describe "confirmation", ->

      it "should not display an error if password confirmation matches", ->
        scope.passwordForm.password.$setViewValue('testing')
        scope.passwordForm.confirmation.$setViewValue('testing')
        expect(scope.passwordForm.confirmation.$error.isValid).not.toBe(true)

      it "should display an error if password confirmation does not match", ->
        scope.passwordForm.password.$setViewValue('testing')
        scope.passwordForm.confirmation.$setViewValue('different')
        expect(scope.passwordForm.confirmation.$error.isValid).toBe(true)
