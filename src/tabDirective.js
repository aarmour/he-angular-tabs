'use strict';

module.exports = TabDirective;

/**
 * @ngdoc directive
 * @name heTab
 * @module highered.components.tabs
 *
 * @restrict E
 *
 * @description
 * `<he-tab>` is the nested directive used [within `<he-tabs>`].
 */
function TabDirective($compile, $timeout) {
  return {
    restrict: 'E',
    require: ['heTab', '^heTabs'],
    controller: '$heTab',
    scope: {
      onSelect: '&heOnSelect',
      onDeselect: '&heOnDeselect',
      label: '@'
    },
    compile: compile
  };

  function compile(element, attr) {
    var tabLabel = element.find('he-tab-label');

    if (tabLabel.length) {
      // If a tab label element is found, remove it for later re-use.
      tabLabel.remove();

    } else if (angular.isDefined(attr.label)) {
      // Otherwise, try to use attr.label as the label
      tabLabel = angular.element('<he-tab-label>').html(attr.label);

    } else {
      // If nothing is found, use the tab's content as the label
      tabLabel = angular.element('<he-tab-label>')
                        .append(element.contents().remove());
    }

    // Everything that's left as a child is the tab's content.
    var tabContent = element.contents().remove();

    return function postLink(scope, element, attr, ctrls) {

      var tabItemCtrl = ctrls[0]; // Controller for *this* tabItemCtrl
      var tabsCtrl = ctrls[1]; // Controller for *all* tabs

      scope.$watch(
        function () { return attr.label; },
        function () { $timeout(function () { tabsCtrl.scope.$broadcast('$heTabsChanged'); }, 0, false); }
      );

      transcludeTabContent();
      // configureAria();

      tabsCtrl.add(tabItemCtrl);

      scope.$on('$destroy', function() {
        tabsCtrl.remove(tabItemCtrl);
      });

      element.on('$destroy', function () {
        // Wait for item to be removed from the dom
        $timeout(function () {
          tabsCtrl.scope.$broadcast('$heTabsChanged');
        }, 0, false);
      });

      if (!angular.isDefined(attr.ngClick)) {
        element.on('click', defaultClickListener);
      }

      scope.onSwipe = onSwipe;

      if (angular.isNumber(scope.$parent.$index)) {
        watchNgRepeatIndex();
      }

      if (angular.isDefined(attr.heActive)) {
        watchActiveAttribute();
      }

      watchDisabled();

      function transcludeTabContent() {
        // Clone the label we found earlier, and $compile and append it
        var label = tabLabel.clone();

        element.append(label);
        $compile(label)(scope.$parent);

        // Clone the content we found earlier, and mark it for later placement into
        // the proper content area.
        tabItemCtrl.content = tabContent.clone();
      }

      // defaultClickListener isn't applied if the user provides an ngClick expression.
      function defaultClickListener() {
        scope.$apply(function() {
          tabsCtrl.select(tabItemCtrl);
          tabsCtrl.focus(tabItemCtrl);
        });
      }

      function onSwipe(ev) {
        scope.$apply(function() {
          if (ev.type === 'swipeleft') {
            tabsCtrl.select(tabsCtrl.next());
          } else {
            tabsCtrl.select(tabsCtrl.previous());
          }
        });
      }

      // If tabItemCtrl is part of an ngRepeat, move the tabItemCtrl in our internal array
      // when its $index changes
      function watchNgRepeatIndex() {
        // The tabItemCtrl has an isolate scope, so we watch the $index on the parent.
        scope.$watch('$parent.$index', function $indexWatchAction(newIndex) {
          tabsCtrl.move(tabItemCtrl, newIndex);
        });
      }

      function watchActiveAttribute() {
        var unwatch = scope.$parent.$watch('!!(' + attr.heActive + ')', activeWatchAction);
        scope.$on('$destroy', unwatch);

        function activeWatchAction(isActive) {
          var isSelected = tabsCtrl.getSelectedItem() === tabItemCtrl;

          if (isActive && !isSelected) {
            tabsCtrl.select(tabItemCtrl);
          } else if (!isActive && isSelected) {
            tabsCtrl.deselect(tabItemCtrl);
          }
        }
      }

      function watchDisabled() {
        scope.$watch(tabItemCtrl.isDisabled, disabledWatchAction);

        function disabledWatchAction(isDisabled) {
          element.attr('aria-disabled', isDisabled);

          // Auto select `next` tab when disabled
          var isSelected = (tabsCtrl.getSelectedItem() === tabItemCtrl);
          if (isSelected && isDisabled) {
            tabsCtrl.select(tabsCtrl.next() || tabsCtrl.previous());
          }

        }
      }

      // function configureAria() {
      //   // Link together the content area and tabItemCtrl with an id
      //   var tabId = attr.id || ('tab_' + $mdUtil.nextUid());

      //   element.attr({
      //     id: tabId,
      //     role: 'tab',
      //     tabIndex: -1 //this is also set on select/deselect in tabItemCtrl
      //   });

      //   // Only setup the contentContainer's aria attributes if tab content is provided
      //   if (tabContent.length) {
      //     var tabContentId = 'content_' + tabId;
      //     if (!element.attr('aria-controls')) {
      //       element.attr('aria-controls', tabContentId);
      //     }
      //     tabItemCtrl.contentContainer.attr({
      //       id: tabContentId,
      //       role: 'tabpanel',
      //       'aria-labelledby': tabId
      //     });
      //   }
      // }
    };
  }
}