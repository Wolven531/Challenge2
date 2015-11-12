'use strict';

angular.module('searchApp', ['ngTable'])
  .controller('SearchController', function($scope, $http, NgTableParams) {
    var searcher = this;
    var productEndpoint = 'http://api.vip.supplyhub.com:19000/products';
    $scope.query = '';
    $scope.limit = 10;
    $scope.skip = 0;
    $scope.results = [];

    function getTableParams(rows) {
      console.log('getTableParams()');
      var tableParamConfig = {
        page: 1,
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
      // is there a better way to get table params than new everytime?
      return new NgTableParams(tableParamConfig, tableSettingsConfig);
    }

    function endpointErr(resp, $defer) {// failure callback
      if(resp.status === 404) {// no results were returned, as per REST api
        $scope.results = [];
      }
      if($defer) {
        $defer.resolve($scope.results);
        return;
      }
      searcher.tableParams.settings({ dataset: $scope.results });
    }

    searcher.tableParams = getTableParams($scope.results);// only happens on first run through, should always be empty

    $scope.getViewDescription = function() {
      if($scope.results.length === 0) {
        return 0;
      }
      return (((searcher.tableParams.page() - 1) * searcher.tableParams.count()) + 1)
        + ' - '
        + searcher.tableParams.page() * searcher.tableParams.count()
        + ' of ' + searcher.tableParams.total();
    };

    $scope.runSearch = function($defer, params) {// happens on search change or table update
      if($scope.query.length === 0) {// don't search without required param
        $scope.results = [];
        if($defer) {
          $defer.resolve($scope.results);
          return;
        }
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
      if(params) {// overwrite values if there are new settings
        apiConfig.params.limit = params.count();
        apiConfig.params.skip = (params.page() - 1) * params.count();
      }
      $http.get(productEndpoint, apiConfig)// grab totals first
        .then(function(resp) {
          var total = resp.data.count;
          console.log('Total available: ' + total);
          delete apiConfig.params.count;// switch from counting endpoint
          apiConfig.params.limit = total || 1;// add the limit in, default to 1 if no results to avoid 400
          return $http.get(productEndpoint, apiConfig);
        }, function(resp) {
          endpointErr(resp, $defer);
        })
        .then(function(resp) {// grab actual results
          $scope.results = resp.data;
          if($defer) {
            $defer.resolve($scope.results);
            return;
          }
          searcher.tableParams.settings({ dataset: $scope.results });
        }, function(resp) {
          endpointErr(resp, $defer);
        });
    };
  });