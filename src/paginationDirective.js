'use strict';

module.exports = TabPaginationDirective;

function TabPaginationDirective($window, $$rAF, $$q, $timeout, $sniffer) {

  // Must match (2 * width of paginators) in scss
  var PAGINATORS_WIDTH = (8 * 4) * 2;

  return {
    restrict: 'A',
    require: '^heTabs',
    link: postLink
  };

  function rAFDebounce(cb) {
    var queueArgs, alreadyQueued, queueCb, context;

    return function debounced() {
      queueArgs = arguments;
      context = this;
      queueCb = cb;
      if (!alreadyQueued) {
        alreadyQueued = true;
        $$rAF(function() {
          queueCb.apply(context, queueArgs);
          alreadyQueued = false;
        });
      }
    };
  };

  function postLink(scope, element, attr, tabsCtrl) {

    var tabs = element[0].getElementsByTagName('he-tab');
    var debouncedUpdatePagination = rAFDebounce(updatePagination);
    var tabsParent = element.children();
    var state = scope.pagination = {
      page: -1,
      active: false,
      clickNext: function() { userChangePage(+1); },
      clickPrevious: function() { userChangePage(-1); }
    };

    scope.$on('$heTabsChanged', debouncedUpdatePagination);
    angular.element($window).on('resize', debouncedUpdatePagination);

    scope.$on('$destroy', function() {
      angular.element($window).off('resize', debouncedUpdatePagination);
    });

    scope.$watch(function() { return tabsCtrl.tabToFocus; }, onTabFocus);

    var webkit = /webkit/i.test($sniffer.vendorPrefix);

    function vendorProperty(name) {
      return webkit ?  ('webkit' + name.charAt(0).toUpperCase() + name.substring(1)) : name;
    }

    var TRANSITIONEND = 'transitionend' + (webkit ? ' webkitTransitionEnd' : '');

    // Make sure we don't focus an element on the next page
    // before it's in view
    function onTabFocus(tab, oldTab) {
      if (!tab) return;

      var pageIndex = getPageForTab(tab);

      if (!state.active || pageIndex === state.page) {
        tab.element[0].focus();
      } else {
        // Go to the new page, wait for the page transition to end, then focus.
        oldTab && oldTab.element[0].blur();
        setPage(pageIndex).then(function() { tab.element[0].focus(); });
      }
    }

    // Called when page is changed by a user action (click)
    function userChangePage(increment) {
      var sizeData = state.tabData;
      var newPage = Math.max(0, Math.min(sizeData.pages.length - 1, state.page + increment));
      var newTabIndex = sizeData.pages[newPage][ increment > 0 ? 'firstTabIndex' : 'lastTabIndex' ];
      var newTab = tabsCtrl.itemAt(newTabIndex);
      onTabFocus(newTab);
    }

    function updatePagination() {
      if (!element.prop('offsetParent')) {
        var watcher = waitForVisible();
        return;
      }

      var tabs = element.find('he-tab');

      disablePagination();

      var sizeData = state.tabData = calculateTabData();
      var needPagination = state.active = sizeData.pages.length > 1;

      if (needPagination) { enablePagination(); }

      scope.$evalAsync(function () { scope.$broadcast('$heTabsPaginationChanged'); });

      function enablePagination() {
        tabsParent.css('width', '9999px');

        //-- apply filler margins
        angular.forEach(sizeData.tabs, function (tab) {
          angular.element(tab.element).css('margin-left', tab.filler + 'px');
        });

        setPage(getPageForTab(tabsCtrl.getSelectedItem()));
      }

      function disablePagination() {
        slideTabButtons(0);
        tabsParent.css('width', '');
        tabs.css('width', '');
        tabs.css('margin-left', '');
        state.page = null;
        state.active = false;
      }

      function waitForVisible() {
        return watcher || scope.$watch(
            function () {
              $timeout(function () {
                if (element[0].offsetParent) {
                  if (angular.isFunction(watcher)) {
                    watcher();
                  }
                  debouncedUpdatePagination();
                  watcher = null;
                }
              }, 0, false);
            }
        );
      }
    }

    function slideTabButtons(x) {
      if (tabsCtrl.pagingOffset === x) {
        // Resolve instantly if no change
        return $$q.when();
      }

      var deferred = $$q.defer();

      tabsCtrl.$$pagingOffset = x;
      tabsParent.css(vendorProperty('transform'), 'translate3d(' + x + 'px,0,0)');
      tabsParent.on(TRANSITIONEND, onTabsParentTransitionEnd);

      return deferred.promise;

      function onTabsParentTransitionEnd(ev) {
        // Make sure this event didn't bubble up from an animation in a child element.
        if (ev.target === tabsParent[0]) {
          tabsParent.off(TRANSITIONEND, onTabsParentTransitionEnd);
          deferred.resolve();
        }
      }
    }

    function shouldStretchTabs() {
      switch (scope.stretchTabs) {
        case 'never':  return false;
        case 'always': return true;
        default:       return true;
      }
    }

    function calculateTabData(noAdjust) {
      var clientWidth = element.parent().prop('offsetWidth');
      var tabsWidth = clientWidth - PAGINATORS_WIDTH - 1;
      var $tabs = angular.element(tabs);
      var totalWidth = 0;
      var max = 0;
      var tabData = [];
      var pages = [];
      var currentPage;

      $tabs.css('max-width', '');
      angular.forEach(tabs, function (tab, index) {
        var tabWidth = Math.min(tabsWidth, tab.offsetWidth);
        var data = {
          element: tab,
          left: totalWidth,
          width: tabWidth,
          right: totalWidth + tabWidth,
          filler: 0
        };

        //-- This calculates the page for each tab.  The first page will use the clientWidth, which
        //   does not factor in the pagination items.  After the first page, tabsWidth is used
        //   because at this point, we know that the pagination buttons will be shown.
        data.page = Math.ceil(data.right / ( pages.length === 1 && index === tabs.length - 1 ? clientWidth : tabsWidth )) - 1;

        if (data.page >= pages.length) {
          data.filler = (tabsWidth * data.page) - data.left;
          data.right += data.filler;
          data.left += data.filler;
          currentPage = {
            left: data.left,
            firstTabIndex: index,
            lastTabIndex: index,
            tabs: [ data ]
          };
          pages.push(currentPage);
        } else {
          currentPage.lastTabIndex = index;
          currentPage.tabs.push(data);
        }
        totalWidth = data.right;
        max = Math.max(max, tabWidth);
        tabData.push(data);
      });
      $tabs.css('max-width', tabsWidth + 'px');

      if (!noAdjust && shouldStretchTabs()) {
        return adjustForStretchedTabs();
      } else {
        return {
          width: totalWidth,
          max: max,
          tabs: tabData,
          pages: pages,
          tabElements: tabs
        };
      }

      function adjustForStretchedTabs() {
        var canvasWidth = pages.length === 1 ? clientWidth : tabsWidth;
        var tabsPerPage = Math.min(Math.floor(canvasWidth / max), tabs.length);
        var tabWidth    = Math.floor(canvasWidth / tabsPerPage);
        $tabs.css('width', tabWidth + 'px');

        return calculateTabData(true);
      }
    }

    function getPageForTab(tab) {
      var tabIndex = tabsCtrl.indexOf(tab);
      if (tabIndex === -1) return 0;

      var sizeData = state.tabData;

      return sizeData ? sizeData.tabs[tabIndex].page : 0;
    }

    function setPage(page) {
      if (page === state.page) return;

      var lastPage = state.tabData.pages.length - 1;

      if (page < 0) page = 0;
      if (page > lastPage) page = lastPage;

      state.hasPrev = page > 0;
      state.hasNext = page < lastPage;

      state.page = page;

      scope.$broadcast('$heTabsPaginationChanged');

      return slideTabButtons(-state.tabData.pages[page].left);
    }
  }
}

