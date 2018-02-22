/* @flow */
require('dotenv').config();

const Twit = require('twit');
const WebSocketServer = require('uws').Server;
const winston = require('winston');

if (!process.env.TWITTER_CONSUMER_KEY) {
  throw new Error('Twitter API credentials are missing.');
}

const wss = new WebSocketServer({ port: process.env.WEBSOCKET_PORT || 3000 });

const twitter = new Twit({
  consumer_key: String(process.env.TWITTER_CONSUMER_KEY).trim(),
  consumer_secret: String(process.env.TWITTER_CONSUMER_SECRET).trim(),
  access_token: String(process.env.TWITTER_TOKEN).trim(),
  access_token_secret: String(process.env.TWITTER_TOKEN_SECRET).trim(),
  timeout_ms: 60 * 1000
});

const userKeywordMap = new WeakMap();
const keywords = new Set();
let stream;

const onTweetMatch = tweet => {
  const matchingKeywords = Array.from(keywords).filter(keyword =>
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

const updateStream = () => {
  if (stream) {
    stream.stop();
    stream = null;
  }
  if (!keywords.size) {
    return;
  }
  stream = twitter.stream('statuses/filter', {
    track: Array.from(keywords)
  });

  stream.on('connect', () => {
    winston.log('connect');
  });

  stream.on('connected', () => {
    winston.log('connected');
  });

  stream.on('disconnect', () => {
    winston.log('disconnect');
  });

  stream.on('reconnect', () => {
    winston.log('reconnect');
  });

  stream.on('error', winston.error);

  stream.on('warning', winston.warn);

  stream.on('tweet', onTweetMatch);
};

const track = keyword => {
  keywords.add(keyword);
  updateStream();
};

const untrack = keyword => {
  keywords.delete(keyword);
  updateStream();
};

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
  const isKeywordTracked = keywords.has(keyword);
  const userKeywords = userKeywordMap.get(this) || [];
  const isKeywordTrackedByUser = userKeywords.includes(keyword);

  if (isTrack) {
    if (!isKeywordTrackedByUser) {
      userKeywordMap.set(this, [...userKeywords, keyword]);
    }
    if (!isKeywordTracked) {
      winston.info(`Track keyword: ${keyword}`);
      track(keyword);
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
      untrack(keyword);
    }
  }
}

function onWebSocketConnectionClose() {
  userKeywordMap.delete(this);
}

wss.on('connection', ws => {
  ws.on('message', onWebsocketMessage);
  ws.on('close', onWebSocketConnectionClose);
});
