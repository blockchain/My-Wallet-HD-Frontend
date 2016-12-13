describe "Blocket loading directive", ->
  $compile = undefined
  $rootScope = undefined
  element = undefined
  isoScope = undefined

  beforeEach module('walletDirectives');
  beforeEach module("walletApp")

  beforeEach inject((_$compile_, _$rootScope_, Wallet) ->

    $compile = _$compile_
    $rootScope = _$rootScope_

    return
  )

  beforeEach ->
    element = $compile('<blocket-loading></blocket-loading')($rootScope)
    $rootScope.$digest()
    isoScope = element.isolateScope()
    isoScope.$digest()

  it "should engage liftoff", inject(($timeout) ->
    isoScope.docIsReady()
    $timeout.flush()
    expect(isoScope.liftoff).toBe(true)
    expect(isoScope.orbiting).toBe(true)
  )
