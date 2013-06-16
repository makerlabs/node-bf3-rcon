node-bf3-rcon
=============
This is an early implementation of a very simple and lightweight Battlefield 3 RCon Client written in Node.js. 
Usage Example
-------------
```js
var Connection = require('./lib/Connection.js');
var Client = require('./lib/Client.js');

var connection = new Connection({ 'port': 'query_port', 'host': 'host_ip' });

// optional connection errors 
connection.on('error', function(e) {
  console.log(e);
});

// optional admin server events capturing
connection.on('admin.event', function(event, packet) {
  console.log('['+event+']');
  console.log(packet.getWords());
});

var client = new Client(connection);

// establishing connection to the server
client.connect(function() {
  var $this = this;
  
  $this.login('password', function() {    
    // enabling server events for the current connection
    $this.adminEventsEnabled(true);
    
    // say to all
    $this.adminSay('Text message');
    
    // say to player
    $this.adminSay('Text message', { 'player': 'player_name' });
    
    // say to team
    $this.adminSay('Text message', { 'team': 'team_id' });
    
    // say to squad
    $this.adminSay('Text message', { 'squad': 'squad_id' }); 
    
    // yell to all (accepts the same optional parameters as say command, default duration 10 seconds)
    $this.adminYell('Text message');
    
    // yell to all (set 3 seconds duration)
    $this.adminYell('Text message', { 'duration': 3 });     
    
    // fetching the current list of players
    $this.adminListPlayers(function(players) {
      console.log(players);
    }); 
    
    // fetching the current list of players for a given team
    $this.adminListPlayers(function(players) {
      console.log(players);
    }, { 'team': 'team_id' });
    
    // disconnecting the cient
    $this.disconnect();
  });
});
```
