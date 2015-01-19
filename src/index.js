'use strict';

var tabs = angular.module('highered.components.tabs', [require('he-core').angular.name])
  .controller('$heTabs', require('./tabsController'))
  .directive('heTabs', require('./tabsDirective'))
  .controller('$heTab', require('./tabController'))
  .directive('heTab', require('./tabDirective'))
  .directive('heTabsPagination', require('./paginationDirective'));

if (typeof module !== 'undefined' && module.exports) {
  module.exports = tabs;
}