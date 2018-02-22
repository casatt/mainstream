# About mainstream-server #

It's a very simple node application to filter specific tweets from twitter, subscribe to them and serve them via a websocket connection.

## Configuration ##
The credentials vor the twitter API are read from the environment and **must** contain the following properties:
```
TWITTER_CONSUMER_KEY=***
TWITTER_CONSUMER_SECRET=***
TWITTER_TOKEN=***
TWITTER_TOKEN_SECRET=***
```
These are **optional**:
```
WEBSOCKET_PORT=3000  #default
```
## Websocket messages ##
These commands can be sent from a client to the server

**Subscribe** to tweets containing _KEYWORD_

```json
    {"track" : "KEYWORD"}
```

**Unsubscribe** to tweets containing _KEYWORD_

```json
    {"untrack" : "KEYWORD"}
```
