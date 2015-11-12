'use strict';

angular.module('searchApp', ['ngTable'])
  .controller('SearchController', function($scope, $http, NgTableParams, $location) {
    var searcher = this;
    var productEndpoint = 'http://api.vip.supplyhub.com:19000/products';
    $scope.query = $location.search().query || '';
    $scope.results = [];

    function getTableParams(rows) {
      var tableParamConfig = {
        page: $location.search().page,
        count: 10//,
        // sorting: {
          // name: 'asc'
        // }
      };
      var tableSettingsConfig = {
        // total: 0,// total amount of rows (of data) available, gets auto set when setting the dataset
        // counts: [10, 25, 50, 100],// shows buttons for how many to display at a time
        dataset: rows
      };
      var pars = new NgTableParams(tableParamConfig, tableSettingsConfig);
      var orig_page = pars.page;
      pars.page = function(pageNum) {// to hook into the page change
        var result = orig_page.call(pars, pageNum);
        if(!isNaN(pageNum)) {// to make sure this is page change, not retrieval
          $location.search({ query: $scope.query, page: this.page() });
        }
        return result;
      };
      return pars;
    }

    function endpointErr(resp) {// failure callback
      if(resp.status === 404) {// no results were returned, as per REST api
        $scope.results = [];
      }
      searcher.tableParams.settings({ dataset: $scope.results });
    }

    searcher.tableParams = getTableParams($scope.results);// only happens on first run through, should always be empty

    $scope.getViewDescription = function() {
      if($scope.results.length === 0) {
        return 0;
      }
      return (((searcher.tableParams.page() - 1) * searcher.tableParams.count()) + 1)
        + ' - ' + searcher.tableParams.page() * searcher.tableParams.count() + ' (of ' + searcher.tableParams.total() + ')';
    };

    $scope.runSearch = function(retainPage) {// happens on search change and pageload
      $location.search({ query: $scope.query, page: searcher.tableParams.page() });
      if($scope.query.length === 0) {// don't search without required param
        $scope.results = [];
        searcher.tableParams.settings({ dataset: $scope.results });
        return;
      }
      var apiConfig = {
        params: {
          search: $scope.query,
          skip: (searcher.tableParams.page() - 1) * searcher.tableParams.count(),
          count: 1// if true, returns count instead
        }
      };
      $http.get(productEndpoint, apiConfig)// grab totals first
        .then(function(resp) {
          var total = resp.data.count;
          delete apiConfig.params.count;// switch from counting endpoint
          apiConfig.params.limit = total || 1;// add the limit in, default to 1 if no results to avoid 400
          return $http.get(productEndpoint, apiConfig);
        }, endpointErr)
        .then(function(resp) {// grab actual results
          $scope.results = resp.data;
          var page = searcher.tableParams.page();
          searcher.tableParams.settings({ dataset: $scope.results });
          if(retainPage) {
            searcher.tableParams.page(page);
          }
        },  endpointErr);
    };

    $scope.runSearch(true);// first search for preloaded query params
  });
