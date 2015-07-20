describe "walletServices", () ->
  Wallet = undefined
  
  mockObserver = undefined  
  errors = undefined
  
  account = undefined
  
  beforeEach angular.mock.module("walletApp")
  
  beforeEach ->
    angular.mock.inject ($injector, localStorageService) ->
      localStorageService.remove("mockWallets")
      
      Wallet = $injector.get("Wallet")
      Wallet.addressBook = {"17gJCBiPBwY5x43DZMH3UJ7btHZs6oPAGq" : "John"}
      Wallet.legacyAddresses = [{label: "Old Label"}]
      
      account = {
        setLabelForReceivingAddress: () ->
      }
      
      Wallet.my.wallet = 
        hdwallet:
          accounts:
            [
              account
            ]
                
      spyOn(Wallet,"monitor").and.callThrough()
      
      mockObserver = {needs2FA: (() ->)}
            
      return

    return
  describe "addressBook()", ->          
    it "should find John", inject((Wallet) ->      
      expect(Wallet.addressBook["17gJCBiPBwY5x43DZMH3UJ7btHZs6oPAGq"]).toBe("John")
      return
    )
    
    return

  describe "address label", ->
    it "can be set for a legacy address", ->
      pending()
      address = Wallet.legacyAddresses()[0]
      spyOn(Wallet.store, "setLegacyAddressLabel")
      Wallet.changeAddressLabel(address, "New Label", (()->))
      expect(Wallet.store.setLegacyAddressLabel).toHaveBeenCalled()
    
    it "can be set for an HD address", ->
      spyOn(account, "setLabelForReceivingAddress")
      Wallet.changeHDAddressLabel(account, 0, "New Label", (()->))
      expect(account.setLabelForReceivingAddress).toHaveBeenCalled()     
       
    it "each account should have at least one address without a label", ->
      pending()
          