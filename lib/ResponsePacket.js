var Util = require('util');
var Packet = require('./Packet.js');

function ResponsePacket(sequence, words, size) {
    Packet.call(this, sequence, words, size);
}

Util.inherits(ResponsePacket, Packet);

ResponsePacket.prototype.isOk = function() {
    return this.words[0] == 'OK';
};

ResponsePacket.prototype.getResponse = function() {
    return this.words[0];
};

ResponsePacket.prototype.getWords = function() {
    return Packet.prototype.getWords.call(this).slice(1);
};

ResponsePacket.prototype.getWord = function(index) {
    return Packet.prototype.getWord.call(this, index + 1);
};

ResponsePacket.prototype.getNumWords = function() {
    return Packet.prototype.getNumWords.call(this) - 1;
};

module.exports = ResponsePacket;