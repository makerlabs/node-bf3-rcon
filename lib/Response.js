var Packet = require('./Packet.js');

function decodeWords(buffer) {
    var words = [];
    var offset = 12;

    while (offset < buffer.length) {
        var length = buffer.readUInt32LE(offset);
        offset += 4;
        var word = buffer.toString('ascii', offset, offset + length);
        words.push(word);
        offset += (length + 1);
    }

    return words;
}

function decodeSequence(buffer) {
    var h = buffer.readUInt32LE(0);

    return {
        isFromServer: !!(h & 0x80000000),
        isResponse: !!(h & 0x40000000),
        sequence: (h & 0x3fffffff)
    };
}

exports.decodePacket = function(buffer) {
    var sequence = decodeSequence(buffer);
    var words = decodeWords(buffer);

    return new Packet(sequence, words, buffer.length);
};

exports.decodePacketSize = function(buffer) {
    return buffer.readUInt32LE(4);
};