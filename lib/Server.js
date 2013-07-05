var Util = require('util');
var Events = require('events');
var Client = require('./Client.js');
var Constants = require('../data/constants.json');

function Server(client, configuration) {
    if (!client instanceof Client) {
        throw new TypeError('First argument must be a Client instance');
    }
    if (!configuration.password) {
        throw new Error('configuration.password is required');
    }  
    this._initConfiguration(configuration);  
    Events.EventEmitter.call(this); 
    this.client = client;
    this.status = Server.STATUS.DISCONNECTED;
    this.players = [];
    this.info = {};
    this.preset = null;
    this.updateTimer = null;
    this.vars = { gamePassword: false };

    var connection = this.client.getConnection();

    connection.on('admin.event', this._processEvents.bind(this));
    connection.on('command.error', this._processCommandErrors.bind(this));
}

Util.inherits(Server, Events.EventEmitter);

Server.STATUS = {
    DISCONNECTED: 'disconnected',
    CONNECTED: 'connected',
    WRONG_PASS: 'wrong rcon password'
};

Server.prototype.getPreset = function() {
    for (var preset in Constants.SERVER_PRESETS) {
        var vars = Constants.SERVER_PRESETS[preset];
        var set = true;
        for (var name in vars) {
            if (vars[name] !== this.vars[name]) {
                set = false;
                break;
            }
        }
        if (set) {
            return preset;
        }
    }

    return 'Custom';
}

Server.prototype.getVar = function(name, callback) {
    this.client.getConnection().send('vars.'+name, null, function(packet) {
        callback.call(this, name, packet.getWord(0));
    }.bind(this));
};

Server.prototype.setVar = function(name, value, callback) {
    this.client.getConnection().send('vars.'+name, value, callback ? callback.bind(this) : undefined);
};  

Server.prototype.connect = function(callback) {
    this.client.connect(function() {
        this.status = Server.STATUS.CONNECTED;

        this.client.login(this.configuration.password, function() {
            this._update();
            this._updateVars();    
            this.updateTimer = setInterval(this._update.bind(this), 10000);
            this.client.adminEventsEnabled(true);
        }.bind(this));
    }.bind(this));
};

Server.prototype.getInfo = function() {
    return this.info;
};

Server.prototype.updateInfo = function() {
    this.client.serverInfo(function(info) {
        this.info = info;
    }.bind(this));
};

Server.prototype.updatePlayers = function() {
    this.client.adminListPlayers(function(players) {
        var admins = this.configuration.admins;

        for (var i = 0; i < players.length; i++) {
            players[i].admin = admins[players[i].name] !== undefined;
        } 

        this.players = players;
    }.bind(this));
};

Server.prototype.getPlayers = function(sortBy, order) {
    if (sortBy && this.players.length) {
        if (!order) {
            order = 'desc';
        }
        if (isNaN(this.players[0][sortBy])) {
            this.players.sort(function(a, b) {
                if (a[sortBy] < b[sortBy]) {
                    return -1;
                } else if (a[sortBy] > b[sortBy]) {
                    return 1;
                } else {
                    return 0;
                }
            });
            if (order == 'desc') {
                this.players.reverse();
            }
        } else {
            this.players.sort(function(a, b) {
                return order == 'desc' ? b[sortBy] - a[sortBy] : a[sortBy] - b[sortBy];
            });
        }
    }
    return this.players;
};

Server.prototype.getClient = function() {
    return this.client;
};

Server.prototype._processEvents = function(event, packet) {
    if (this._events[event]) {
        var words = packet.getWords();

        switch (event) {
            case 'player.onSpawn':
                var result = { 'name': words[0], 'team': words[1] };
            break;

            case 'player.onKill':
                var result = { 'name': words[0], 'killed': words[1], 'weapon': words[2], 'headshoot': words[3] };
            break;

            case 'player.onChat':
                if (words[2] != 'all') {
                    var to = {};
                    to[words[2]] = words[3];
                } else {
                    var to = words[2];
                }

                var result = { 'player': words[0], 'text': words[1], 'to': to };
            break;

            case 'player.onLeave':
                var result = Client.createPlayersList(words.slice(1), true);
            break;

            case 'player.onAuthenticated':
                var result = { 'name': words[0] };
            break;

            case 'player.onJoin':
                var result = { 'name': words[0], 'guid': words[1] };
            break;

            case 'player.onSquadChange':
            case 'player.onTeamChange':
                var result = { 'name': words[0], 'team': words[1], 'squad': words[2] };
            break;

            default:
                var result = words[0];
            break;
        }

        this.emit(event, result);
    }
};

Server.prototype._processCommandErrors = function(command, response) {
    if (command == 'login.hashed' && response == 'InvalidPasswordHash') {
        this.status = Server.STATUS.WRONG_PASS;
    }  
};

Server.prototype._initConfiguration = function(configuration) {
    this.configuration = { 
        admins: {} 
    };
    
    for (var prop in configuration) {
        this.configuration[prop] = configuration[prop];
    }
};

Server.prototype._update = function() {
    this.updateInfo();
    this.updatePlayers();
};

Server.prototype._updateVars = function() {
    for (var i = 0; i < Constants.SERVER_VARS.length; i++) {
        this.getVar(Constants.SERVER_VARS[i], function(name, value) {
            this.vars[name] = value;
        }.bind(this));
        
    }
}

module.exports = Server;