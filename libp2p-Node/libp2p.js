"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
exports.__esModule = true;
exports.p2pNode = void 0;
var Libp2p = require('libp2p');
var TCP = require('libp2p-tcp');
var NOISE = require('libp2p-noise').NOISE;
var MPLEX = require('libp2p-mplex');
var MDNS = require('libp2p-mdns');
var Gossipsub = require("libp2p-gossipsub");
var multiaddr = require('multiaddr').multiaddr;
var fromString = require('uint8arrays/from-string').fromString;
var toString = require('uint8arrays/to-string').toString;
//https://github.com/libp2p/js-libp2p/blob/master/examples/chat/src/stream.js
var pipe = require('it-pipe');
var map = require('it-map');
var stream_1 = require("stream");
var lookup_1 = require("./lookup");
var redisClient_1 = require("./redisClient");
var DELETION_TIMER = 1000 * 60 * 60; //milliseconds
var p2pNode = /** @class */ (function () {
    function p2pNode(myEccoBoxName) {
        var _this = this;
        this.lookupService = new lookup_1.lookupService();
        this.isReady = false;
        this.bulkPublish = {};
        this.stop = function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.node.stop()];
                    case 1:
                        _a.sent();
                        console.log('libp2p has stopped');
                        process.exit(0);
                        return [2 /*return*/];
                }
            });
        }); };
        if (myEccoBoxName != null) {
            this.myEccoBoxName = myEccoBoxName;
            console.log("Now starting EccoBox! Name: " + this.myEccoBoxName);
            this.redis = new redisClient_1.redisClient();
            this.init();
        }
        else {
            console.error("Please provide a name to this EccoBox");
        }
    }
    p2pNode.prototype.init = function () {
        return __awaiter(this, void 0, void 0, function () {
            var root, _a;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        root = this;
                        //Einstellungen libp2p
                        _a = this;
                        return [4 /*yield*/, Libp2p.create({
                                addresses: {
                                    listen: ['/ip4/0.0.0.0/tcp/0']
                                },
                                modules: {
                                    transport: [TCP],
                                    connEncryption: [NOISE],
                                    streamMuxer: [MPLEX],
                                    peerDiscovery: [MDNS],
                                    pubsub: Gossipsub
                                }, config: {
                                    peerDiscovery: {
                                        autoDial: true,
                                        mdns: {
                                            enabled: true
                                        }
                                    },
                                    pubsub: {
                                        enabled: true,
                                        emitSelf: true
                                    }, dialer: {
                                        dialTimeout: 3000
                                    }
                                }
                            })];
                    case 1:
                        //Einstellungen libp2p
                        _a.node = _b.sent();
                        return [4 /*yield*/, this.node.start()];
                    case 2:
                        _b.sent();
                        console.log('libp2p has started');
                        this.isReady = true;
                        this.node.on('error', function (err) {
                            console.log('ERROR: ' + err);
                        });
                        this.node.on('peer:discovery', function (peerData) {
                            console.log('Found a peer in the local network', peerData.id.toB58String(), peerData.multiaddrs);
                        });
                        this.node.connectionManager.on('peer:connect', function (connection) {
                            console.log('Connected to %s', connection.remotePeer.toB58String());
                            _this.announceMyself();
                        });
                        this.node.connectionManager.on('peer:disconnect', function (connection) {
                            console.log("Disconnecting: " + connection.remotePeer.toB58String());
                            _this.lookupService.unregister(connection.remotePeer.toB58String());
                            _this.publish("ORGA_DISCON", connection.remotePeer.toB58String());
                        });
                        //Organisation des Lookup-Service
                        this.node.pubsub.subscribe("ORGA_ANNOUNCE");
                        this.node.pubsub.on("ORGA_ANNOUNCE", function (msg) {
                            try {
                                var splitMessage = (msg.data).toString().split(" ", 2);
                                if (splitMessage[0] != root.myAddr && root.lookupService.register(multiaddr(splitMessage[0]), splitMessage[1])) { // if  we see a new addr
                                    root.announceMyself();
                                }
                            }
                            catch (e) {
                                console.error(e);
                            }
                        });
                        //Abmelden von Peers vom Lookup-Service
                        this.node.pubsub.subscribe("ORGA_DISCON");
                        this.node.pubsub.on("ORGA_DISCON", function (msg) {
                            try {
                                console.log("Got Discon %s", toString(msg.data));
                                _this.lookupService.unregister((toString(msg.data)));
                                console.log("lookupService:" + JSON.stringify(root.lookupService.peerRefrences));
                            }
                            catch (e) {
                                console.error(e);
                            }
                        });
                        //Empfangen einer Query aus dem Netz
                        this.node.handle("/query/1.0.0", function (_a) {
                            var connection = _a.connection, stream = _a.stream, protocol = _a.protocol;
                            return __awaiter(_this, void 0, void 0, function () {
                                var resp, n;
                                return __generator(this, function (_b) {
                                    resp = this.response;
                                    n = this.node;
                                    try {
                                        pipe(stream.source, function (source) { return map(source, function (buf) { return toString(buf.slice()); }); }, function (source) {
                                            var source_1, source_1_1;
                                            var e_1, _a;
                                            return __awaiter(this, void 0, void 0, function () {
                                                var allData, chunk, e_1_1, commands;
                                                return __generator(this, function (_b) {
                                                    switch (_b.label) {
                                                        case 0:
                                                            allData = "";
                                                            _b.label = 1;
                                                        case 1:
                                                            _b.trys.push([1, 6, 7, 12]);
                                                            source_1 = __asyncValues(source);
                                                            _b.label = 2;
                                                        case 2: return [4 /*yield*/, source_1.next()];
                                                        case 3:
                                                            if (!(source_1_1 = _b.sent(), !source_1_1.done)) return [3 /*break*/, 5];
                                                            chunk = source_1_1.value;
                                                            allData += chunk.toString();
                                                            _b.label = 4;
                                                        case 4: return [3 /*break*/, 2];
                                                        case 5: return [3 /*break*/, 12];
                                                        case 6:
                                                            e_1_1 = _b.sent();
                                                            e_1 = { error: e_1_1 };
                                                            return [3 /*break*/, 12];
                                                        case 7:
                                                            _b.trys.push([7, , 10, 11]);
                                                            if (!(source_1_1 && !source_1_1.done && (_a = source_1["return"]))) return [3 /*break*/, 9];
                                                            return [4 /*yield*/, _a.call(source_1)];
                                                        case 8:
                                                            _b.sent();
                                                            _b.label = 9;
                                                        case 9: return [3 /*break*/, 11];
                                                        case 10:
                                                            if (e_1) throw e_1.error;
                                                            return [7 /*endfinally*/];
                                                        case 11: return [7 /*endfinally*/];
                                                        case 12:
                                                            commands = JSON.parse(allData.toString());
                                                            root.get(commands.eccoBoxName, JSON.stringify(commands.query), commands.eccoBoxClientId, commands.msgId).then(function (value) {
                                                                resp(commands.addr, "{\"type\": \"COMMAND\", \n                                                \"msgId\" : \"".concat(commands.msgId, "\",\n                                                \"eccoBoxName\": \"").concat(root.myEccoBoxName, "\", \n                                                \"data\": ").concat(JSON.stringify(value), ", \n                                                \"eccoBoxClientId\" : \"").concat(commands.eccoBoxClientId, "\"}"), n);
                                                            }, function (err) {
                                                                resp(commands.addr, "{\"type\": \"ERROR\",\n                                                \"msgId\" : \"".concat(commands.msgId, "\", \n                                                \"eccoBoxClientId\": \"").concat(commands.eccoBoxClientId, "\"}"), n);
                                                            });
                                                            return [2 /*return*/];
                                                    }
                                                });
                                            });
                                        });
                                    }
                                    catch (e) {
                                        console.error(e);
                                    }
                                    return [2 /*return*/];
                                });
                            });
                        });
                        this.node.multiaddrs.forEach(function (addr) {
                            if (!addr.toString().includes("127.0.0.1"))
                                _this.myAddr = "".concat(addr.toString(), "/p2p/").concat(_this.node.peerId.toB58String());
                            console.log("".concat(addr.toString(), "/p2p/").concat(_this.node.peerId.toB58String()));
                        });
                        process.on('SIGTERM', this.stop);
                        process.on('SIGINT', this.stop);
                        this.publishLoop();
                        this.delLoop();
                        //Antwort aus dem Netz an udsServer weiterleiten
                        return [4 /*yield*/, this.listener];
                    case 3:
                        //Antwort aus dem Netz an udsServer weiterleiten
                        _b.sent();
                        this.node.handle("/response/1.0.0", function (_a) {
                            var connection = _a.connection, stream = _a.stream, protocol = _a.protocol;
                            return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_b) {
                                    connection.on("error", function (err) {
                                        console.log(err);
                                    });
                                    try {
                                        pipe(stream.source, function (source) { return map(source, function (buf) { return toString(buf.slice()); }); }, function (source) {
                                            var source_2, source_2_1;
                                            var e_2, _a;
                                            return __awaiter(this, void 0, void 0, function () {
                                                var allData, chunk, e_2_1;
                                                return __generator(this, function (_b) {
                                                    switch (_b.label) {
                                                        case 0:
                                                            allData = "";
                                                            _b.label = 1;
                                                        case 1:
                                                            _b.trys.push([1, 6, 7, 12]);
                                                            source_2 = __asyncValues(source);
                                                            _b.label = 2;
                                                        case 2: return [4 /*yield*/, source_2.next()];
                                                        case 3:
                                                            if (!(source_2_1 = _b.sent(), !source_2_1.done)) return [3 /*break*/, 5];
                                                            chunk = source_2_1.value;
                                                            allData += chunk.toString();
                                                            _b.label = 4;
                                                        case 4: return [3 /*break*/, 2];
                                                        case 5: return [3 /*break*/, 12];
                                                        case 6:
                                                            e_2_1 = _b.sent();
                                                            e_2 = { error: e_2_1 };
                                                            return [3 /*break*/, 12];
                                                        case 7:
                                                            _b.trys.push([7, , 10, 11]);
                                                            if (!(source_2_1 && !source_2_1.done && (_a = source_2["return"]))) return [3 /*break*/, 9];
                                                            return [4 /*yield*/, _a.call(source_2)];
                                                        case 8:
                                                            _b.sent();
                                                            _b.label = 9;
                                                        case 9: return [3 /*break*/, 11];
                                                        case 10:
                                                            if (e_2) throw e_2.error;
                                                            return [7 /*endfinally*/];
                                                        case 11: return [7 /*endfinally*/];
                                                        case 12:
                                                            root.listener.respond(allData.toString());
                                                            return [2 /*return*/];
                                                    }
                                                });
                                            });
                                        });
                                    }
                                    catch (e) {
                                        console.error(e);
                                    }
                                    return [2 /*return*/];
                                });
                            });
                        });
                        return [2 /*return*/];
                }
            });
        });
    };
    //Menge der Publishes der letzten Sekunde publishen
    p2pNode.prototype.publishLoop = function () {
        return __awaiter(this, void 0, void 0, function () {
            var sleep, topic, topicCopy;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sleep = function (milliseconds) {
                            return new Promise(function (resolve) { return setTimeout(resolve, milliseconds); });
                        };
                        _a.label = 1;
                    case 1:
                        if (!true) return [3 /*break*/, 3];
                        return [4 /*yield*/, sleep(1000)];
                    case 2:
                        _a.sent();
                        for (topic in this.bulkPublish) {
                            topicCopy = this.bulkPublish[topic];
                            this.bulkPublish[topic] = "";
                            this.node.pubsub.publish(this.myEccoBoxName + "." + topic, fromString(topicCopy))["catch"](function (err) {
                                console.error(err);
                            });
                        }
                        return [3 /*break*/, 1];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    //Alle DELETION_TIMER Millisekunden zu alte Datensätze löschen
    //Überprüft jede Stunde (angegeben in DELETION_TIMER), 
    //ob zu alte Datensätze (definiert in Docker Compose) existieren und löscht diese.
    p2pNode.prototype.delLoop = function () {
        return __awaiter(this, void 0, void 0, function () {
            var sleep, _loop_1, this_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sleep = function (milliseconds) {
                            return new Promise(function (resolve) { return setTimeout(resolve, milliseconds); });
                        };
                        _loop_1 = function () {
                            var red;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0: return [4 /*yield*/, sleep(DELETION_TIMER)];
                                    case 1:
                                        _b.sent();
                                        red = this_1.redis;
                                        this_1.redis.processQuery(JSON.stringify(["KEYS", "*"])).then(function (keys) {
                                            for (var _i = 0, keys_1 = keys; _i < keys_1.length; _i++) {
                                                var topic = keys_1[_i];
                                                var date = new Date(new Date().setDate(new Date().getDate() - parseInt(process.env.DELETE_INTERVAL.replace('"', ''))));
                                                red.processQuery(JSON.stringify(["TS.DEL", topic.toString(), "0", date.getTime().toString()])).then(function (msg) {
                                                    console.log("Deleted " + msg + " expired entries");
                                                });
                                            }
                                        }, function (err) {
                                            console.error("Error occured whilst trying to get all keys");
                                        });
                                        return [2 /*return*/];
                                }
                            });
                        };
                        this_1 = this;
                        _a.label = 1;
                    case 1:
                        if (!true) return [3 /*break*/, 3];
                        return [5 /*yield**/, _loop_1()];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 1];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    //Im Netz eigene Informationen für Lookup Services teilen
    p2pNode.prototype.announceMyself = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(this.myEccoBoxName != null)) return [3 /*break*/, 3];
                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 1000); })];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.myAddr];
                    case 2:
                        _a.sent();
                        this.node.pubsub.publish("ORGA_ANNOUNCE", this.myAddr + " " + this.myEccoBoxName)["catch"](function (err) {
                            console.error(err);
                        });
                        _a.label = 3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    //Auf erhaltene Query antworten
    p2pNode.prototype.response = function (adr, obj, n) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                try {
                    //const { stream, protocol } = await 
                    n.dialProtocol(multiaddr(adr), "/response/1.0.0").then(function (_a) {
                        var stream = _a.stream, protocol = _a.protocol;
                        console.log(stream);
                        console.log(protocol);
                        pipe(stream_1.Readable.from(obj), function (source) { return (map(source, function (string) { return fromString(string); })); }, stream.sink);
                    }, function (error) {
                        console.error(error);
                    });
                }
                catch (e) {
                    console.log(e);
                }
                return [2 /*return*/];
            });
        });
    };
    p2pNode.prototype.getStatus = function () {
        var eccoBoxNames = Array();
        if (this.myEccoBoxName != null)
            eccoBoxNames.push(this.myEccoBoxName);
        eccoBoxNames.push.apply(eccoBoxNames, this.lookupService.getAllNames());
        return JSON.parse("{\n                \"type\": \"STATUS\", \n                \"P2P-Connection\": ".concat(this.isReady, ", \n                \"redis\": \"").concat(this.redis.ready, "\", \n                \"local\": \"").concat(this.myEccoBoxName, "\" , \n                \"nodes\": [").concat(JSON.stringify(eccoBoxNames), "]}"));
    };
    p2pNode.prototype.setListener = function (listener) {
        this.listener = listener;
    };
    //Anfragen an Redis Datenbank verarbeiten
    p2pNode.prototype.get = function (eccoBoxName, query, eccoBoxClientId, messageId) {
        return __awaiter(this, void 0, void 0, function () {
            var obj, err_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.isReady) {
                            console.log("Can`t process request, Libp2p has not startet");
                            return [2 /*return*/];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 7, , 8]);
                        if (!(this.myEccoBoxName == eccoBoxName)) return [3 /*break*/, 5];
                        if (!this.redis.ready) return [3 /*break*/, 3];
                        obj = JSON.parse(query.toString());
                        if (obj[0] == "TS.ADD") {
                            if (this.bulkPublish[obj[1]] == null) {
                                this.bulkPublish[obj[1]] = "".concat(obj[2], ",").concat(obj[3]) + ";";
                            }
                            else {
                                this.bulkPublish[obj[1]] += "".concat(obj[2], ",").concat(obj[3]) + ";";
                            }
                        }
                        return [4 /*yield*/, this.redis.processQuery(query.toString())];
                    case 2: return [2 /*return*/, _a.sent()];
                    case 3:
                        console.log("Redis-Client is not ready");
                        _a.label = 4;
                    case 4: return [3 /*break*/, 6];
                    case 5:
                        if (this.listener != null) {
                            if (this.lookupService.find(eccoBoxName).length > 0) {
                                this.dial("{\"eccoBoxClientId\": \"".concat(eccoBoxClientId, "\", \n                                    \"msgId\" : \"").concat(messageId, "\",\n                                    \"eccoBoxName\": \"").concat(eccoBoxName, "\", \n                                    \"addr\": \"").concat(this.myAddr, "\", \n                                    \"query\": ").concat(query, " }"), eccoBoxName);
                            }
                        }
                        return [2 /*return*/, "PLEASE WAIT"];
                    case 6: return [3 /*break*/, 8];
                    case 7:
                        err_1 = _a.sent();
                        console.log(err_1);
                        return [2 /*return*/, "ERROR"];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    p2pNode.prototype.unlisten = function (protocol) {
        this.node.unhandle(protocol);
    };
    p2pNode.prototype.subscribe = function (eccoBoxName, sensor) {
        var _this = this;
        if (!this.isReady) {
            console.log("Can`t process request, Libp2p has not startet");
            return;
        }
        if (!this.node.pubsub.getTopics().includes(eccoBoxName + "." + sensor)) {
            this.node.pubsub.subscribe(eccoBoxName + "." + sensor);
            this.node.pubsub.on(eccoBoxName + "." + sensor, function (msg) {
                _this.listener.subscribeMessage(eccoBoxName, sensor, toString(msg.data));
            });
        }
    };
    p2pNode.prototype.unsubscribe = function (eccoBoxName, sensor) {
        this.node.pubsub.unsubscribe(eccoBoxName + "." + sensor);
    };
    p2pNode.prototype.publish = function (sensor, msg) {
        this.node.pubsub.publish(this.myEccoBoxName + "." + sensor, fromString(msg))["catch"](function (err) {
            console.error(err);
        });
    };
    //An Peer im Netz eine Anfrage schicken
    p2pNode.prototype.dial = function (msg, eccoBoxName) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                try {
                    //{ stream, protocol } = await 
                    this.node.dialProtocol(this.lookupService.find(eccoBoxName)[0].maddr, "/query/1.0.0").then(function (_a) {
                        var stream = _a.stream, protocol = _a.protocol;
                        console.log(stream);
                        console.log(protocol);
                        /*stream.on('error', function(err){
                            console.error(err)
                        })*/
                        pipe(stream_1.Readable.from(msg), function (source) { return (map(source, function (string) { return fromString(string); })); }, stream.sink);
                    }, function (error) {
                        console.error(error);
                    });
                }
                catch (e) {
                    console.error("dialError " + e);
                }
                return [2 /*return*/];
            });
        });
    };
    return p2pNode;
}());
exports.p2pNode = p2pNode;
