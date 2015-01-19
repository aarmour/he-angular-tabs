'use strict';

module.exports = TabController;

function TabController($scope, $element, $attrs, $compile, $animate, $parse, $timeout) {
  var self = this;

  // Properties
  self.contentContainer = angular.element('<div class="he-tab-content ng-hide">');
  self.element = $element;

  // Methods
  self.isDisabled = isDisabled;
  self.onAdd = onAdd;
  self.onRemove = onRemove;
  self.onSelect = onSelect;
  self.onDeselect = onDeselect;

  var disabledParsed = $parse($attrs.ngDisabled);

  function isDisabled() {
    return disabledParsed($scope.$parent);
  }
  
  /**
   * Add the tab's content to the DOM container area in the tabs,
   * @param contentArea the contentArea to add the content of the tab to
   */
  function onAdd(contentArea, shouldDisconnectScope) {
    if (self.content.length) {
      self.contentContainer.append(self.content);
      self.contentScope = $scope.$parent.$new();
      contentArea.append(self.contentContainer);

      $compile(self.contentContainer)(self.contentScope);
      if (shouldDisconnectScope === true) {
        $timeout(function () {
          disconnectScope(self.contentScope);
        }, 0, false);
      }
    }
  }

  function onRemove() {
    $animate.leave(self.contentContainer).then(function() {
      self.contentScope && self.contentScope.$destroy();
      self.contentScope = null;
    });
  }

  function toggleAnimationClass(rightToLeft) {
    self.contentContainer[rightToLeft ? 'addClass' : 'removeClass']('he-transition-rtl');
  }

  function onSelect(rightToLeft) {
    // Resume watchers and events firing when tab is selected
    reconnectScope(self.contentScope);

    $element.addClass('active');
    $element.attr('aria-selected', true);
    $element.attr('tabIndex', 0);
    toggleAnimationClass(rightToLeft);
    $animate.removeClass(self.contentContainer, 'ng-hide');

    $scope.onSelect();
  }

  function onDeselect(rightToLeft) {
    // Stop watchers & events from firing while tab is deselected
    disconnectScope(self.contentScope);

    $element.removeClass('active');
    $element.attr('aria-selected', false);
    // Only allow tabbing to the active tab
    $element.attr('tabIndex', -1);
    toggleAnimationClass(rightToLeft);
    $animate.addClass(self.contentContainer, 'ng-hide');

    $scope.onDeselect();
  }

  // Stop watchers and events from firing on a scope without destroying it,
  // by disconnecting it from its parent and its siblings' linked lists.
  function disconnectScope(scope) {
    if (!scope) return;

    // we can't destroy the root scope or a scope that has been already destroyed
    if (scope.$root === scope) return;
    if (scope.$$destroyed ) return;

    var parent = scope.$parent;
    scope.$$disconnected = true;

    // See Scope.$destroy
    if (parent.$$childHead === scope) parent.$$childHead = scope.$$nextSibling;
    if (parent.$$childTail === scope) parent.$$childTail = scope.$$prevSibling;
    if (scope.$$prevSibling) scope.$$prevSibling.$$nextSibling = scope.$$nextSibling;
    if (scope.$$nextSibling) scope.$$nextSibling.$$prevSibling = scope.$$prevSibling;

    scope.$$nextSibling = scope.$$prevSibling = null;
  }

  // Undo the effects of disconnectScope.
  function reconnectScope(scope) {
    if (!scope) return;

    // we can't disconnect the root node or scope already disconnected
    if (scope.$root === scope) return;
    if (!scope.$$disconnected) return;

    var child = scope;

    var parent = child.$parent;
    child.$$disconnected = false;
    // See Scope.$new for this logic...
    child.$$prevSibling = parent.$$childTail;
    if (parent.$$childHead) {
      parent.$$childTail.$$nextSibling = child;
      parent.$$childTail = child;
    } else {
      parent.$$childHead = parent.$$childTail = child;
    }
  }
}