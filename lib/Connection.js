var Net = require('net');
var Util = require('util');
var Events = require('events');
var Response = require('./Response.js');
var Request = require('./Request.js');
var Packet = require('./Packet.js');

function Connection(parameters) {
    this.packetBuffer = new Buffer(Packet.MAX_SIZE);
    this.parameters = parameters; 
    Events.EventEmitter.call(this);          
}

Util.inherits(Connection, Events.EventEmitter);

Connection.prototype.begin = function(callback) {
    var $this = this;

    if (this.client !== undefined) {
        this.client.end();
    }

    this.packetSize = 0;
    this.sequence = 0;
    this.packets = [];
    this.packetOffset = 0;
    this.headerOffset = 0;    

    this.client = Net.connect(this.parameters, function() { 
        callback.call($this);
    }); 

    this.client.on('end', function() {
        $this.emit('end');
    }); 

    this.client.on('data', function(data) {
        $this.processBuffer(data, function(buffer) {
            var packet = Response.decodePacket(buffer);

            if (packet.isFromServer()) {
                $this.emit('admin.event', packet.getResponse(), packet);
            } else {
                var seq = packet.getSequence();
 
                if (packet.isOk()) {
                    if ($this.packets[seq].callback !== undefined) {
                        $this.packets[seq].callback.call($this, packet);                        
                    }
                } else {
                    $this.emit('error', {
                        'requestPacket': $this.packets[seq].packet,
                        'responsePacket': packet
                    });
                }
                 
                $this.packets[seq] = undefined; 
            }
        });
    });
};

Connection.prototype.waitForHeader = function(data) {
    if (this.packetSize == 0) {
        if (this.packetOffset + data.length < Packet.HEADER_SIZE) {
            data.copy(this.packetBuffer, this.packetOffset, 0);
            this.packetOffset += data.length;
        } else {
            data.copy(this.packetBuffer, this.packetOffset, 0, Packet.HEADER_SIZE - this.packetOffset);
            this.packetOffset = Packet.HEADER_SIZE;
            this.packetSize = Response.decodePacketSize(this.packetBuffer);

            return data.slice(this.packetOffset);
        }
        
    } else {
        return data;
    }

    return false;
};

Connection.prototype.processBuffer = function(data, callback) {
   if (data = this.waitForHeader(data)) {
        var bodySize = this.packetSize - this.packetOffset;
        if (bodySize > data.length) {
            data.copy(this.packetBuffer, this.packetOffset, 0);
            this.packetOffset += data.length;
        } else {
            data.copy(this.packetBuffer, this.packetOffset, 0, bodySize);
            callback.call(this, this.packetBuffer.slice(0, this.packetSize));
            this.packetOffset = 0;
            this.packetSize = 0;
            this.packetBuffer.fill(0);
            
            if (data.length - bodySize > 0) {
                this.processBuffer(data.slice(bodySize), callback);
            }
        } 
    }  
};

Connection.prototype.end = function() {
    this.client.end();
}; 

Connection.prototype.send = function(command, parameters, callback) {
    var words = parameters ? [command].concat(parameters) : [command];
    var packet = new Packet({ "isResponse": false, "isFromServer": false, "sequence": this.sequence }, words);

    this.packets[this.sequence] = {
        "packet": packet,
        "callback": callback
    };

    this.sequence++;
    this.client.write(Request.encodePacket(packet));
};

module.exports = Connection;