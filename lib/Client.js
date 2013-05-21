var Net = require('net');
var Response = require('./Response.js');
var Request = require('./Request.js');
var Packet = require('./Packet.js');

var maxPacketSize = 16384;
var headerSize = 12;

var sequence = 0;
var packets = [];
var packetOffset = 0;
var headerOffset = 0;
var packetBuffer = new Buffer(maxPacketSize);
var packetSize = 0;
var client;

function waitForHeader(data, callback) {
    if (packetSize == 0) {
        if (packetOffset + data.length < headerSize) {
            data.copy(packetBuffer, packetOffset, 0);
            packetOffset += data.length;
        } else {
            data.copy(packetBuffer, packetOffset, 0, headerSize - packetOffset);
            packetOffset = headerSize;
            packetSize = Response.decodePacketSize(packetBuffer);

            return data.slice(packetOffset);
        }
        
    } else {
        return data;
    }

    return false;
}

function processBuffer(data, callback) {
   if (data = waitForHeader(data)) {
        var bodySize = packetSize - packetOffset;
        if (bodySize > data.length) {
            data.copy(packetBuffer, packetOffset, 0);
            packetOffset += data.length;
        } else {
            data.copy(packetBuffer, packetOffset, 0, bodySize);
            callback.call(this, packetBuffer.slice(0, packetSize));
            packetOffset = 0;
            packetSize = 0;
            packetBuffer.fill(0);
            
            if (data.length - bodySize > 0) {
                processBuffer(data.slice(bodySize), callback);
            }
        } 
    }  
}

exports.close = function() {
    client.end();
}

exports.send = function(command, arguments, callback) {
    var words = arguments ? [command].concat(arguments) : [command];
    var packet = new Packet({ "isResponse": false, "isFromServer": false, "sequence": sequence }, words);

    packets[sequence] = {
        "packet": packet,
        "callback": callback
    };  

    var buffer = Request.encodePacket(packet);

    client.write(buffer);

    sequence++;
}

exports.connect = function(parameters, callback, eventCallback) {
    var $this = this;

    client = Net.connect(parameters, function() { 
        callback.call($this);
    });

    client.on('data', function(data) {
        processBuffer(data, function(buffer) {
            var packet = Response.decodePacket(buffer);

            if (packet.isFromServer()) {
                if (eventCallback !== undefined) {
                    eventCallback.call($this, packet);
                }
            } else {
                var seq = packet.getSequence();

                if (packet.getWord(0) == "OK") {
                    if (packets[seq].callback !== undefined) {
                        packets[seq].callback.call($this, packet);
                        packets[seq] = undefined;                        
                    }
                } else {
                    console.log('Server returned: "'+packet.header.response+'"');
                    client.end();
                }
            }
        });
      
    });

    client.on('end', function() {
        console.log('client disconnected');
    });    
}