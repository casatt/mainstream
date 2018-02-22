/* @flow */
import WebSocketServer from './WebSocketServer';
import TwitterStream from './TwitterStream';
import {
  getSubscribedUsers,
  getMatchingKeywords,
  track,
  untrack
} from './mapping';

require('dotenv').config();

const server = new WebSocketServer();
const twitter = new TwitterStream();

server.on('track', ({ keyword, user }) => {
  track(keyword, user);
  twitter.update();
});

server.on('untrack', ({ keyword, user }) => {
  untrack(keyword, user);
  twitter.update();
});

twitter.on('tweet', tweet => {
  const keywords = getMatchingKeywords(tweet);
  // Extend tweet
  const message = { ...tweet, keywords };
  // Get matching users
  const users = getSubscribedUsers(keywords);
  server.broadcast(message, users);
});
