/* @flow */
import 'babel-polyfill';

import WebSocketServer from './WebSocketServer';
import TwitterStream from './TwitterStream';
import {
  getSubscribedUsers,
  getMatchingKeywords,
  track,
  untrack
} from './mapping';

require('dotenv').config({
  path: process.env.NODE_ENV === 'development' ? '.env.development' : '.env'
});

const server = new WebSocketServer();
const twitter = new TwitterStream();

server.on('track', ({ keyword, user }) => {
  const needsUpdate = track(keyword, user);
  if (needsUpdate) {
    twitter.update();
  }
});

server.on('untrack', ({ keyword, user }) => {
  const needsUpdate = untrack(keyword, user);
  if (needsUpdate) {
    twitter.update();
  }
});

server.on('trending', async ({ lat, long, user }) => {
  let trends = [];
  if (lat && long) {
    trends = await twitter.getLocalTrends(lat, long);
  } else {
    trends = await twitter.getGlobalTrends();
  }
  server.send(trends, user);
});

twitter.on('tweet', tweet => {
  const keywords = getMatchingKeywords(tweet);
  // Extend tweet
  const message = { ...tweet, keywords };
  // Get matching users
  const users = getSubscribedUsers(keywords);
  server.broadcast(message, users);
});
