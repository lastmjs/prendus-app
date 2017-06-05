"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t;
    return { next: verb(0), "throw": verb(1), "return": verb(2) };
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var reducers_1 = require("../../redux/reducers");
var actions_1 = require("../../redux/actions");
var PrendusApp = (function (_super) {
    __extends(PrendusApp, _super);
    function PrendusApp() {
        return _super.apply(this, arguments) || this;
    }
    Object.defineProperty(PrendusApp, "is", {
        get: function () { return 'prendus-app'; },
        enumerable: true,
        configurable: true
    });
    PrendusApp.prototype.connectedCallback = function () {
        return __awaiter(this, void 0, void 0, function () {
            var checkForUserTokenAction, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _super.prototype.connectedCallback.call(this);
                        this.rootReducer = reducers_1.RootReducer;
                        checkForUserTokenAction = actions_1.checkForUserToken();
                        this.action = checkForUserTokenAction;
                        _a = this;
                        return [4 /*yield*/, actions_1.getAndSetUser(checkForUserTokenAction.value)];
                    case 1:
                        _a.action = _b.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    PrendusApp.prototype.getSelectedView = function (rootRouteActive, createCourseRouteActive, viewCourseRouteActive, editCourseRouteActive, createLessonRouteActive, viewLessonRouteActive, editLessonRouteActive, createAssignmentRouteActive, viewAssignmentRouteActive, editAssignmentRouteActive, signupRouteActive, loginRouteActive) {
        if (rootRouteActive)
            return 'rootView';
        if (signupRouteActive)
            return 'signupView';
        if (loginRouteActive)
            return 'loginView';
        if (createCourseRouteActive)
            return 'createCourseView';
        if (viewCourseRouteActive)
            return 'viewCourseView';
        if (editCourseRouteActive)
            return 'editCourseView';
        if (createLessonRouteActive)
            return 'createLessonView';
        if (viewLessonRouteActive)
            return 'viewLessonView';
        if (editLessonRouteActive)
            return 'editLessonView';
        if (createAssignmentRouteActive)
            return 'createAssignmentView';
        if (viewAssignmentRouteActive)
            return 'viewAssignmentView';
        if (editAssignmentRouteActive)
            return 'editAssignmentView';
    };
    PrendusApp.prototype.stateChange = function (e) {
        var state = e.detail.state;
        this.user = state.user;
        this.userToken = state.userToken;
    };
    return PrendusApp;
}(Polymer.Element));
window.customElements.define(PrendusApp.is, PrendusApp);
