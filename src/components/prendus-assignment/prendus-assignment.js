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
var graphql_service_1 = require("../../services/graphql-service");
var PrendusAssignment = (function (_super) {
    __extends(PrendusAssignment, _super);
    function PrendusAssignment() {
        return _super.apply(this, arguments) || this;
    }
    Object.defineProperty(PrendusAssignment, "is", {
        get: function () { return 'prendus-assignment'; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(PrendusAssignment, "properties", {
        get: function () {
            return {
                assignmentId: {
                    observer: 'assignmentIdChanged'
                },
                lessonId: {},
                mode: {}
            };
        },
        enumerable: true,
        configurable: true
    });
    PrendusAssignment.prototype.connectedCallback = function () {
        _super.prototype.connectedCallback.call(this);
        this.componentId = this.shadowRoot.querySelector('#reduxStoreElement').elementId;
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'loaded',
            value: true
        };
    };
    PrendusAssignment.prototype.isViewMode = function (mode) {
        return mode === 'view';
    };
    PrendusAssignment.prototype.isEditMode = function (mode) {
        return mode === 'edit' || mode === 'create';
    };
    PrendusAssignment.prototype.assignmentIdChanged = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.action = {
                            type: 'SET_COMPONENT_PROPERTY',
                            componentId: this.componentId,
                            key: 'assignmentId',
                            value: this.assignmentId
                        };
                        this.action = {
                            type: 'SET_COMPONENT_PROPERTY',
                            componentId: this.componentId,
                            key: 'loaded',
                            value: false
                        };
                        return [4 /*yield*/, this.loadData()];
                    case 1:
                        _a.sent();
                        this.action = {
                            type: 'SET_COMPONENT_PROPERTY',
                            componentId: this.componentId,
                            key: 'loaded',
                            value: true
                        };
                        return [2 /*return*/];
                }
            });
        });
    };
    PrendusAssignment.prototype.loadData = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, graphql_service_1.GQLQuery("\n            query {\n                assignment" + this.assignmentId + ": Assignment(id: \"" + this.assignmentId + "\") {\n                    title,\n                    lesson {\n                        id\n                    }\n                }\n            }\n        ", this.userToken, function (key, value) {
                            _this.action = {
                                type: 'SET_PROPERTY',
                                key: key,
                                value: value
                            };
                        })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    PrendusAssignment.prototype.subscribeToData = function () {
    };
    PrendusAssignment.prototype.saveAssignment = function () {
        return __awaiter(this, void 0, void 0, function () {
            var title, data;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        title = this.shadowRoot.querySelector('#titleInput').value;
                        if (!this.assignmentId)
                            return [3 /*break*/, 1];
                        graphql_service_1.GQLMutate("\n                mutation {\n                    updateAssignment(\n                        id: \"" + this.assignmentId + "\"\n                        lessonId: \"" + this.lessonId + "\"\n                        title: \"" + title + "\"\n                    ) {\n                        id\n                    }\n                }\n            ", this.userToken);
                        return [3 /*break*/, 3];
                    case 1: return [4 /*yield*/, graphql_service_1.GQLMutate("\n                mutation {\n                    createAssignment(\n                        title: \"" + title + "\"\n                        lessonId: \"" + this.lessonId + "\"\n                        authorId: \"" + this.user.id + "\"\n                    ) {\n                        id\n                    }\n                }\n            ", this.userToken)];
                    case 2:
                        data = _a.sent();
                        this.action = {
                            type: 'SET_COMPONENT_PROPERTY',
                            componentId: this.componentId,
                            key: 'assignmentId',
                            value: data.createAssignment.id
                        };
                        _a.label = 3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    PrendusAssignment.prototype.stateChange = function (e) {
        var state = e.detail.state;
        this.assignment = state["assignment" + this.assignmentId];
        this.assignmentId = state.components[this.componentId] ? state.components[this.componentId].assignmentId : this.assignmentId;
        this.lessonId = this.assignment ? this.assignment.lesson.id : this.lessonId;
        this.loaded = state.components[this.componentId] ? state.components[this.componentId].loaded : this.loaded;
        this.userToken = state.userToken;
        this.user = state.user;
    };
    return PrendusAssignment;
}(Polymer.Element));
window.customElements.define(PrendusAssignment.is, PrendusAssignment);
