var Crypto = require('crypto');
var Connection = require('./Connection.js');

function Client(connection) {
    if (!connection instanceof Connection) {
        throw new TypeError('First argument must be a Connection instance');
    }

    this.connection = connection;
}

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

Client.createPlayersList = function(packet) {
    var words = packet.getWords();
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
        callback.call($this, Client.createPlayersList(packet));
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
        callback.call($this, Client.createPlayersList(packet));
    });
};

module.exports = Client;