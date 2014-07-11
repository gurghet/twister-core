/*globals $, angular*/
(function (globals) {
    'use strict';
    
    function comparePosts(postA, postB) {
        if (postA.userpost.time < postB.userpost.time) {
            return -1;
        } else {
            return 1;
        }
    }
    
    function compareMsgs(msgA, msgB) {
        if (msgA.time < msgB.time) {
            return -1;
        } else {
            return 1;
        }
    }

    var main = angular.module('main', ['ui.bootstrap']);
    
    main.factory('main_state', function () {
        return {
            s : {
                current_user: "utente2",
                current_section: "home",
                current_producer: undefined,
                should_reload: false,
                following: [],
                producers: [],
                posts: [],
                miniposts: [],
                minimsgs: []
            }
        };
    });
    
    main.controller('ModalDemoCtrl', function ($scope, $modal, $log) {
        $scope.items = ['item1', 'item2', 'item3'];

        $scope.open = function (size) {

            var modalInstance = $modal.open({
                templateUrl: 'myModalContent.html',
                controller: 'ModalInstanceCtrl',
                size: size,
                resolve: {
                    items: function () {
                        return $scope.items;
                    }
                }
            });

            modalInstance.result.then(function (selectedItem) {
                $scope.selected = selectedItem;
            }, function () {
                $log.info('Modal dismissed at: ' + new Date());
            });
        };
    });
    
    main.controller('ModalInstanceCtrl', function ($scope, $modalInstance, items) {
        $scope.items = items;
        $scope.selected = {
            item: $scope.items[0]
        };
        
        $scope.ok = function () {
            $modalInstance.close($scope.selected.item);
        };
        
        $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
        };
    });
    
    main.controller('NavigationController', function ($scope, main_state) {
        $scope.main_state = main_state.s;
        this.goToHomePage = function () {
            $scope.main_state.current_section = "home";
            $scope.main_state.current_producer = undefined;
        };
        
    });
    
    main.controller('ContentController', function ($scope, main_state) {
        $scope.main_state = main_state.s;
        var controller = this;
        this.fillProducers = function (req, value, rawJson) {
            $scope.$apply(function () {
                $scope.main_state.producers = value;
            });
        };
        this.fillPosts = function (req, posts) {
            $scope.$apply(function () {
                $scope.main_state.posts = posts;
            });
        };
        this.addMiniPost = function (req, posts) {
            $scope.$apply(function () {
                $scope.main_state.miniposts = $scope.main_state.miniposts.concat(posts);
                $scope.main_state.miniposts.sort(comparePosts);
            });
        };
        this.addMiniMsgs = function (req, posts, rawJson) {
            var i;
            if (rawJson.length !== main_state.s.minimsgs.length) {
                while (main_state.s.minimsgs.length) {
                    main_state.s.minimsgs.pop();
                }
                $scope.$apply(function () {
                    for (i = 0; i < rawJson.length; i += 1) {
                        rawJson[i].p.author = rawJson[i].sig_user;
                        $scope.main_state.minimsgs.push(rawJson[i].p);
                    }
                    $scope.main_state.minimsgs.sort(compareMsgs);
                });
            }
        };
        
        this.send = function (dmsg) {
            globals.dhtput(main_state.s.current_producer, "dmgs", "m", dmsg, main_state.s.current_user, 0);
        };
        this.login = function (username) {
            main_state.s.current_user = username;
        };
        this.isCurrentSection = function (section) {
            return section === $scope.main_state.current_section;
        };
        this.goToProducerPage = function (prodName) {
            globals.getposts(prodName, controller.fillPosts);
            $scope.main_state.current_producer = prodName;
            $scope.main_state.current_section = "producer";
        };
        this.isFollowing = function (prodName) {
            return (main_state.s.following.indexOf(prodName) > -1);
        };
        this.follow = function (prodName) {
            $scope.main_state.following.push(prodName);
            controller.reloadFeed();
        };
        this.unfollow = function (prodName) {
            var index;
            index = main_state.s.following.indexOf(prodName);
            if (index > -1) {
                $scope.main_state.following.splice(index, 1);
            }
            controller.reloadFeed();
        };
        this.reloadFeed = function () {
            var i;
            for (i = 0; i < main_state.s.following.length; i += 1) {
                globals.getposts(main_state.s.following[i],
                                 controller.addMiniPost
                                );
            }
            while (main_state.s.miniposts.length) {
                main_state.s.miniposts.pop();
            }
        };
        this.tick = function () {
            if (main_state.s.should_reload) {
                controller.reloadFeed();
                main_state.s.should_reload = false;
            }
            globals.dhtget(main_state.s.current_user, "dmgs", "m", controller.addMiniMsgs);
            globals.getlasthave(main_state.s);
        };
        
        this.reloadFeed();
        setInterval(this.tick, 7000);
        globals.dhtget("utente1", "home", "s", controller.fillProducers);
    });
    
}(this));