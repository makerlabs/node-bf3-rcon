function Packet(sequence, words, size) {
    this.size = size;
    this.sequence = sequence;
    this.words = words;
}

Packet.HEADER_SIZE = 12;
Packet.MAX_SIZE = 16384;

Packet.prototype.isFromServer = function() {
    return this.sequence.isFromServer;
};

Packet.prototype.isResponse = function() {
    return this.sequence.isResponse;
};

Packet.prototype.getSequence = function() {
    return parseInt(this.sequence.sequence);
};

Packet.prototype.getWords = function() {
    return this.words;
};

Packet.prototype.getWord = function(index) {
    return this.words[index];
};

Packet.prototype.getNumWords = function() {
    return this.words.length;
};

Packet.prototype.getSize = function() {
    if (this.size === undefined) {
        var size = Packet.HEADER_SIZE;
        var length = this.words.length;
        
        for (var i = 0; i < length; i++) {
           size += String(this.words[i]).length; 
        }

        this.size = size + length * 5;
    }

    return this.size;
};

module.exports = Packet;