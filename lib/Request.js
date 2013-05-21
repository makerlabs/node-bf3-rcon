function encodeSequence(buffer, offset, packet) {

    var h = packet.getSequence() & 0x3fffffff;

    if(packet.isFromServer()) {
        h += 0x80000000
    }

    if(packet.isResponse()) {
        h += 0x40000000
    }

    return offset + 4;
}

function encodeWords(buffer, offset, packet) {
    packet.getWords().forEach(function(word) {
        word = String(word);
        buffer.writeUInt32LE(word.length, offset);
        offset += 4;
        buffer.write(word, offset, false, 'ascii');
        offset += word.length;
        buffer.write('\0', offset, false, 'binary');
        offset ++;
    });

    return offset;      
}

function encodeInfo(buffer, offset, packet) {
    buffer.writeUInt32LE(packet.getSize(), offset);
    offset += 4;
    buffer.writeUInt32LE(packet.getNumWords(), offset);

    return offset + 4;
}


exports.encodePacket = function(packet) {
    var buffer = new Buffer(packet.getSize());
    var offset = 0;

    offset = encodeSequence(buffer, offset, packet);
    offset = encodeInfo(buffer, offset, packet);
    encodeWords(buffer, offset, packet);

    return buffer;
}