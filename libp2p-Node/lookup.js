"use strict";
exports.__esModule = true;
exports.lookupService = void 0;
//Eintrag eines Peers
var peerRefrence = /** @class */ (function () {
    function peerRefrence(maddr, name) {
        this.maddr = maddr;
        this.eccoBoxName = name;
    }
    return peerRefrence;
}());
var lookupService = /** @class */ (function () {
    function lookupService() {
        this.peerRefrences = new Array();
    }
    lookupService.prototype.find = function (eccoBoxName) {
        return this.peerRefrences.filter(function (element) {
            return element.eccoBoxName == eccoBoxName;
        });
    };
    lookupService.prototype.register = function (maddr, eccoBoxName) {
        var register = true;
        if (this.peerRefrences.some(function (element) { return element.maddr.equals(maddr); }))
            register = false;
        if (!this.peerRefrences.some(function (element) { return element.maddr.equals(maddr); })) {
            this.unregister(maddr.toString().substring(maddr.toString().lastIndexOf('/') + 1, maddr.toString().length));
            this.peerRefrences.push(new peerRefrence(maddr, eccoBoxName));
        }
        return register;
    };
    lookupService.prototype.unregister = function (peerId) {
        var INDEX = this.peerRefrences.findIndex(function (element) {
            return element.maddr.toString().substring(element.maddr.toString().lastIndexOf('/') + 1, element.maddr.toString().length) == peerId;
        });
        if (INDEX > -1)
            this.peerRefrences.splice(INDEX, 1);
    };
    lookupService.prototype.getAllNames = function () {
        var eccoBoxNames = new Array();
        this.peerRefrences.forEach(function (element) {
            eccoBoxNames.push(element.eccoBoxName);
        });
        return eccoBoxNames;
    };
    return lookupService;
}());
exports.lookupService = lookupService;
