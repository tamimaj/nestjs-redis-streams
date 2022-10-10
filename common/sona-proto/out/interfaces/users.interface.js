"use strict";
exports.__esModule = true;
exports.USERS_SERVICE_NAME = exports.UsersServiceControllerMethods = exports.USERS_PACKAGE_NAME = void 0;
/* eslint-disable */
var microservices_1 = require("@nestjs/microservices");
exports.USERS_PACKAGE_NAME = "users";
function UsersServiceControllerMethods() {
    return function (constructor) {
        var grpcMethods = ["getUserById", "getUserByAuthId", "getUsers", "createUser", "updateUser"];
        for (var _i = 0, grpcMethods_1 = grpcMethods; _i < grpcMethods_1.length; _i++) {
            var method = grpcMethods_1[_i];
            var descriptor = Reflect.getOwnPropertyDescriptor(constructor.prototype, method);
            (0, microservices_1.GrpcMethod)("UsersService", method)(constructor.prototype[method], method, descriptor);
        }
        var grpcStreamMethods = [];
        for (var _a = 0, grpcStreamMethods_1 = grpcStreamMethods; _a < grpcStreamMethods_1.length; _a++) {
            var method = grpcStreamMethods_1[_a];
            var descriptor = Reflect.getOwnPropertyDescriptor(constructor.prototype, method);
            (0, microservices_1.GrpcStreamMethod)("UsersService", method)(constructor.prototype[method], method, descriptor);
        }
    };
}
exports.UsersServiceControllerMethods = UsersServiceControllerMethods;
exports.USERS_SERVICE_NAME = "UsersService";
