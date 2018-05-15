mod.controller('StyleEditorController', ['$scope', function($scope) {
  $scope.$watch('widget', function() {
    $scope.style = $$get($scope, 'widget.style');
  });
}]);
