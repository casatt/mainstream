# mainstream #

Very simple node application to filter specific tweets from twitter and serve them via a websocket connection.

## configuration ##
The credentials vor the twitter API are read via [nconf](https://github.com/indexzero/nconf) and can be stored in a *config.json* file with the following properties:
```json
{
	"twitter": {
		"consumer_key": "YOUR_CONSUMER_KEY",
		"consumer_secret": "YOUR_CONSUMER_SECRET",
		"token": "YOUR_TOKEN",
		"token_secret": "YOUR_TOKEN_SECRET"
	}
}
```
## websockets messages ##
These commands can be sent from a client to the server

```json
    {"track" : KEYWORD} // Will start tracking tweets with this keyord for this user
    {"untrack" : KEYWORD} // Will stop tracking tweets with this keyord for this user
```
