var http = require('http');

var server = http.createServer(function(req, res) {
  res.writeHead(200);
  res.end(JSON.stringify({
	  "conversationToken": "[]",
	  "expectUserResponse": true,
	  "expectedInputs": [
		{
		  "inputPrompt": {
			"richInitialPrompt": {
			  "items": [
				{
				  "simpleResponse": {
					"textToSpeech": "Teddy je t'aime"
				  }
				}
			  ]
			}
		  },
		  "possibleIntents": [
			{
			  "intent": "assistant.intent.action.TEXT"
			}
		  ],
		  "speechBiasingHints": [
			"$agenda",
			"$conversation-type"
		  ]
		}
	  ],
	  "responseMetadata": {
		"status": {},
		"queryMatchInfo": {}
	  }
	}));
});
server.listen(8080);