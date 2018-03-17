'use strict';

const ConversationV1 = require('watson-developer-cloud/conversation/v1');
const ADE = require('./calendrier/calendrier');
const redis = require('redis');
const allocine = require('allocine-api');
const sync = require('sync');

var express = require('express');
var app = express();
var port = process.env.PORT || 8080;
var bodyParser = require('body-parser');

var memory = {};
var precedentContext = [];

require('dotenv').config();

app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

// Using some globals for now
let conversation;
let context;
let Wresponse;

function errorResponse(reason) {
	return {
	  version: '1.0',
	  response: {
		shouldEndSession: true,
		outputSpeech: {
		  type: 'PlainText',
		  text: reason || 'An unexpected error occurred. Please try again later.'
		}
	  }
	};
  }

function initClients() {
	return new Promise(function(resolve, reject) {
	// Connect a client to Watson Conversation
	conversation = new ConversationV1({
		password: process.env.WCS_Password,
        username: process.env.WCS_Username,
		version_date: '2016-09-20'
	});
	console.log('Connected to Watson Conversation');
	resolve("Done");
  });
  }

function conversationMessage(request, workspaceId) {
	return new Promise(function(resolve, reject) {
	  const input = request.inputs[0] ? request.inputs[0].rawInputs[0].query : 'start skill';
	  //context.scenario6 = true;
		var test = {
			input: { text: input },
			workspace_id: workspaceId,
			context: context
			//context: {}
		  };
	  console.log("Input" + JSON.stringify(test,null,2));
	  conversation.message(
		{
		  input: { text: input },
		  workspace_id: workspaceId,
		  context: context
		},
		function(err, watsonResponse) {
		  if (err) {
			console.error(err);
			reject('Error talking to Watson.');
		  } else {
			console.log(watsonResponse);
			context = watsonResponse.context; // Update global context
			resolve(watsonResponse);
		  }
		}
	  );
	});
  }

function getSessionContext(sessionId) {
	console.log('sessionId: ' + sessionId);
	return new Promise(function(resolve, reject) {
	  context = memory[sessionId];
	  resolve();
	});
  }

  function saveSessionContext(sessionId) {
		console.log('---------');
		console.log('Begin saveSessionContext ' + sessionId);

		if(context){
			memory[sessionId] = context;
		}
  }

  function clearSessionContext() {
	context = {};
  }

function callADE(response) {

	var text = "";

	switch(response.output.code) {
		case "scenario1_journee":
			if(response.entities[0] !== undefined) {
                text = ADE.afficherCoursJour(response.entities[0].value);
			}
			break;

        case "scenario2_heuresPeriode":
        	if((response.context.date_1 !== undefined) && (response.context.date_2 !== undefined)) {
                text = ADE.nbHeuresCoursDansLaPeriode(response.context.date_1, response.context.date_2);
			}
			break;

        case "scenario3_reveil":
        	if(response.entities[0] !== undefined) {
        		text = ADE.premierCoursDeLaJournee(response.entities[0].value);
			}
			break;

        case "scenario4_finDeJournee":
        	if(response.entities[0] !== undefined) {
                text = ADE.dernierCoursDeLaJournee(response.entities[0].value);
			}
			break;

		case "scenario5_prochainCours":
			text = ADE.afficherProchainCours();
			break;

		case "scenario6_quelCoursDate":
			if((response.context.date_4 !== undefined) && (response.context.time_1 !== undefined)) {
				precedentContext[response.output.code] = context;
				text = ADE.afficherCoursHeure(response.context.date_4, response.context.time_1);
			}
			break;

		case  "scenario7_quelleDuree":
			var prece = precedentContext["scenario6_quelCoursDate"];
			if((prece !== undefined) && (prece.date_4 !== undefined) && (prece.time_1 !== undefined)) {
                text = ADE.afficherDureeCoursHeure(prece.date_4, prece.time_1);
			} else {
				text = "Il n'y a pas de contexte à cette question";
			}
			break;

		case "scenario8_quelProf":
			var prece = precedentContext["scenario6_quelCoursDate"];
            if(prece !== undefined) {
                text = ADE.afficherEnseignant(prece.date_4, prece.time_1);
            } else {
            	text = "Il n'y a pas de contexte à cette question";
			}
			break;

        case "scenario9_coursSuivant":
            if(precedentContext["scenario6_quelCoursDate"] !== undefined) {
                var object = ADE.afficherProchainCours(false,precedentContext["scenario6_quelCoursDate"].date_4, null, precedentContext["scenario6_quelCoursDate"].time_1);
                text = object.text;
                precedentContext["scenario6_quelCoursDate"] = context;
                precedentContext["scenario6_quelCoursDate"].date_4 = object.date;
                precedentContext["scenario6_quelCoursDate"].time_1 = object.heure;
            }
            break;

        case "scenario10_examen":
        if((response.entities[1] !== undefined) && (response.entities[2] !== undefined)) {
            text = ADE.afficherProchainCours(true, response.entities[1].value, response.entities[2].value);
        } else {
            text = ADE.afficherProchainCours(true);
        }
        break;

        case "scenario11_groupe":
            if((response.context.EcoleList !== undefined) && (response.context.anneeList !== undefined) && (response.context.groupeList !== undefined)) {
                text = ADE.afficherProchainCoursAvecGroupe(response.context.EcoleList,response.context.anneeList,response.context.groupeList);
            }
            break;

		case "scenario12_coursPrecedent":
			console.log('----');
			console.log(response);
            if((response.entities[1] !== undefined) && (response.entities[2] !== undefined)) {
                var object2 = ADE.afficherCoursPrecendent(response.entities[1].value, response.entities[2].value);
            	text = object2.text;
                precedentContext["scenario6_quelCoursDate"] = context;
                precedentContext["scenario6_quelCoursDate"].date_4 = object2.date;
                precedentContext["scenario6_quelCoursDate"].time_1 = object2.heure;
            }
			break;

		case "scenario_changer_groupe":
			if((response.context.ecole !== undefined) && (response.context.number !== undefined) && (response.context.classe !== undefined)) {
				text = ADE.setGroupe(response.context.ecole, response.context.number, response.context.classe);
                precedentContext["scenario6_quelCoursDate"] = {};
			}
			break;

		case "login":
			if(response.context.login !== undefined) {
				text = ADE.getLogin(response.context.login);
			}
			break;

		case "inscription":
			if(response.context.inscription !== undefined) {
				text = ADE.saveLogin(response.context.inscription);
			}
			break;

		default:
			text = "Je ne sais pas quoi vous répondre";
			break;
	}

	if(text !== "") {
		clearSessionContext();
	}
	return text;

}

let cinemas = {
	"Cameo Commanderie": "P0073",
	"UGC Ludres": "P0090",
	"Cameo Saint Sebastien": "P0108",
	"Kinepolis": "P1665"
};

function getFilmCinema(idCinema) {
    //return new Promise(function(resolve, reject) {
	var text = "";
	allocine.api.sync('movielist', {
            code: idCinema,
            count: 1,
            filter: "nowshowing",
            format: "json"
        }, (error, results) => {
            if (error) {
                console.log('Error : ' + error);
                //reject();
            }

            console.log('Voici les données retournées par l\'API Allociné:' + results.feed.movie[0].title);
            text = "Je vous conseille d'aller voir " + results.feed.movie.title;
        });

	console.log(text);
	sleep(1);
	return text;
}

function sendResponse(response, resolve) {

    console.log(response.output.code);
	  // Combine the output messages into one message.
	  var output;
	  if(response.output.code) {
	  	output = callADE(response);
	  } else {
	  	output = response.output.text.join(' ');
	  }
	  var resp = {
		conversationToken: null,
		expectUserResponse: true,
		expectedInputs: [
			{
				inputPrompt: {
					richInitialPrompt: {
						items: [
							{
								simpleResponse: {
									textToSpeech: output,
									displayText: output
								}
							}
						],
						suggestions: []
					}
				},
				possibleIntents: [
					{
						intent: 'actions.intent.TEXT'
					}
				]
			}
		]
	};

		Wresponse =  resp;
		// Resolve the main promise now that we have our response
		resolve(resp);
	}

app.post('/api/google4IBM', function(args, res) {
	return new Promise(function(resolve, reject) {
	  const request = args.body;
	  console.log("Google Home is calling");
	  console.log(JSON.stringify(request,null,2));
	  const sessionId = args.body.conversation.conversationId;
	  initClients()
	  .then(() => getSessionContext(sessionId))
	  .then(() => conversationMessage(request, process.env.workspace_id))
	  .then(actionResponse => sendResponse(actionResponse, resolve))
	  .then(data => {
		res.setHeader('Content-Type', 'application/json');
		res.append("Google-Assistant-API-Version", "v2");
		res.json(Wresponse);
	})
	.then(() => saveSessionContext(sessionId))
	.catch(function (err) {
		console.error('Erreur !');
		console.dir(err);
	});
	});
  });

/*
	res.setHeader('Content-Type', 'application/json')
	res.append("Google-Assistant-API-Version", "v2")
*/

// start the server
app.listen(port);
console.log('Server started! At http://localhost:' + port);