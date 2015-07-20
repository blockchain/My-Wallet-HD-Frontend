describe "securityCenterServices", () ->
  Wallet = undefined
  SecurityCenter = undefined
  rootScope = undefined

  beforeEach angular.mock.module("walletApp")

  beforeEach ->
    angular.mock.inject ($injector, localStorageService, _$rootScope_) ->
      localStorageService.remove("mockWallets")

      Wallet = $injector.get("Wallet")
      SecurityCenter = $injector.get("SecurityCenter")
      rootScope = _$rootScope_

      spyOn(Wallet,"monitor").and.callThrough()

      Wallet.user.isEmailVerified = false
      Wallet.status.didConfirmRecoveryPhrase = false
      Wallet.user.passwordHint = ''
      Wallet.settings.needs2FA = false
      Wallet.user.isMobileVerified = 0
      Wallet.settings.blockTOR = false

      rootScope.$digest()

      return

    return

  describe "level", ->

    it "should start at 0", ->
      expect(SecurityCenter.security.level).toBe(0)

    it "should increase if email has been verified", ->
      Wallet.user.isEmailVerified = true
      rootScope.$digest()
      expect(SecurityCenter.security.level).toBe(1)

    it "should increase if recovery phrase has been confirmed", ->
      Wallet.status.didConfirmRecoveryPhrase = true
      rootScope.$digest()
      expect(SecurityCenter.security.level).toBe(1)

    it "should increase if user has a password hint", ->
      Wallet.user.passwordHint = 'Password hint'
      rootScope.$digest()
      expect(SecurityCenter.security.level).toBe(1)

    it "should increase if 2FA is set", ->
      Wallet.settings.needs2FA = true
      rootScope.$digest()
      expect(SecurityCenter.security.level).toBe(1)

    it "should increase if mobile has been verified", ->
      Wallet.user.isMobileVerified = 1
      rootScope.$digest()
      expect(SecurityCenter.security.level).toBe(1)

    it "should increase if user has blocked Tor", ->
      Wallet.settings.blockTOR = true
      rootScope.$digest()
      expect(SecurityCenter.security.level).toBe(1)

    it "should be at 6 if all security objectives are complete", ->
      Wallet.user.isEmailVerified = true
      Wallet.status.didConfirmRecoveryPhrase = true
      Wallet.user.passwordHint = 'Password hint'
      Wallet.settings.needs2FA = true
      Wallet.user.isMobileVerified = 1
      Wallet.settings.blockTOR = true
      rootScope.$digest()
      expect(SecurityCenter.security.level).toBe(6)
