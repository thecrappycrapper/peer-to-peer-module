"use strict";
exports.__esModule = true;
exports.udsServer = void 0;
var path = require("path");
var uuid_1 = require("uuid");
var net = require('net');
var fs = require('fs');
var IPCPATH = path.join('/tmp/shared/', 'shared.sock');
//Verwaltet die Subscriptions eines Ecco Box Clients
var Subscription = /** @class */ (function () {
    function Subscription(name) {
        this.sensors = new Array();
        this.eccoBoxName = name;
    }
    Subscription.prototype.addSensor = function (sensor) {
        this.sensors.push(sensor);
    };
    Subscription.prototype.removeSensor = function (sensor) {
        for (var i = 0; i < sensor.length; i++) {
            if (this.sensors[i] == sensor) {
                this.sensors.splice(i, 1);
                i--;
            }
        }
    };
    Subscription.prototype.containsSensor = function (sensor) {
        return this.sensors.includes(sensor);
    };
    return Subscription;
}());
//Verbindung eines Clients mit Verwaltung der Subscriptions
var EccoBoxClient = /** @class */ (function () {
    function EccoBoxClient(connect) {
        this.connection = connect;
        this.subscriptions = new Array();
        this.id = (0, uuid_1.v4)();
    }
    EccoBoxClient.prototype.addSubscriptions = function (eccoBoxName, sensor) {
        if (!this.isSubscribed(eccoBoxName, sensor)) {
            if (this.subscriptions.some(function (element) { return element.eccoBoxName == eccoBoxName; }))
                this.subscriptions.find(function (element) { return element.eccoBoxName == eccoBoxName; }).addSensor(sensor);
            else {
                var newSubscription = new Subscription(eccoBoxName);
                newSubscription.addSensor(sensor);
                this.subscriptions.push(newSubscription);
            }
            return "SUB SUCCESS";
        }
        return "ALREADY SUB";
    };
    EccoBoxClient.prototype.removeSensor = function (eccoBoxName, sensor) {
        this.subscriptions.forEach(function (element, index) {
            if (element.eccoBoxName == eccoBoxName && element.containsSensor(sensor)) {
                element.removeSensor(sensor);
                return "REMOVE SUCCESS";
            }
        });
        return "REMOVE UNSUCCESSFUL";
    };
    EccoBoxClient.prototype.isSubscribed = function (eccoBoxName, sensor) {
        var found = false;
        this.subscriptions.forEach(function (element) {
            if (element.eccoBoxName == eccoBoxName && element.containsSensor(sensor)) {
                found = true;
            }
        });
        return found;
    };
    return EccoBoxClient;
}());
//Schnittstelle zu Clients
var udsServer = /** @class */ (function () {
    function udsServer(p2p) {
        this.eccoBoxClients = new Array();
        this.errors = 0;
        this.p2p = p2p;
        this.setUpServer();
    }
    udsServer.prototype.setUpServer = function () {
        var _this = this;
        this.p2p.setListener(this);
        this.deleteSocketFile();
        var server = net.createServer();
        server.on('connection', function (socket) {
            var newEccoBoxClient = new EccoBoxClient(socket);
            var index = _this.eccoBoxClients.push(newEccoBoxClient) - 1;
            var chunks = [];
            socket.on('data', function (chunk) {
                console.log("Length of query: ".concat(chunk.toString().length));
                var chunkArr = chunk.toString().split('End\n');
                if (chunk.toString == 'End\n') {
                    _this.processQuery(Buffer.concat(chunks).toString(), newEccoBoxClient.id);
                    chunks = [];
                }
                else if (chunkArr.length > 1) {
                    chunkArr.forEach(function (element, index) {
                        if (element.length > 0) {
                            if (index != chunkArr.length - 1) {
                                chunks.push(Buffer.from(element));
                                _this.processQuery(Buffer.concat(chunks).toString(), newEccoBoxClient.id);
                            }
                            else {
                                if (chunk.toString().endsWith('End\n')) {
                                    chunks.push(Buffer.from(element));
                                    _this.processQuery(Buffer.concat(chunks).toString(), newEccoBoxClient.id);
                                }
                                else {
                                    chunks.push(Buffer.from(element));
                                }
                            }
                        }
                        chunks = [];
                    });
                }
                else {
                    chunks.push(chunk);
                }
            });
            socket.on('end', function () { return console.log('end'); });
            socket.on('close', function (hadError) {
                _this.eccoBoxClients.slice(index, 1);
                console.log('close hadError: ' + hadError.toString());
            });
            socket.on('connect', function () { return console.log('connect'); });
            socket.on('drain', function () { return console.log('drain'); });
        });
        server.on('error', function (err) {
            throw err;
        });
        server.listen({ path: IPCPATH }, function () {
            console.log('server bound');
        });
    };
    udsServer.prototype.deleteSocketFile = function () {
        try {
            fs.unlinkSync(IPCPATH);
            console.log("deleting " + IPCPATH);
        }
        catch (err) {
            if (err.code !== 'ENOENT')
                console.error(err);
        }
    };
    //Nachricht vom Client bearbeiten
    udsServer.prototype.processQuery = function (query, eccoBoxClientId) {
        var send = this.send;
        var client = this.getEccoBoxClientFromId(eccoBoxClientId);
        var obj;
        //console.log(`Length of query: ${query.length}`)
        try {
            obj = JSON.parse(query.toString());
        }
        catch (err) {
            this.errors++;
            console.error("Error with received command. Count: " + this.errors);
            return;
        }
        //Bei Command an irgendeine Redis Datenbank
        if (obj.type == "COMMAND") {
            this.p2p.get(obj.eccoBoxName, JSON.stringify(obj.command), eccoBoxClientId, obj.msgId).then(function (value) {
                send("{\"type\": \"COMMAND\", \n                    \"msgId\": \"".concat(obj.msgId, "\",\n                    \"eccoBoxName\": \"").concat(obj.eccoBoxName, "\", \n                    \"data\": \"").concat(value, "\"}"), client);
            }, function (err) {
                send("{\"type\": \"ERROR\",\n                    \"msgId\": \"".concat(obj.msgId, "\" \n                    \"eccoBoxName\": \"").concat(obj.eccoBoxName, "\"}"), client);
            });
        }
        //Bei subscribe
        else if (obj.type == "SUB") {
            this.p2p.subscribe(obj.eccoBoxName, obj.sensor);
            client.addSubscriptions(obj.eccoBoxName, obj.sensor);
        }
        //Bei unsubscribe
        else if (obj.type == "UNSUB") {
            client.removeSensor(obj.eccoBoxName, obj.sensor);
        }
        //Bei Anfrage von Statusnachricht
        else if (obj.type == "STATUS") {
            var tmp = this.p2p.getStatus();
            tmp.msgId = obj.msgId;
            send(JSON.stringify(tmp), client);
        }
    };
    //Behandeln von Antwort von Libp2p Instanz im Fall von Publish
    udsServer.prototype.subscribeMessage = function (eccoBoxName, sensor, msg) {
        var _this = this;
        this.eccoBoxClients.forEach(function (client) {
            if (client.isSubscribed(eccoBoxName, sensor)) {
                for (var _i = 0, _a = msg.split(";"); _i < _a.length; _i++) {
                    var element = _a[_i];
                    if (element.length > 0)
                        _this.send("{\"type\": \"SUB\", \n                                    \"eccoBoxName\": \"".concat(eccoBoxName, "\", \n                                    \"sensor\": \"").concat(sensor, "\", \n                                    \"data\": \"").concat(element, "\"}"), client);
                }
            }
        });
    };
    //Behandeln von Antwort von Libp2p Instanz im Fall einer Anfrage
    udsServer.prototype.respond = function (msg) {
        var obj = JSON.parse(msg.toString());
        var client = this.getEccoBoxClientFromId(obj.eccoBoxClientId);
        delete obj.eccoBoxClientId;
        this.send(JSON.stringify(obj), client);
    };
    udsServer.prototype.getEccoBoxClientFromId = function (Id) {
        var foundPeer = null;
        this.eccoBoxClients.forEach(function (element) {
            if (element.id == Id) {
                foundPeer = element;
            }
        });
        return foundPeer;
    };
    //An Client senden
    udsServer.prototype.send = function (msg, client) {
        client.connection.write(msg + 'End\n');
    };
    return udsServer;
}());
exports.udsServer = udsServer;
