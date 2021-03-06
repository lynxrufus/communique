'use strict';

var ipc = require('ipc');

var Connection = require('./connection');
var commands = require('./commands');
var utils = require('../../utils');

function Client(browserWindow) {
  this.browserWindow = browserWindow;
  this.buffers = {};
  this.connections = {};

  ipc.on('message:send', function (event, msg) {
    if (utils.isCommand(msg.message)) {
      commands.handle(this, msg.buffer.parent, msg.message);
    } else {
      this.connections[msg.buffer.parent].irc.send(
        msg.buffer.name, msg.message);
    }
  }.bind(this));
}

Client.prototype.connect = function (server, options) {
  if (!options.nick) {
    // TODO: Add options for a default nick
    options.nick = 'Communique';
  }

  if (!options.username) {
    // TODO: Add option for setting the username
    options.username = 'communique';
  }

  if (!options.realname) {
    // TODO: Add option for setting the real name
    options.realname = 'Communique User';
  }

  // Create a buffer for the server
  this.createBuffer({
    parent: server,
    name: 'server',
    switch: true
  });

  this.connections[server] = new Connection(this, server, options);
};

Client.prototype.bufferExists = function (args) {
  if (!args.parent) {
    args.parent = 'default';
  }

  if (!this.buffers[args.parent]) {
    return false;
  }

  if (this.buffers[args.parent].indexOf(args.name) === -1) {
    return false;
  }

  return true;
};

Client.prototype.createBuffer = function (args) {
  if (!args.parent) {
    args.parent = 'default';
  }

  if (!args.displayName) {
    args.displayName = args.name;
  }

  if (!this.buffers[args.parent]) {
    this.buffers[args.parent] = [];
  } else if (this.bufferExists({parent: args.parent, name: args.name})) {
    // Buffer already exists
    return false;
  }

  this.buffers[args.parent].push(args.name);

  this.browserWindow.webContents.send('buffer:create', args);

  return true;
};

Client.prototype.deleteBuffer = function (args) {
  if (!args.parent) {
    args.parent = 'default';
  }

  if (!this.buffers[args.parent]) {
    throw new Error('Parent ' + args.parent + ' does not exist');
  }

  var bufferIndex = this.buffers[args.parent].indexOf(args.name);
  if (bufferIndex === -1) {
    throw new Error('Buffer ' + args.name + ' does not exist');
  }
  this.buffers[args.parent].splice(bufferIndex, 1);

  // Remove the parent if it no longer contains buffers
  if (this.buffers[args.parent].length === 0) {
    this.buffers[args.parent] = undefined;
  }

  this.browserWindow.webContents.send('buffer:delete', args);
};

Client.prototype.writeToBuffer = function (args) {
  if (!args.parent) {
    args.parent = 'default';
  }

  if (!this.bufferExists({parent: args.parent, name: args.name})) {
    throw new Error(
      'Buffer ' + args.parent + '-' + args.name + ' does not exist');
  }

  this.browserWindow.webContents.send('message:received', {
    buffer: {
      parent: args.parent,
      name: args.name
    },
    message: {
      timestamp: Date.now(),
      message: args.message
    }
  });
};

module.exports = Client;
