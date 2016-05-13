
angular
  .module('walletApp')
  .directive('transactionNote', transactionNote);

function transactionNote ($translate, $rootScope, Wallet) {
  const directive = {
    restrict: 'E',
    replace: false,
    scope: {
      transaction: '='
    },
    templateUrl: 'templates/transaction-note.jade',
    link: link
  };
  return directive;

  function link (scope, elem, attrs) {
    scope.editNote = false;

    if (scope.transaction.txType === 'received') {
      let pOuts = scope.transaction.processedOutputs ? scope.transaction.processedOutputs[0] : null;
      if (pOuts.identity) scope.label = Wallet.hdAddresses(pOuts.identity)().filter(a => a.address === pOuts.address)[0].label;
    }

    scope.cancelEditNote = () => {
      scope.transaction.draftNote = '';
      scope.editNote = false;
    };

    scope.startEditNote = () => {
      if (scope.transaction.note) scope.transaction.draftNote = scope.transaction.note;
      scope.editNote = true;
    };

    scope.saveNote = () => {
      scope.transaction.note = scope.transaction.draftNote;
      scope.editNote = false;
    };

    scope.deleteNote = () => {
      scope.transaction.note = null;
      scope.editNote = false;
    };

    scope.$watch('transaction.note', (newVal, oldVal) => {
      if (scope.transaction != null) {
        scope.transaction.draftNote = '';
      }
      if ((newVal == null || newVal === '') && (oldVal != null) && oldVal !== '') {
        Wallet.deleteNote(scope.transaction);
      }
      if (newVal != null && newVal !== oldVal && newVal !== '') {
        Wallet.setNote(scope.transaction, scope.transaction.note);
      }
    });
  }
}
