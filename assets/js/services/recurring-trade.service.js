angular
  .module('walletApp')
  .factory('recurringTrade', RecurringTradeService);

function RecurringTradeService () {
  const service = {};

  let human = { 1: 'st', 2: 'nd', 3: 'rd', 21: 'st', 22: 'nd', 23: 'rd', 31: 'st' };
  let days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  service.getTimespan = (date, frequency) => {
    let freq = frequency.toLowerCase();
    if (freq === 'daily') return '24 hours';
    if (freq === 'weekly') return `${days[date.getDay()]}`;
    if (freq === 'monthly') return `${date.getDate() + (human[date.getDate()] || 'th')} of the month`;
  };

  return service;
}
