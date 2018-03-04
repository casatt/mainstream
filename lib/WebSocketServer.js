/* @flow */

import EventEmitter from 'events';
import winston from 'winston';
import { Server } from 'uws';

const sanitize = string =>
  encodeURIComponent(
    String(string)
      .trim()
      .toLowerCase()
  );

export default class WebSocketServer extends EventEmitter {
  server: any;

  constructor() {
    super();
    const port = process.env.WEBSOCKET_PORT || 443;
    this.server = new Server({ port });

    winston.info(`Websocket-Server is listening on port ${port}`);

    this.server.on('connection', ws => {
      winston.info('User joined');
      this.emit('track', { keyword: null, user: ws });
      ws.on('message', message => {
        this.onMessage(message, ws);
      });
      ws.on('close', () => this.onConnectionClose(ws));
    });
  }

  onMessage(message: string, user: Object) {
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
    const keyword = sanitize(data.track || data.untrack);

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

  onConnectionClose(user: Object) {
    winston.info('User left');
    this.emit('untrack', { keyword: null, user });
  }

  /* eslint-disable class-methods-use-this */
  send(message: Object, user: Object) {
    try {
      user.send(JSON.stringify(message));
    } catch (e) {
      winston.error(e);
    }
  }

  broadcast(message: Object, users: ?Array<Object>) {
    this.server.clients.forEach(user => {
      if (users && Array.isArray(users) && !users.includes(user)) {
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
