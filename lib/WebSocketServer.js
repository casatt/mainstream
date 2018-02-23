import EventEmitter from 'events';
import winston from 'winston';
import { Server } from 'uws';

export default class WebSocketServer extends EventEmitter {
  constructor() {
    super();
    this.server = new Server({ port: process.env.WEBSOCKET_PORT || 3000 });

    this.server.on('connection', ws => {
      winston.info('User joined');
      this.emit('track', { keyword: null, user: ws });
      ws.on('message', message => {
        this.onMessage(message, ws);
      });
      ws.on('close', () => this.onConnectionClose(ws));
    });
  }

  onMessage(message, user) {
    if (!message) {
      return;
    }
    let data;
    try {
      data = JSON.parse(message);
    } catch (e) {
      return;
    }
    const isTrack = !!data.track;
    const isUntrack = !!data.untrack;
    const isTrending = !!data.trending;
    const keyword = data.track || data.untrack;

    if (isTrack) {
      this.emit('track', { keyword, user });
    }
    if (isUntrack) {
      this.emit('untrack', { keyword, user });
    }
    if (isTrending) {
      const { lat, long } = data.trending;
      this.emit('trending', { lat, long, user });
    }
  }

  onConnectionClose(user) {
    winston.info('User left');
    this.emit('untrack', { keyword: null, user });
  }

  /* eslint-disable class-methods-use-this */
  send(message, user) {
    try {
      user.send(JSON.stringify(message));
    } catch (e) {
      // void
    }
  }

  broadcast(message, users = null) {
    this.server.clients.forEach(user => {
      if (Array.isArray(users) && !users.includes(user)) {
        return;
      }

      // Send tweet
      try {
        user.send(JSON.stringify(message));
      } catch (e) {
        winston.error(e);
      }
    });
  }
}
