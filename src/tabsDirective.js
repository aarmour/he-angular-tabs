'use strict';

module.exports = TabsDirective;

/**
 * @ngdoc directive
 * @name heTabs
 * @module highered.components.tabs
 *
 * @restrict E
 *
 * @description
 * The `<he-tabs>` directive is a container for 1..n `<he-tab>` child directives.
 *
 * Example usage:
 *
 *   <he-tabs>
 *     <he-tab label="Tab #1"></he-tab>
 *     <he-tab label="Tab #2"></he-tab>
 *     <he-tab label="Tab #3"></he-tab> 
 *   </he-tabs>
 */
function TabsDirective() {
  return {
    restrict: 'E',
    controller: '$heTabs',
    require: 'heTabs',
    transclude: true,
    scope: {
      selectedIndex: '=?selected'
    },
    template:
      '<section class="he-header" ' +
        'ng-class="{\'he-paginating\': pagination.active}">' +

        '<button class="he-paginator he-prev" ' +
          'ng-if="pagination.active && pagination.hasPrev" ' +
          'ng-click="pagination.clickPrevious()" ' +
          'aria-hidden="true">' +
        '</button>' +

        '<div class="he-header-items-container" he-tabs-pagination>' +
          // Container for <he-tab> elements
          '<div class="he-header-items">' +
          '</div>' +
        '</div>' +

        '<button class="he-paginator he-next" ' +
          'ng-if="pagination.active && pagination.hasNext" ' +
          'ng-click="pagination.clickNext()" ' +
          'aria-hidden="true">' +
        '</button>' +

      '</section>' +
      '<section class="he-tabs-content"></section>'
      ,
    link: postLink
  };
}

function postLink(scope, element, attr, tabsCtrl, transclude) {

  configureAria();
  watchSelected();

  transclude(scope.$parent, function (clone) {
    angular.element(element[0].querySelector('.he-header-items')).append(clone);
  });

  function configureAria() {
    element.attr('role', 'tablist');
  }

  function watchSelected() {
    scope.$watch('selectedIndex', function (newIndex, oldIndex) {
      if (oldIndex == newIndex) return;

      tabsCtrl.deselect(tabsCtrl.itemAt(oldIndex));

      if (tabsCtrl.inRange(newIndex)) {
        var newTab = tabsCtrl.itemAt(newIndex);

        while (newTab && newTab.isDisabled()) {
          if (newIndex > oldIndex) {
            newTab = tabsCtrl.next(newTab);
          } else {
            newTab = tabsCtrl.previous(newTab);
          }
        }

        tabsCtrl.select(newTab);
      }
    });
  }
}