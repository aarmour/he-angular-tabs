'use strict';

module.exports = TabsController;

function TabsController($scope, $element, $timeout, $heUtil) {

  var self = this;
  var tabsList = $heUtil.iterator();

  self.$element = $element;
  self.scope = $scope;

  var contentArea = self.contentArea = angular.element($element[0].querySelector('.he-tabs-content'));

  self.count = angular.bind(tabsList, tabsList.count);
  var inRange = self.inRange = angular.bind(tabsList, tabsList.inRange);
  var indexOf = self.indexOf = angular.bind(tabsList, tabsList.indexOf);
  var itemAt = self.itemAt = angular.bind(tabsList, tabsList.itemAt);
  self.getSelectedItem = getSelectedItem;
  self.getSelectedIndex = getSelectedIndex;
  self.add = add;
  self.remove = remove;
  self.move = move;
  self.select = select;
  self.focus = focus;
  self.deselect = deselect;
  self.next = next;
  self.previous = previous;

  $scope.$on('$destroy', function () {
    deselect(getSelectedItem());

    for (var i = count() - 1; i >= 0; i--) {
      remove(tabsList[i], true);
    }
  });

  function getSelectedItem() {
    return itemAt($scope.selectedIndex);
  }

  function getSelectedIndex() {
    return $scope.selectedIndex;
  }

  // Add a new tab.
  // Returns a method to remove the tab from the list.
  function add(tab, index) {
    tabsList.add(tab, index);

    // Select the new tab if there is no selectedIndex, or if the
    // selectedIndex is for this tab.
    if (!angular.isDefined(tab.element.attr('he-active')) && ($scope.selectedIndex === -1 || !angular.isNumber($scope.selectedIndex) ||
        $scope.selectedIndex === self.indexOf(tab))) {
      tab.onAdd(self.contentArea, false);
      self.select(tab);
    } else {
      tab.onAdd(self.contentArea, true);
    }

    $scope.$broadcast('$heTabsChanged');
  }

  function remove(tab, noReselect) {
    if (!tabsList.contains(tab)) return;
    if (noReselect) return;

    var isSelectedItem = getSelectedItem() === tab;
    var newTab = previous() || next();

    deselect(tab);
    tabsList.remove(tab);
    tab.onRemove();

    $scope.$broadcast('$heTabsChanged');

    if (isSelectedItem) {
      select(newTab);
    }
  }

  function move(tab, toIndex) {
    var isSelected = getSelectedItem() === tab;

    tabsList.remove(tab);
    tabsList.add(tab, toIndex);

    if (isSelected) {
      select(tab);
    }

    $scope.$broadcast('$heTabsChanged');
  }

  function select(tab, rightToLeft) {
    if (!tab || tab.isSelected || tab.isDisabled()) return;
    if (!tabsList.contains(tab)) return;

    if (!angular.isDefined(rightToLeft)) {
      rightToLeft = indexOf(tab) < $scope.selectedIndex;
    }
    deselect(getSelectedItem(), rightToLeft);

    $scope.selectedIndex = indexOf(tab);
    tab.isSelected = true;
    tab.onSelect(rightToLeft);

    $scope.$broadcast('$heTabsChanged');
  }

  function focus(tab) {
    // The pagination directive watches this property so that
    // it can defer focusing an element on the next page before
    // it's in view.
    self.tabToFocus = tab;
  }

  function deselect(tab, rightToLeft) {
    if (!tab || !tab.isSelected) return;
    if (!tabsList.contains(tab)) return;

    $scope.selectedIndex = -1;
    tab.isSelected = false;
    tab.onDeselect(rightToLeft);
  }

  function next(tab, filterFn) {
    return tabsList.next(tab || getSelectedItem(), filterFn || isTabEnabled);
  }

  function previous(tab, filterFn) {
    return tabsList.previous(tab || getSelectedItem(), filterFn || isTabEnabled);
  }

  function isTabEnabled(tab) {
    return tab && !tab.isDisabled();
  }

}