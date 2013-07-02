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

Client.createPlayersList = function(words, one) {
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

    return one && players ? players[0] : players;
};

Client.prototype.getConnection = function() {
    return this.connection;
};

Client.prototype.connect = function(callback) {
    this.connection.begin(callback.bind(this));
};

Client.prototype.disconnect = function() {
    this.connection.end();
};

Client.prototype.adminEventsEnabled = function(enabled, callback) {
    this.connection.send('admin.eventsEnabled', enabled, callback ? callback.bind(this) : undefined);
};

Client.prototype.login = function(password, callback) {
    var $this = this;
    
    $this.connection.send('login.hashed', null, function(packet) {
        var md5 = Crypto.createHash('md5');
        var salt = new Buffer(packet.getWord(0), 'hex');
       
        md5.update(salt, 'binary');
        md5.update(password, 'ascii');

        $this.connection.send('login.hashed', [md5.digest('hex').toUpperCase()], callback.bind($this));
    });    
};

Client.prototype.logout = function(callback) {
    this.connection.send('logout', null, callback ? callback.bind(this) : undefined);
};

Client.prototype.quit = function(callback) {
    this.connection.send('quit', null, callback ? callback.bind(this) : undefined);
};

Client.prototype.serverInfo = function(callback) {
    this.connection.send('serverInfo', null, function(packet) {
        var words = packet.getWords();
        var info = {
            name:               words[0],
            playerCount:        words[1],
            maxPlayerCount:     words[2],
            gameMode:           words[3],
            map:                words[4],
            roundsPlayed:       words[5],
            roundsTotal:        words[6]
        };
        var count = parseInt(words[7]);

        info.scores = [];

        for (var i = 0; i < count; i++) {
            info.scores[i] = {
                teamId: i + 1, 
                score: words[8 + i]
            };
        }

        var offset = count + 7;

        info.targetScore = words[offset + 1]
        info.onlineState = words[offset + 2],
        info.ranked = words[offset + 3],
        info.punkBuster = words[offset + 4],
        info.hasGamePassword = words[offset + 5],
        info.serverUpTime = words[offset + 6],
        info.roundTime = words[offset + 7],
        info.gameIpAndPort = words[offset + 8],
        info.punkBusterVersion = words[offset + 9],
        info.joinQueueEnabled = words[offset + 10],
        info.region = words[offset + 11],
        info.closestPingSite = words[offset + 12],
        info.country = words[offset + 13],
        info.matchMakingEnabled = words[offset + 14]

        callback.call(this, info); 
    }.bind(this));  
};

Client.prototype.adminYell = function(message, options) {
    var parameters = [message];

    if (options && options.duration) {
        parameters.push(options.duration);
    }

    Client.addPlayerSubset(parameters, options);

    this.connection.send('admin.yell', parameters);
};

Client.prototype.adminSay = function(message, options) {
    var parameters = [message];

    Client.addPlayerSubset(parameters, options);
    
    this.connection.send('admin.say', parameters);
};

Client.prototype.adminKickPlayer = function(player, reason, callback) {
    this.connection.send('admin.kickPlayer', [player, reason], callback ? callback.bind(this) : undefined);    
};

Client.prototype.adminKickPlayer = function(player, reason, callback) {
    this.connection.send('admin.kickPlayer', [player, reason], callback ? callback.bind(this) : undefined);    
};

Client.prototype.adminKillPlayer = function(player, callback) {
    this.connection.send('admin.kickPlayer', player, callback ? callback.bind(this) : undefined);
};

Client.prototype.adminMovePlayer = function(player, team, squad, forceKill, callback) {
    this.connection.send('admin.kickPlayer', [player, team, squad, forceKill ? forceKill : false], callback ? callback.bind(this) : undefined);
};


Client.prototype.adminListPlayers = function(callback, options) {
    this._listPlayersCommand('admin.listPlayers', callback, options);
};

Client.prototype.listPlayers = function(callback, options) {
    this._listPlayersCommand('listPlayers', callback, options);
};

Client.prototype._listPlayersCommand = function(command, callback, options) {
    var parameters = [];

    Client.addPlayerSubset(parameters, options);

    var $this = this;

    this.connection.send(command, parameters, function(packet) {
        callback.call($this, Client.createPlayersList(packet.getWords()));
    });    
};

module.exports = Client;