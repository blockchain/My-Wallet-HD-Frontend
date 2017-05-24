import './app.scss';
import 'walletCss/wallet.css';

import angular from 'npm/angular';
import uiRouter from 'npm/angular-ui-router';

import routing from './app.routes.js';
import Home from 'components/home';
import Components from 'components/components';
import Directives from 'components/directives';
import Adverts from 'components/directives/adverts';
import ActivityFeed from 'components/directives/activity-feed';

const modules = [
  uiRouter,
  Home,
  Components,
  Directives,
  Adverts,
  ActivityFeed
];

angular
  .module('app', modules)
  .config(routing);
