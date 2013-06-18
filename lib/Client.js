var Crypto = require('crypto');
var Events = require('events');
var Util = require('util');
var Connection = require('./Connection.js');

function Client(connection) {
    if (!connection instanceof Connection) {
        throw new TypeError('First argument must be a Connection instance');
    }

    this.connection = connection;
    Events.EventEmitter.call(this); 

    var $this = this;

    this.connection.on('admin.event', function(event, packet) {
        $this._processServerEvents.call($this, event, packet);
    });
}

Util.inherits(Client, Events.EventEmitter);

Client.addPlayerSubset = function(parameters, options) {
    if (options && options.team) {
        parameters.push('team');
        parameters.push(options.team);
    } else if (options && options.squad) {
        parameters.push('squad');
        parameters.push(options.squad);        
    } else if (options && options.player) {
        parameters.push('player');
        parameters.push(options.player);           
    } else {
        parameters.push('all');
    }    
};

Client.createPlayersList = function(words) {
    var columns = [];
    var players = [];
    var numColumns = parseInt(words[0]);
    var numPlayers = parseInt(words[numColumns + 1]);
    var numRows = (numPlayers + 1) * numColumns;

    for (var c = 0; c < numColumns; c++) {
        columns[c] = words[c + 1];
    }

    for (var i = numColumns + 2; i < numRows; i+=numColumns) {
        var player = {};
        for (var c = 0; c < 8; c++) {
            player[columns[c]] = words[i + c];
        }
        players.push(player);
    }

    return players;
};

Client.prototype.connect = function(callback) {
    var $this = this;

    this.connection.begin(function() {
        callback.call($this);
    });
};

Client.prototype.disconnect = function() {
    this.connection.end();
};


Client.prototype.adminEventsEnabled = function(enabled) {
    this.connection.send('admin.eventsEnabled', [enabled ? 'true' : 'false']);
};

Client.prototype.login = function(password, callback) {
    var $this = this;
    
    $this.connection.send('login.hashed', null, function(packet) {
        var md5 = Crypto.createHash('md5');
        var salt = new Buffer(packet.getWord(0), 'hex');
       
        md5.update(salt, 'binary');
        md5.update(password, 'ascii');

        $this.connection.send('login.hashed', [md5.digest('hex').toUpperCase()], function(packet) {     
            callback.call($this);        
        });
       
    });    
}

Client.prototype.adminListPlayers = function(callback, options) {
    var parameters = [];

    Client.addPlayerSubset(parameters, options);

    var $this = this;

    this.connection.send('admin.listPlayers', parameters, function(packet) {
        callback.call($this, Client.createPlayersList(packet.getWords()));
    });
};

Client.prototype.adminYell = function(message, options) {
    var parameters = [message];

    if (options && options.duration) {
        parameters.push(options.duration);
    }

    Client.addPlayerSubset(parameters, options);

    this.connection.send('admin.yell', parameters);
}

Client.prototype.adminSay = function(message, options) {
    var parameters = [message];

    Client.addPlayerSubset(parameters, options);
    
    this.connection.send('admin.say', parameters);
}

Client.prototype.listPlayers = function(callback, options) {
    var parameters = [];

    Client.addPlayerSubset(parameters, options);

    var $this = this;

    this.connection.send('listPlayers', parameters, function(packet) {
        callback.call($this, Client.createPlayersList(packet.getWords()));
    });
};

Client.prototype._processServerEvents = function(event, packet) {
    if (this._events[event]) {

        switch (event) {
            case 'player.onLeave':
                var info = Client.createPlayersList(packet.getWords().slice(1));
                var result = info[0];
            break;
            case 'player.onJoin':
                var result = { 'name': packet.getWord(0), 'giud': packet.getWord(1) };
            break;
            case 'player.onSpawn':
                var result = { 'name': packet.getWord(0), 'team': packet.getWord(1) };
            break;
            case 'player.onKill':
                var result = { 'name': packet.getWord(0), 'killed': packet.getWord(1), 'weapon': packet.getWord(2), 'headshoot': packet.getWord(3) };
            break;


        }

        this.emit(event, result);
    }
};

module.exports = Client;