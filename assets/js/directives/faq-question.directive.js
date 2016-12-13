
angular
  .module('walletDirectives')
  .directive('faqQuestion', faqQuestion);

function faqQuestion () {
  const directive = {
    restrict: 'E',
    scope: {
      q: '=question',
      onToggle: '&'
    },
    templateUrl: 'templates/faq-question.jade'
  };
  return directive;
}
