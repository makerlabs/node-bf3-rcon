var Util = require('util');
var Events = require('events');
var Client = require('./Client.js');

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
    this.updateTimer = null;

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

Server.prototype.connect = function(callback) {
    this.client.connect(function() {
        this.status = Server.STATUS.CONNECTED;
        this.client.login(this.configuration.password, function() {
            this._update();
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

Server.prototype.removePlayer = function(name) {
    var length = this.players;

    for (var i = 0; i < length; i++) {
        if (this.players[i].name == name) {
            this.players.splice(i, 1);
            break;
        }
    } 
};

Server.prototype.getPlayers = function() {
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

module.exports = Server;