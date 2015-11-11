'use strict';

angular.module('searchApp', ["ngTable"])
  .controller('SearchController', function($scope, $http, NgTableParams) {
    var searcher = this;
    var productEndpoint = 'http://api.vip.supplyhub.com:19000/products';

    function getTableParams(rows, count) {
      var tableParamConfig = {
        page: 1,
        count: count || 10//,
        // sorting: {
          // name: 'asc'
        // }
      };
      var tableSettingsConfig = {
        // total: 0,// total amount of rows (of data) available
        // counts: [10, 25, 50, 100],// shows buttons for how many to display at a time
        dataset: rows,
        getData: function($defer, params) {
          $scope.runSearch($defer, params);
        }
      };
      // is there a better way to get table params?
      return new NgTableParams(tableParamConfig, tableSettingsConfig);
    }

    $scope.query = '';
    $scope.limit = 10;
    $scope.skip = 0;
    $scope.results = [];
    searcher.tableParams = getTableParams($scope.results);// happens on first run through, should always be empty

    $scope.runSearch = function($defer, params) {// happens on search change or table update
      if($scope.query.length === 0) {// don't search without required param
        return;
      }
      var limit = searcher.tableParams.count() || (params && params.count()) || $scope.limit;// use existing table settings, then new, then default
      var apiConfig = {
        params: {
          search: $scope.query,
          limit: limit,
          skip: $scope.skip//,
          // count: false // if true, returns count instead
        }
      };
      $http
        .get(productEndpoint, apiConfig)
        .then(function(resp) {// success callback
          $scope.results = resp.data;
          if($defer) {
            $defer.resolve($scope.results);
            return;
          }
          searcher.tableParams = getTableParams($scope.results, limit);
        },
        function(resp) {// failure callback
          if(resp.status === 404) {// no results were returned, as per REST api
            $scope.results = [];
          }
          if($defer) {
            $defer.resolve($scope.results);
            return;
          }
          searcher.tableParams = getTableParams($scope.results, limit);
        });
    };
  });