/* @flow */
require('dotenv').config();

const Twitter = require('node-tweet-stream');
const WebSocketServer = require('uws').Server;
const winston = require('winston');

if (!process.env.TWITTER_CONSUMER_KEY) {
  throw new Error('Twitter API credentials are missing.');
}

const wss = new WebSocketServer({ port: process.env.WEBSOCKET_PORT || 3000 });
const twitter = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  token: process.env.TWITTER_TOKEN,
  token_secret: process.env.TWITTER_TOKEN_SECRET
});

const userKeywordMap = new WeakMap();
const keywords = [];

const isKeywordTrackedByAnyUser = keyword => {
  // wss clients is unfortunately not an array
  let match = false;
  wss.clients.forEach(user => {
    const userKeywords = userKeywordMap.get(user);
    if (userKeywords && userKeywords.includes(keyword)) {
      match = true;
    }
  });
  return match;
};

function onWebsocketMessage(message) {
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
  const keyword = data.track || data.untrack;
  const isKeywordTracked = keywords.includes(keyword);
  const userKeywords = userKeywordMap.get(this) || [];
  const isKeywordTrackedByUser = userKeywords.includes(keyword);

  if (isTrack) {
    if (!isKeywordTrackedByUser) {
      userKeywordMap.set(this, [...userKeywords, keyword]);
    }
    if (!isKeywordTracked) {
      winston.info(`Track keyword: ${keyword}`);
      twitter.track(keyword);
      keywords.push(keyword);
    }
  }

  if (isUntrack && isKeywordTracked) {
    if (isKeywordTrackedByUser) {
      userKeywordMap.set(
        this,
        userKeywords.filter(userKeyword => userKeyword !== keyword)
      );
    }
    if (!isKeywordTrackedByAnyUser(keyword)) {
      winston.info(`Untrack keyword: ${keyword}`);
      twitter.untrack(keyword);
      keywords.splice(keywords.indexOf(keyword), 1);
    }
  }
}

function onWebSocketConnectionClose() {
  userKeywordMap.delete(this);
}

const onTweetMatch = tweet => {
  const matchingKeywords = keywords.filter(keyword =>
    tweet.text.toLowerCase().includes(keyword)
  );

  wss.clients.forEach(user => {
    // Any intersection in the keywords being tracked by each user
    const userKeywords = userKeywordMap.get(user);
    if (
      !userKeywords ||
      !userKeywords.some(keyword => matchingKeywords.includes(keyword))
    ) {
      return;
    }
    // Send tweet + keywords as JSON
    try {
      user.send(
        JSON.stringify(
          Object.assign(tweet, {
            keywords: matchingKeywords
          })
        )
      );
    } catch (e) {
      winston.error(e);
    }
  });
};

wss.on('connection', ws => {
  ws.on('message', onWebsocketMessage);
  ws.on('close', onWebSocketConnectionClose);
});

twitter.on('tweet', onTweetMatch);

twitter.on('error', err => {
  winston.error(err);
});
