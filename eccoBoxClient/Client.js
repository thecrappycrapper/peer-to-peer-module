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
    clientClass.prototype.setUp = function () {
        var _this = this;
        var chunks = [];
        var client = net.createConnection(IPCPATH);
        client.on('connect', function () {
            console.log('Connected to P2P Module');
            _this.executeScript(client);
        });
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
            }
        });
        client.on('close', function (hadError) {
            console.log('close hadError: ' + hadError.toString());
        });
        client.on('drain', function () { return console.log('drain'); });
    };
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
        if (obj.type == "Command") { // &&  parseInt(obj.data) % 1000 == 0){
            console.log("Combined------------------------\n: ");
            console.log(obj);
        }
        else if (obj.type == "SUB") { // &&  parseInt(obj.data.split(',')[0]) % 1000 == 0){
            console.log("Combined------------------------\n: ");
            console.log(obj);
        }
        else if (obj.type == "STATUS") {
            console.log("Combined------------------------\n: ");
            console.log(obj);
        }
    };
    clientClass.prototype.send = function (msg, client) {
        //const readable = Readable.from(msg + 'End\n')
        //readable.pipe(client, { end: false })
        client.write(msg + 'End\n');
    };
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
    //s((`{"type": "Command", "msgId": "${uuidv4()}", "eccoBoxName": "debian", "command": ${JSON.stringify(["TS.ADD", "temperatur", "\*", `${iterator.toString()}`])}}`), client)
    //s((`{"type": "Command", "msgId": "${uuidv4()}", "eccoBoxName": "debian", "command": ${JSON.stringify(["TS.ADD", "humidity", "\*", `${iterator.toString()}`])}}`), client)
    clientClass.prototype.executeScript = function (connection) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, sleep(5000)];
                    case 1:
                        _a.sent();
                        this.Btest4remote(connection);
                        return [2 /*return*/];
                }
            });
        });
    };
    clientClass.prototype.test1local = function (connection) {
        console.log(">>Saving temperature of 14 to TSDB");
        this.send(("\n            {\"type\": \"Command\", \n            \"msgId\": \"".concat((0, uuid_1.v4)(), "\", \n            \"eccoBoxName\": \"").concat(LOCAL_ECCO_BOX_NAME, "\", \n            \"command\": ").concat(JSON.stringify(["TS.ADD", "temperatur", "\*", "14"]), "}")), connection);
        this.send(("\n            {\"type\": \"Command\", \n            \"msgId\": \"".concat((0, uuid_1.v4)(), "\", \n            \"eccoBoxName\": \"").concat(LOCAL_ECCO_BOX_NAME, "\", \n            \"command\": ").concat(JSON.stringify(["TS.GET", "temperatur"]), "}")), connection);
    };
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
                        this.send(("\n                {\"type\": \"Command\", \n                \"msgId\": \"".concat((0, uuid_1.v4)(), "\", \n                \"eccoBoxName\": \"").concat(LOCAL_ECCO_BOX_NAME, "\", \n                \"command\": ").concat(JSON.stringify(["TS.ADD", "temperatur", "".concat(Date.now()), i.toString()]), "}")), connection);
                        return [4 /*yield*/, sleep(10)];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        i++;
                        return [3 /*break*/, 1];
                    case 4:
                        this.send(("\n            {\"type\": \"Command\", \n            \"msgId\": \"".concat((0, uuid_1.v4)(), "\", \n            \"eccoBoxName\": \"").concat(LOCAL_ECCO_BOX_NAME, "\", \n            \"command\": ").concat(JSON.stringify(["TS.RANGE", "temperatur", "0", "2000000000000"]), "}")), connection);
                        return [2 /*return*/];
                }
            });
        });
    };
    //--------Remote speichern Testfall
    //Speichern auf Pi, ausführen Debian
    clientClass.prototype.Atest1remote = function (connection) {
        this.cycle(connection, this.send, function (iterator) {
            return "{\"type\": \"Command\", \n                    \"msgId\": \"".concat((0, uuid_1.v4)(), "\", \n                    \"eccoBoxName\": \"pi\", \n                    \"command\": ").concat(JSON.stringify(["TS.ADD", "temperatur", "".concat(Date.now()), iterator.toString()]), "}");
        }, 3000);
        this.cycle(connection, this.send, function (iterator) {
            return "{\"type\": \"Command\", \n                    \"msgId\": \"".concat((0, uuid_1.v4)(), "\", \n                    \"eccoBoxName\": \"pi\", \n                    \"command\": ").concat(JSON.stringify(["TS.GET", "temperatur"]), "}");
        }, 3000);
        this.cycle(connection, this.send, function (iterator) {
            return "{\"type\": \"Command\", \n                    \"msgId\": \"".concat((0, uuid_1.v4)(), "\", \n                    \"eccoBoxName\": \"pi\", \n                    \"command\": ").concat(JSON.stringify(["TS.GET", "distanz"]), "}");
        }, 3000);
    };
    //Speichern und abrufen Pi, ausführen Pi
    clientClass.prototype.Btest1remote = function (connection) {
        this.cycle(connection, this.send, function (iterator) {
            return "{\"type\": \"Command\", \n                    \"msgId\": \"".concat((0, uuid_1.v4)(), "\", \n                    \"eccoBoxName\": \"pi\", \n                    \"command\": ").concat(JSON.stringify(["TS.ADD", "distanz", "".concat(Date.now()), (iterator * iterator).toString()]), "}");
        }, 3000);
        this.cycle(connection, this.send, function (iterator) {
            return "{\"type\": \"Command\", \n                    \"msgId\": \"".concat((0, uuid_1.v4)(), "\", \n                    \"eccoBoxName\": \"pi\", \n                    \"command\": ").concat(JSON.stringify(["TS.GET", "temperatur"]), "}");
        }, 3000);
        this.cycle(connection, this.send, function (iterator) {
            return "{\"type\": \"Command\", \n                    \"msgId\": \"".concat((0, uuid_1.v4)(), "\", \n                    \"eccoBoxName\": \"pi\", \n                    \"command\": ").concat(JSON.stringify(["TS.GET", "distanz"]), "}");
        }, 3000);
    };
    //-----Pub/Sub Testfall
    //Ausführen Debian
    clientClass.prototype.Atest2remote = function (connection) {
        this.send(("\n            {\"type\": \"SUB\",\n            \"eccoBoxName\": \"pi\", \n            \"sensor\": \"distanz\"}"), connection);
    };
    //Ausführen Pi
    clientClass.prototype.Btest2remote = function (connection) {
        this.cycle(connection, this.send, function (iterator) {
            return "{\"type\": \"Command\", \n                    \"msgId\": \"".concat((0, uuid_1.v4)(), "\", \n                    \"eccoBoxName\": \"pi\", \n                    \"command\": ").concat(JSON.stringify(["TS.ADD", "distanz", "".concat(Date.now()), (iterator).toString()]), "}");
        }, 3000);
    };
    //Alle 10ms über Pub/Sub
    //Ausführen Debian
    clientClass.prototype.Atest3remote = function (connection) {
        this.send(("\n            {\"type\": \"SUB\",\n            \"eccoBoxName\": \"pi\", \n            \"sensor\": \"distanz\"}"), connection);
    };
    //Ausführen Pi
    clientClass.prototype.Btest3remote = function (connection) {
        this.cycle(connection, this.send, function (iterator) {
            return "{\"type\": \"Command\", \n                    \"msgId\": \"".concat((0, uuid_1.v4)(), "\", \n                    \"eccoBoxName\": \"pi\", \n                    \"command\": ").concat(JSON.stringify(["TS.ADD", "distanz", "".concat(Date.now()), (iterator).toString()]), "}");
        }, 10);
    };
    //------Kontinuierlich 10ms Daten speichern und größere Menge von Daten abrufen
    //Ausführen Debian
    clientClass.prototype.Atest4remote = function (connection) {
        this.cycle(connection, this.send, function (iterator) {
            return "\n            {\"type\": \"Command\", \n            \"msgId\": \"".concat((0, uuid_1.v4)(), "\", \n            \"eccoBoxName\": \"pi\", \n            \"command\": ").concat(JSON.stringify(["TS.RANGE", "distanz", "".concat(Date.now() - 10000), "".concat(Date.now())]), "}");
        }, 10000);
    };
    //Ausführen Pi
    clientClass.prototype.Btest4remote = function (connection) {
        this.cycle(connection, this.send, function (iterator) {
            return "{\"type\": \"Command\", \n                    \"msgId\": \"".concat((0, uuid_1.v4)(), "\", \n                    \"eccoBoxName\": \"pi\", \n                    \"command\": ").concat(JSON.stringify(["TS.ADD", "distanz", "".concat(Date.now()), (iterator).toString()]), "}");
        }, 10);
    };
    clientClass.prototype.Atest5remote = function (connection) {
        this.cycle(connection, this.send, function (iterator) {
            return "{\"type\": \"Status\", \n                    \"msgId\": \"".concat((0, uuid_1.v4)(), "\"}");
        }, 5000);
    };
    clientClass.prototype.Btest5remote = function (connection) { };
    return clientClass;
}());
exports.clientClass = clientClass;
