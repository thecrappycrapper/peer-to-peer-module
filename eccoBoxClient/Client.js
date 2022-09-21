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
exports.__esModule = true;
exports.clientClass = void 0;
var console_1 = require("console");
var path = require("path");
var uuid_1 = require("uuid");
var net = require('net');
var fs = require('fs');
var IPCPATH = path.join('/tmp/shared/', 'shared.sock');
var LOCAL_ECCO_BOX_NAME = "pi";
var sleep = function (milliseconds) {
    return new Promise(function (resolve) { return setTimeout(resolve, milliseconds); });
};
var clientClass = /** @class */ (function () {
    function clientClass() {
        this.errors = 0;
        this.checkForServer(false);
    }
    //Auf Starten des P2P Moduls warten
    clientClass.prototype.checkForServer = function (wait) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                if (!wait && fs.existsSync(IPCPATH))
                    this.setUp();
                else {
                    console.log('Waiting for P2P Module');
                    setTimeout(function () { _this.checkForServer(false); }, 3000);
                }
                return [2 /*return*/];
            });
        });
    };
    //Verwalten der UDS Verbindung 
    clientClass.prototype.setUp = function () {
        var _this = this;
        var chunks = [];
        var client = net.createConnection(IPCPATH);
        client.on('connect', function () {
            console.log('Connected to P2P Module');
            _this.executeScript(client);
        });
        //Zusammenfügen und Aufteilen empfangener Daten
        client.on('data', function (chunk) {
            var chunkArr = chunk.toString().split('End\n');
            if (chunk.toString == 'End\n') {
                _this.processData(Buffer.concat(chunks).toString());
                chunks = [];
            }
            else if (chunkArr.length > 1) {
                chunkArr.forEach(function (element, index) {
                    if (element.length > 0) {
                        if (index != chunkArr.length - 1) {
                            chunks.push(Buffer.from(element));
                            _this.processData(Buffer.concat(chunks).toString());
                        }
                        else {
                            if (chunk.toString().endsWith('End\n')) {
                                chunks.push(Buffer.from(element));
                                _this.processData(Buffer.concat(chunks).toString());
                            }
                            else
                                chunks.push(Buffer.from(element));
                        }
                    }
                    chunks = [];
                });
            }
            else {
                chunks.push(chunk);
            }
        });
        client.on('end', function () {
            chunks = [];
        });
        client.on('error', function (err) {
            if (err.code === 'ECONNREFUSED' || err.code === 'ENOENT') {
                _this.checkForServer(true);
            }
            else {
                (0, console_1.error)(err);
                _this.checkForServer(true);
            }
        });
        client.on('close', function (hadError) {
            console.log('close hadError: ' + hadError.toString());
        });
        client.on('drain', function () { return console.log('drain'); });
    };
    //Verarbeiten empfangener Daten
    clientClass.prototype.processData = function (combinedData) {
        var obj;
        try {
            obj = JSON.parse(combinedData);
        }
        catch (err) {
            this.errors++;
            console.error("Caught JSON Parse Error. Count: " + this.errors);
            return;
        }
        console.log("Nachricht------------------------:\n ");
        console.log(obj);
    };
    clientClass.prototype.send = function (msg, client) {
        client.write(msg + 'End\n');
    };
    //Wiederholt einen Command. Möglichkeit ein verhalten abhängig von interator zu definieren
    clientClass.prototype.cycle = function (client, sendFunction, commandFunction, interval) {
        return __awaiter(this, void 0, void 0, function () {
            var iterator;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        iterator = 0;
                        _a.label = 1;
                    case 1:
                        if (!true) return [3 /*break*/, 3];
                        return [4 /*yield*/, sleep(interval)];
                    case 2:
                        _a.sent();
                        sendFunction(commandFunction(iterator), client);
                        iterator++;
                        return [3 /*break*/, 1];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    //Testfall auswählen
    clientClass.prototype.executeScript = function (connection) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, sleep(5000)];
                    case 1:
                        _a.sent();
                        this.Btest5remote(connection);
                        return [2 /*return*/];
                }
            });
        });
    };
    //Lokale Tests---------------------------------------------
    //Speichert Datensatz und fragt diesen wieder ab
    clientClass.prototype.test1local = function (connection) {
        console.log(">>Saving temperature of 14 to TSDB");
        this.send(("\n            {\"type\": \"COMMAND\", \n            \"msgId\": \"".concat((0, uuid_1.v4)(), "\", \n            \"eccoBoxName\": \"").concat(LOCAL_ECCO_BOX_NAME, "\", \n            \"command\": ").concat(JSON.stringify(["TS.ADD", "temperatur", "\*", "14"]), "}")), connection);
        this.send(("\n            {\"type\": \"COMMAND\", \n            \"msgId\": \"".concat((0, uuid_1.v4)(), "\", \n            \"eccoBoxName\": \"").concat(LOCAL_ECCO_BOX_NAME, "\", \n            \"command\": ").concat(JSON.stringify(["TS.GET", "temperatur"]), "}")), connection);
    };
    //Speichert eine Reihe von Datensätzen und fragt diese ab
    clientClass.prototype.test2local = function (connection) {
        return __awaiter(this, void 0, void 0, function () {
            var i;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        i = 15;
                        _a.label = 1;
                    case 1:
                        if (!(i < 23)) return [3 /*break*/, 4];
                        this.send(("\n                {\"type\": \"COMMAND\", \n                \"msgId\": \"".concat((0, uuid_1.v4)(), "\", \n                \"eccoBoxName\": \"").concat(LOCAL_ECCO_BOX_NAME, "\", \n                \"command\": ").concat(JSON.stringify(["TS.ADD", "temperatur", "".concat(Date.now()), i.toString()]), "}")), connection);
                        return [4 /*yield*/, sleep(10)];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        i++;
                        return [3 /*break*/, 1];
                    case 4:
                        this.send(("\n            {\"type\": \"COMMAND\", \n            \"msgId\": \"".concat((0, uuid_1.v4)(), "\", \n            \"eccoBoxName\": \"").concat(LOCAL_ECCO_BOX_NAME, "\", \n            \"command\": ").concat(JSON.stringify(["TS.RANGE", "temperatur", "0", "2000000000000"]), "}")), connection);
                        return [2 /*return*/];
                }
            });
        });
    };
    //Tests über mehrere Edge Nodes--------------------------------------
    //Speichert alle 3s, holt diesen Datensatz alle
    //Holt sich weiteren lokalen Datensatz, der von anderer Node gespeichert wurde
    //Ausführende Edge Node: Pi
    clientClass.prototype.Atest1remote = function (connection) {
        this.cycle(connection, this.send, function (iterator) {
            return "{\"type\": \"COMMAND\", \n                    \"msgId\": \"".concat((0, uuid_1.v4)(), "\", \n                    \"eccoBoxName\": \"pi\", \n                    \"command\": ").concat(JSON.stringify(["TS.ADD", "temperatur", "".concat(Date.now()), iterator.toString()]), "}");
        }, 3000);
        this.cycle(connection, this.send, function (iterator) {
            return "{\"type\": \"COMMAND\", \n                    \"msgId\": \"".concat((0, uuid_1.v4)(), "\", \n                    \"eccoBoxName\": \"pi\", \n                    \"command\": ").concat(JSON.stringify(["TS.GET", "temperatur"]), "}");
        }, 3000);
        this.cycle(connection, this.send, function (iterator) {
            return "{\"type\": \"COMMAND\", \n                    \"msgId\": \"".concat((0, uuid_1.v4)(), "\", \n                    \"eccoBoxName\": \"pi\", \n                    \"command\": ").concat(JSON.stringify(["TS.GET", "distanz"]), "}");
        }, 3000);
    };
    //Speichert auf Node mit Namen pi Datensatz und holt sich Datensätze von zwei keys dieser Node
    //Ausführende Edge Node Name: nicht pi
    clientClass.prototype.Btest1remote = function (connection) {
        this.cycle(connection, this.send, function (iterator) {
            return "{\"type\": \"COMMAND\", \n                    \"msgId\": \"".concat((0, uuid_1.v4)(), "\", \n                    \"eccoBoxName\": \"pi\", \n                    \"command\": ").concat(JSON.stringify(["TS.ADD", "distanz", "".concat(Date.now()), (iterator * iterator).toString()]), "}");
        }, 3000);
        this.cycle(connection, this.send, function (iterator) {
            return "{\"type\": \"COMMAND\", \n                    \"msgId\": \"".concat((0, uuid_1.v4)(), "\", \n                    \"eccoBoxName\": \"pi\", \n                    \"command\": ").concat(JSON.stringify(["TS.GET", "temperatur"]), "}");
        }, 3000);
        this.cycle(connection, this.send, function (iterator) {
            return "{\"type\": \"COMMAND\", \n                    \"msgId\": \"".concat((0, uuid_1.v4)(), "\", \n                    \"eccoBoxName\": \"pi\", \n                    \"command\": ").concat(JSON.stringify(["TS.GET", "distanz"]), "}");
        }, 3000);
    };
    //-----Pub/Sub Testfall
    //Abonniert sich auf lokalen sensor
    //Ausführender Edge Node Name: pi
    clientClass.prototype.Atest2remote = function (connection) {
        this.send(("\n            {\"type\": \"SUB\",\n            \"eccoBoxName\": \"pi\", \n            \"sensor\": \"distanz\"}"), connection);
    };
    //Sendet auf andere Node Datensatz
    //Ausführender Edge Node Name: nicht pi
    clientClass.prototype.Btest2remote = function (connection) {
        this.cycle(connection, this.send, function (iterator) {
            return "{\"type\": \"COMMAND\", \n                    \"msgId\": \"".concat((0, uuid_1.v4)(), "\", \n                    \"eccoBoxName\": \"pi\", \n                    \"command\": ").concat(JSON.stringify(["TS.ADD", "distanz", "".concat(Date.now()), (iterator).toString()]), "}");
        }, 3000);
    };
    //Alle 10ms über Pub/Sub
    //Abonniert lokalen sensor
    //Ausführender Edge Node Name: pi
    clientClass.prototype.Atest3remote = function (connection) {
        this.send(("\n            {\"type\": \"SUB\",\n            \"eccoBoxName\": \"pi\", \n            \"sensor\": \"distanz\"}"), connection);
    };
    //Sendet alle 10ms Datensatz auf andere Node
    //Ausführender Edge Node Name: nicht pi
    clientClass.prototype.Btest3remote = function (connection) {
        this.cycle(connection, this.send, function (iterator) {
            return "{\"type\": \"COMMAND\", \n                    \"msgId\": \"".concat((0, uuid_1.v4)(), "\", \n                    \"eccoBoxName\": \"pi\", \n                    \"command\": ").concat(JSON.stringify(["TS.ADD", "distanz", "".concat(Date.now()), (iterator).toString()]), "}");
        }, 10);
    };
    //------Kontinuierlich 10ms Daten speichern und größere Menge von Daten abrufen
    //Holt Datensätze der letzten 10s eines lokalen Sensors
    //Ausführender Edge Node Name: pi
    clientClass.prototype.Atest4remote = function (connection) {
        this.cycle(connection, this.send, function (iterator) {
            return "\n            {\"type\": \"COMMAND\", \n            \"msgId\": \"".concat((0, uuid_1.v4)(), "\", \n            \"eccoBoxName\": \"pi\", \n            \"command\": ").concat(JSON.stringify(["TS.RANGE", "distanz", "".concat(Date.now() - 10000), "".concat(Date.now())]), "}");
        }, 10000);
    };
    //Sendet Daten auf entfernte Node
    //Ausführender Edge Node Name: nicht pi
    clientClass.prototype.Btest4remote = function (connection) {
        this.cycle(connection, this.send, function (iterator) {
            return "{\"type\": \"COMMAND\", \n                    \"msgId\": \"".concat((0, uuid_1.v4)(), "\", \n                    \"eccoBoxName\": \"pi\", \n                    \"command\": ").concat(JSON.stringify(["TS.ADD", "distanz", "".concat(Date.now()), (iterator).toString()]), "}");
        }, 10);
    };
    //-----Status Test
    //Fragt Status des Netzes + der lokalen Node ab.
    //Ausführender Edge Node Name: Pi
    clientClass.prototype.Atest5remote = function (connection) {
        this.cycle(connection, this.send, function (iterator) {
            return "{\"type\": \"STATUS\", \n                    \"msgId\": \"".concat((0, uuid_1.v4)(), "\"}");
        }, 5000);
    };
    //Macht nichts
    //Ausführender Edge Node Name: nicht pi
    clientClass.prototype.Btest5remote = function (connection) { };
    //Tests in größeren Netzen----------------------------------
    //Test6: Speichern und abrufen von allen, einer abonniert abwechselnd
    //Lokal Datensätze hinzufügen, bei der nächsten Node Datensätze alle 100ms abrufen
    //Ausführender Edge Node Name: node1
    clientClass.prototype.Atest6remote = function (connection) {
        this.cycle(connection, this.send, function (iterator) {
            return "{\"type\": \"COMMAND\", \n                    \"msgId\": \"".concat((0, uuid_1.v4)(), "\", \n                    \"eccoBoxName\": \"node1\", \n                    \"command\": ").concat(JSON.stringify(["TS.ADD", "sensorname", "".concat(Date.now()), (iterator).toString()]), "}");
        }, 100);
        this.cycle(connection, this.send, function (iterator) {
            return "{\"type\": \"COMMAND\", \n                    \"msgId\": \"".concat((0, uuid_1.v4)(), "\", \n                    \"eccoBoxName\": \"node2\", \n                    \"command\": ").concat(JSON.stringify(["TS.GET", "sensorname"]), "}");
        }, 100);
    };
    //Lokal Datensätze hinzufügen, bei der nächsten Node Datensätze alle 100ms abrufen
    //Ausführender Edge Node Name: node2
    clientClass.prototype.Btest6remote = function (connection) {
        this.cycle(connection, this.send, function (iterator) {
            return "{\"type\": \"COMMAND\", \n                    \"msgId\": \"".concat((0, uuid_1.v4)(), "\", \n                    \"eccoBoxName\": \"node2\", \n                    \"command\": ").concat(JSON.stringify(["TS.ADD", "sensorname", "".concat(Date.now()), (iterator).toString()]), "}");
        }, 100);
        this.cycle(connection, this.send, function (iterator) {
            return "{\"type\": \"COMMAND\", \n                    \"msgId\": \"".concat((0, uuid_1.v4)(), "\", \n                    \"eccoBoxName\": \"node3\", \n                    \"command\": ").concat(JSON.stringify(["TS.GET", "sensorname"]), "}");
        }, 100);
    };
    //Lokal Datensätze hinzufügen, bei der nächsten Node Datensätze alle 100ms abrufen
    //Ausführender Edge Node Name: node3
    clientClass.prototype.Ctest6remote = function (connection) {
        this.cycle(connection, this.send, function (iterator) {
            return "{\"type\": \"COMMAND\", \n                    \"msgId\": \"".concat((0, uuid_1.v4)(), "\", \n                    \"eccoBoxName\": \"node3\", \n                    \"command\": ").concat(JSON.stringify(["TS.ADD", "sensorname", "".concat(Date.now()), (iterator).toString()]), "}");
        }, 100);
        this.cycle(connection, this.send, function (iterator) {
            return "{\"type\": \"COMMAND\", \n                    \"msgId\": \"".concat((0, uuid_1.v4)(), "\", \n                    \"eccoBoxName\": \"node4\", \n                    \"command\": ").concat(JSON.stringify(["TS.GET", "sensorname"]), "}");
        }, 100);
    };
    //Lokal Datensätze hinzufügen, bei der nächsten Node Datensätze alle 100ms abrufen
    //Ausführender Edge Node Name: node4
    clientClass.prototype.Dtest6remote = function (connection) {
        this.cycle(connection, this.send, function (iterator) {
            return "{\"type\": \"COMMAND\", \n                    \"msgId\": \"".concat((0, uuid_1.v4)(), "\", \n                    \"eccoBoxName\": \"node4\", \n                    \"command\": ").concat(JSON.stringify(["TS.ADD", "sensorname", "".concat(Date.now()), (iterator).toString()]), "}");
        }, 100);
        this.cycle(connection, this.send, function (iterator) {
            return "{\"type\": \"COMMAND\", \n                    \"msgId\": \"".concat((0, uuid_1.v4)(), "\", \n                    \"eccoBoxName\": \"node5\", \n                    \"command\": ").concat(JSON.stringify(["TS.GET", "sensorname"]), "}");
        }, 100);
    };
    //Lokal Datensätze hinzufügen, bei der nächsten Node Datensätze alle 100ms abrufen
    //Ausführender Edge Node Name: node5
    clientClass.prototype.Etest6remote = function (connection) {
        this.cycle(connection, this.send, function (iterator) {
            return "{\"type\": \"COMMAND\", \n                    \"msgId\": \"".concat((0, uuid_1.v4)(), "\", \n                    \"eccoBoxName\": \"node5\", \n                    \"command\": ").concat(JSON.stringify(["TS.ADD", "sensorname", "".concat(Date.now()), (iterator).toString()]), "}");
        }, 100);
        this.cycle(connection, this.send, function (iterator) {
            return "{\"type\": \"COMMAND\", \n                    \"msgId\": \"".concat((0, uuid_1.v4)(), "\", \n                    \"eccoBoxName\": \"node1\", \n                    \"command\": ").concat(JSON.stringify(["TS.GET", "sensorname"]), "}");
        }, 100);
    };
    //Fragt zuerst den Status an, danach geht es die anderen Nodes durch und fragt jeweils Datensätze ab, 
    //subscribet sich kurzzeitig und unsubscribet sich danach
    //Ausführender Edge Node Name: node6
    clientClass.prototype.Ftest6remote = function (connection) {
        return __awaiter(this, void 0, void 0, function () {
            var currNodeNumber;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.send(("\n            {\"type\": \"STATUS\",\n            \"msgId\": \"".concat((0, uuid_1.v4)(), "\"}")), connection);
                        return [4 /*yield*/, sleep(5000)];
                    case 1:
                        _a.sent();
                        currNodeNumber = 0;
                        _a.label = 2;
                    case 2:
                        if (!true) return [3 /*break*/, 6];
                        return [4 /*yield*/, sleep(4000)];
                    case 3:
                        _a.sent();
                        console.log("Now getting the last 2s of Data at Node ".concat(currNodeNumber % 5 + 1));
                        this.send("\n                {\"type\": \"COMMAND\", \n                \"msgId\": \"".concat((0, uuid_1.v4)(), "\", \n                \"eccoBoxName\": \"node").concat(currNodeNumber % 5 + 1, "\", \n                \"command\": ").concat(JSON.stringify(["TS.RANGE", "sensorname", "".concat(Date.now() - 2000), "".concat(Date.now())]), "}"), connection);
                        return [4 /*yield*/, sleep(1000)];
                    case 4:
                        _a.sent();
                        console.log("Now Subscribing to Node ".concat(currNodeNumber % 5 + 1));
                        this.send(("\n                {\"type\": \"SUB\",\n                \"eccoBoxName\":\"node".concat(currNodeNumber % 5 + 1, "\", \n                \"sensor\": \"sensorname\"}")), connection);
                        return [4 /*yield*/, sleep(2000)];
                    case 5:
                        _a.sent();
                        this.send(("\n                {\"type\": \"UNSUB\",\n                \"eccoBoxName\":\"node".concat(currNodeNumber % 5 + 1, "\", \n                \"sensor\": \"sensorname\"}")), connection);
                        currNodeNumber = (currNodeNumber + 1);
                        return [3 /*break*/, 2];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    //Testfall: Komplexes Großes Netz
    //Lokal und entfernt Datensätze alle 100ms hinzufügen
    //Ausführender Edge Node Name: node1
    clientClass.prototype.Atest7remote = function (connection) {
        this.cycle(connection, this.send, function (iterator) {
            return "{\"type\": \"COMMAND\", \n                    \"msgId\": \"".concat((0, uuid_1.v4)(), "\", \n                    \"eccoBoxName\": \"node1\", \n                    \"command\": ").concat(JSON.stringify(["TS.ADD", "sensor1", "".concat(Date.now()), (iterator).toString()]), "}");
        }, 100);
        this.cycle(connection, this.send, function (iterator) {
            return "{\"type\": \"COMMAND\", \n                    \"msgId\": \"".concat((0, uuid_1.v4)(), "\", \n                    \"eccoBoxName\": \"node2\", \n                    \"command\": ").concat(JSON.stringify(["TS.ADD", "sensor1", "".concat(Date.now()), (iterator).toString()]), "}");
        }, 100);
    };
    //Fügt lokal alle 100ms Datensätze hinzu
    //Ausführender Edge Node Name: node2
    clientClass.prototype.Btest7remote = function (connection) {
        this.cycle(connection, this.send, function (iterator) {
            return "{\"type\": \"COMMAND\", \n                    \"msgId\": \"".concat((0, uuid_1.v4)(), "\", \n                    \"eccoBoxName\": \"node2\", \n                    \"command\": ").concat(JSON.stringify(["TS.ADD", "sensor2", "".concat(Date.now()), (iterator).toString()]), "}");
        }, 100);
    };
    //Fügt bei Node2 alle 100ms Datensätze hinzu
    //Ausführender Edge Node Name: node3
    clientClass.prototype.Ctest7remote = function (connection) {
        this.cycle(connection, this.send, function (iterator) {
            return "{\"type\": \"COMMAND\", \n                    \"msgId\": \"".concat((0, uuid_1.v4)(), "\", \n                    \"eccoBoxName\": \"node2\", \n                    \"command\": ").concat(JSON.stringify(["TS.ADD", "sensor3", "".concat(Date.now()), (iterator).toString()]), "}");
        }, 100);
    };
    //Fügt bei Node1 und Node2 alle 100ms Datensätze hinzu
    //Ausführender Edge Node Name: node4
    clientClass.prototype.Dtest7remote = function (connection) {
        this.cycle(connection, this.send, function (iterator) {
            return "{\"type\": \"COMMAND\", \n                    \"msgId\": \"".concat((0, uuid_1.v4)(), "\", \n                    \"eccoBoxName\": \"node2\", \n                    \"command\": ").concat(JSON.stringify(["TS.ADD", "sensor4", "".concat(Date.now()), (iterator).toString()]), "}");
        }, 100);
        this.cycle(connection, this.send, function (iterator) {
            return "{\"type\": \"COMMAND\", \n                    \"msgId\": \"".concat((0, uuid_1.v4)(), "\", \n                    \"eccoBoxName\": \"node1\", \n                    \"command\": ").concat(JSON.stringify(["TS.ADD", "sensor2", "".concat(Date.now()), (iterator).toString()]), "}");
        }, 100);
    };
    //Fügt bei Node1 und Node2 alle 100ms Datensätze hinzu
    //Ausführender Edge Node Name: node5
    clientClass.prototype.Etest7remote = function (connection) {
        this.cycle(connection, this.send, function (iterator) {
            return "{\"type\": \"COMMAND\", \n                    \"msgId\": \"".concat((0, uuid_1.v4)(), "\", \n                    \"eccoBoxName\": \"node2\", \n                    \"command\": ").concat(JSON.stringify(["TS.ADD", "sensor5", "".concat(Date.now()), (iterator).toString()]), "}");
        }, 100);
        this.cycle(connection, this.send, function (iterator) {
            return "{\"type\": \"COMMAND\", \n                    \"msgId\": \"".concat((0, uuid_1.v4)(), "\", \n                    \"eccoBoxName\": \"node1\", \n                    \"command\": ").concat(JSON.stringify(["TS.ADD", "sensor3", "".concat(Date.now()), (iterator).toString()]), "}");
        }, 100);
    };
    //Fragt zuerst den Status ab. Danach geht in Node1 und Node2 abwechselnd alle Sensoren durch, dabei
    //werden zuerst die Sensordaten der letzten 2s abgefragt, danach kurz subscribet und danach wieder unsubscribet.
    //Ausführender Edge Node Name: node6
    clientClass.prototype.Ftest7remote = function (connection) {
        return __awaiter(this, void 0, void 0, function () {
            var nodeNumber, sensorNumber;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.send(("\n            {\"type\": \"STATUS\",\n            \"msgId\": \"".concat((0, uuid_1.v4)(), "\"}")), connection);
                        return [4 /*yield*/, sleep(5000)];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2:
                        if (!true) return [3 /*break*/, 11];
                        nodeNumber = 1;
                        _a.label = 3;
                    case 3:
                        if (!(nodeNumber <= 2)) return [3 /*break*/, 10];
                        sensorNumber = 1;
                        _a.label = 4;
                    case 4:
                        if (!(sensorNumber <= ((nodeNumber == 0) ? 3 : 5))) return [3 /*break*/, 9];
                        return [4 /*yield*/, sleep(4000)];
                    case 5:
                        _a.sent();
                        console.log("Now getting the last 2s of Data at Node ".concat(nodeNumber));
                        this.send("\n                        {\"type\": \"COMMAND\", \n                        \"msgId\": \"".concat((0, uuid_1.v4)(), "\", \n                        \"eccoBoxName\": \"node").concat(nodeNumber, "\", \n                        \"command\": ").concat(JSON.stringify(["TS.RANGE", "sensor".concat(sensorNumber), "".concat(Date.now() - 2000), "".concat(Date.now())]), "}"), connection);
                        return [4 /*yield*/, sleep(1000)];
                    case 6:
                        _a.sent();
                        console.log("Now Subscribing to Node ".concat(nodeNumber, ", Sensor Number: ").concat(sensorNumber));
                        this.send(("\n                        {\"type\": \"SUB\",\n                        \"eccoBoxName\":\"node".concat(nodeNumber, "\", \n                        \"sensor\": \"sensor").concat(sensorNumber, "\"}")), connection);
                        return [4 /*yield*/, sleep(2000)];
                    case 7:
                        _a.sent();
                        this.send(("\n                        {\"type\": \"UNSUB\",\n                        \"eccoBoxName\":\"node".concat(nodeNumber, "\", \n                        \"sensor\": \"sensor").concat(sensorNumber, "\"}")), connection);
                        _a.label = 8;
                    case 8:
                        sensorNumber++;
                        return [3 /*break*/, 4];
                    case 9:
                        nodeNumber++;
                        return [3 /*break*/, 3];
                    case 10: return [3 /*break*/, 2];
                    case 11: return [2 /*return*/];
                }
            });
        });
    };
    return clientClass;
}());
exports.clientClass = clientClass;
