// Packages
import jQuery from 'jquery';
// Internal resources
import Template from './leftNavbar.pug';

class Controller {
  constructor () {}

  click (element) {
    jQuery(element.currentTarget).closest('.left-navbar').toggleClass('closed');
  }
}

export default {
  controller: Controller,
  template: Template,
  bindings: {
    menuLinks: '<'
  }
};
