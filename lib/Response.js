var ResponsePacket = require('./ResponsePacket.js');

function decodeWords(buffer, size) {
    var words = [];
    var offset = 12;

    while (offset < size) {
        var length = buffer.readUInt32LE(offset);
        offset += 4;
        var word = buffer.toString('ascii', offset, offset + length);
        if (word === 'true' || word === 'false') {
            word = word === 'true';
        } else if (!isNaN(word)) {
            word = Number(word);
        }
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

exports.decodePacket = function(buffer, size) {
    var sequence = decodeSequence(buffer);
    var words = decodeWords(buffer, size);

    return new ResponsePacket(sequence, words, size);
};

exports.decodePacketSize = function(buffer) {
    return buffer.readUInt32LE(4);
};