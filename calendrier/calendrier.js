"use strict";

var ressources = 173137; // TODO apprenteam <3
var nbWeeks = 1;
var timestamp = 1521421200;


function getCalendrier(idGroupe,nbWeeks,timestamp) {
    var calendrier;
    var request = require('sync-request');
    var body;
    var endLine;
    try {
        var result = request('GET', 'https://adeical.univ-lorraine.fr/jsp/custom/modules/plannings/anonymous_cal.jsp?resources=' + idGroupe + '&projectId=5&nbWeeks=' + nbWeeks + '&firstWeek=' + timestamp);

        if(result.statusCode == 200){
            body = result.body.toString('utf-8');
            endLine = '\r\n';
        }else{
            body = getFromTextIfAdeFail();
            endLine = '\n';
        }
    }catch (e){
        body = getFromTextIfAdeFail();
        endLine = '\n';
    }finally {
        calendrier = parseCalendrier(body,endLine);
    }
    return calendrier;
}

function getFromTextIfAdeFail(){
    var fs = require('fs');
    var contents = fs.readFileSync('export_ade.txt', 'utf8');
    return contents;
}

function Calendrier(calendrier){
    this.cours = calendrier;
}

Calendrier.prototype = {
    cours : []
};

function parseCalendrier(output,endLine){
    var calendrier = [];
    var cours = output.split('BEGIN:VEVENT'+endLine);
    for(var i=1; i<cours.length; i++){
        var coursBrut = cours[i].split(endLine);
        calendrier[i] = [];
        for(var h=0; h<coursBrut.length; h++){
            var champs = coursBrut[h].split(':');
            if(champs.length >= 2) {
                switch (champs[0]) {
                    case 'DTSTART':
                        calendrier[i]['debut'] = champs[1];
                        break;
                    case 'DTEND':
                        calendrier[i]['fin'] = champs[1];
                        break;
                    case 'SUMMARY':
                        calendrier[i]['nom'] = champs[1];
                        break;
                    case 'LOCATION':
                        calendrier[i]['salle'] = champs[1];
                        break;
                    case 'DESCRIPTION':
                        calendrier[i]['description'] = champs[1];
                        break;
                }
            }
        }
    }
    return new Calendrier(calendrier);
}

var calendar = getCalendrier(ressources,nbWeeks,timestamp);

for(var i=0;i<calendar.cours.length;i++){
    console.log("COURS : ");
    console.log(calendar.cours[i]);
}