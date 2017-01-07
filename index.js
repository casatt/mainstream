const Twitter = require('node-tweet-stream');
const WebSocketServer = require('uws').Server;
const nconf = require('nconf');
const winston = require('winston');

nconf.defaults({
  websocket: {
    port: 3000
  }
})
.argv()
.env()
.file({
  file: './config.json'
});

if (!nconf.get('twitter')) {
  throw new Error('Twitter API credentials are missing.');
}

const wss = new WebSocketServer({ port: nconf.get('websocket:port') });
const twitter = new Twitter({
  consumer_key: nconf.get('twitter:consumer_key'),
  consumer_secret: nconf.get('twitter:consumer_secret'),
  token: nconf.get('twitter:token'),
  token_secret: nconf.get('twitter:token_secret')
});

const userKeywordMap = new WeakMap();
const keywords = [];

const isKeywordTrackedByAnyUser = (keyword) => {
  // wss clients is unfortunately not an array
  let match = false;
  wss.clients.forEach((user) => {
    const userKeywords = userKeywordMap.get(user);
    if (userKeywords && userKeywords.includes(keyword)) {
      match = true;
    }
  });
  return match;
};

function onWebsocketMessage(message) {
  const data = JSON.parse(message);
  const isTrack = data && !!data.track;
  const isUntrack = data && !!data.untrack;
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
      userKeywordMap.set(this, userKeywords.filter(userKeyword => userKeyword !== keyword));
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

function onTweetMatch(tweet) {
  const matchingKeywords = keywords.filter(keyword => tweet.text.toLowerCase().includes(keyword));

  wss.clients.forEach((user) => {
    // Any intersection in the keywords being tracked by each user
    const userKeywords = userKeywordMap.get(user);
    if (!userKeywords || !userKeywords.some(keyword => matchingKeywords.includes(keyword))) {
      return;
    }
    // Send tweet + keywords as JSON
    try {
      user.send(JSON.stringify(Object.assign(tweet, {
        keywords: matchingKeywords
      })));
    } catch (e) {
      winston.error(e);
    }
  });
}

wss.on('connection', (ws) => {
  ws.on('message', onWebsocketMessage);
  ws.on('close', onWebSocketConnectionClose);
});

twitter.on('tweet', onTweetMatch);

twitter.on('error', (err) => {
  winston.error(err);
});
