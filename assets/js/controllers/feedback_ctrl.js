walletApp.controller("FeedbackCtrl", ($scope, $log, $state, $http) => {
  $scope.state = $state;
  $scope.formStage = 0;
  $scope.setFormSubmitted = () => {
    if ($scope.formStage === 0) {
      const form = {
        'rating': $scope.rating,
        'description-good': $scope.descriptionGood,
        'description-bad': $scope.descriptionBad,
        'fullname': $scope.fullname,
        'email': $scope.email
      };
      $http.post('/feedback', form).success(data => {
        if (data.success) {
          return $scope.formStage = 2;
        } else {
          return $scope.formStage = 3;
        }
      }).error(() => {
        $scope.formStage = 3;
      });
    }
    $scope.formStage = 1;
  };
});
