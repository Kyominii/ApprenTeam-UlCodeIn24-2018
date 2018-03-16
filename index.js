var http = require('http');

var server = http.createServer(function(req, res) {
  res.writeHead(200);
  var json = {
	  "conversationToken": "[]",
	  "expectUserResponse": true,
	  "expectedInputs": [
		{
		  "inputPrompt": {
			"richInitialPrompt": {
			  "items": [
				{
				  "simpleResponse": {
					"textToSpeech": "COucou"
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
	  
	};
  res.end(JSON.stringify(json));
});
server.listen(8080);