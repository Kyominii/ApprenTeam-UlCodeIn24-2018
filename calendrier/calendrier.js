"use strict";

var ressources = 173137; // TODO apprenteam <3
var nbWeeks = 1;

function getCalendrier(idGroupe,nbWeeks,dateParam) {
    var timestamp = createDate(getDateParam(dateParam),true).getTime()/1000;
    nbWeeks = Math.floor((timestamp-new Date()/1000)/(60*60*24*7))+1+nbWeeks;
    var calendrier;
    var request = require('sync-request');
    var body;
    var endLine;
    try {
        var result = request('GET', 'https://adeical.univ-lorraine.fr/jsp/custom/modules/plannings/anonymous_cal.jsp?resources=' + idGroupe + '&projectId=5&nbWeeks=' + nbWeeks);

        if(result.statusCode == 200){
            body = result.body.toString('utf-8');
            endLine = '\r\n';
        }else{
            console.log("Erreur : "+result.statusCode);
            body = getFromTextIfAdeFail();
            endLine = '\n';
        }
    }catch (e){
        console.log(e);
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

function getZerosInit(text,nbChiffres){
    while((""+text).length < nbChiffres){
        text = '0'+text;
    }
    return text;
}

function Calendrier(calendrier){
    this.cours = calendrier;
    this.cours.sort(function (a,b){
        return a.dateDebut-b.dateDebut;
    });

}

var TEXTE_JOUR = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
var TEXTE_MOIS = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','decembre'];

/**
 * Retourne un Object Date en fonction du texte en paramètre
 * @param dateTexte date à convertir (format : YYYYMMDDTHHMMSSZ) (T et Z sont des chars ISO)
 * @param heureLocale vrai si c'est l'heure locale, faux si c'est GTM+0
 * @returns {Date}
 */
function createDate(dateTexte,heureLocale){
    var locale = '';
    if(heureLocale){
        var x = new Date();
        locale = ""+(-x.getTimezoneOffset()*10/6);
        while(locale.length < 4){locale = '0'+locale;}
        locale = '+'+locale;
    }else{
        locale = '+0000';
    }
    return new Date(dateTexte.substr(0,4)+'-'+dateTexte.substr(4,2)+'-'+dateTexte.substr(6,5)+':'+dateTexte.substr(11,2)+':'+dateTexte.substr(13,2)+locale);
}

String.prototype.replaceAll  = function(find, replace){
    return this.replace(new RegExp(find, 'g'), replace);
};

function getDateParam(dateParam,heureParam){
    dateParam = dateParam.replaceAll('-','');
    if(!heureParam) {
        heureParam = "0000000";
    }else{
        heureParam = heureParam.replaceAll(':','');
    }
    return dateParam+'T'+heureParam+'Z';
}

function afficherHeure(minutes) {
    var heure = minutes/3600;
    var min = minutes%3600;
    if(heure == 0){
        return min+" minutes";
    }else{
        if(min == 0){
            return heure+"h";
        }else{
            return heure+"h"+min;
        }
    }
}

function Cours(nom,salle,dateFin,dateDebut,description){
    this.nom = nom;
    this.salle = salle;
    this.dateDebut = createDate(dateDebut);
    this.dateFin = createDate(dateFin);
    this.description = description;
}

Cours.prototype.getJourLong = function(date) {
    var chaine = TEXTE_JOUR[date.getDay()]+' '+date.getDate()+' '+TEXTE_MOIS[date.getMonth()];
    return chaine;
};

Cours.prototype.getHeureLongue = function(date) {
    var chaine = date.getHours()+' heures';
    if(date.getMinutes() != 0){
        chaine += ' '+date.getMinutes();
    }
    return chaine;
};

Cours.prototype.getDateLongue = function(date) {
    return this.getJourLong(date)+' à '+this.getHeureLongue(date);
};

Cours.prototype.dureeDuCours = function(){
    return (this.dateFin-this.dateDebut)/(1000);
};

/**
 * Retourne vrai si les deux dates sont le même jour
 * @param dateA date
 * @param dateB date
 * @param strict vrai : vérifie l'heure / faux : vérifie que le jour
 * @returns vrai si ce sont les mêmes dates
 */
function dateEgales (dateA,dateB,strict) {
    if(dateA.getFullYear() == dateB.getFullYear() && dateA.getMonth() == dateB.getMonth() && dateA.getDate() == dateB.getDate()) {
        return !(strict && dateA.getHours() != dateB.getHours());
    }
    return false;
}

function getPhraseDebut(date){
    var retour = 'Le ';
    var ojd = new Date();
    if(date.getFullYear() == ojd.getFullYear()) {
        if (date.getMonth() == ojd.getMonth()) {
            if (date.getDate() == ojd.getDate()) {
                retour = "Aujourd'hui, ";
            } else if (date.getDate() == ojd.getDate() + 1) {
                retour = "Demain, ";
            }
        }else if(date.getMonth() == ojd.getMonth() + 1){
            if (ojd.getDate() == new Date(date.getFullYear(), date.getMonth(), 0).getDate()) {
                retour = "Demain, ";
            }
        }
    }
    return retour += TEXTE_JOUR[date.getDay()]+' '+date.getDate()+' '+TEXTE_MOIS[date.getMonth()]+' ';
}

Calendrier.prototype = {
    cours : [],
    getCoursPeriode : function (dateDebut,dateFin) {
        var timestamp = createDate(getDateParam(dateFin),true).getTime()/1000;
        var needWeeks = Math.floor((timestamp-createDate(getDateParam(dateDebut),true).getTime()/1000)/(60*60*24*7))+1;
        this.cours = getCalendrier(ressources,needWeeks,dateDebut).cours;
        var calendrier = this;
        var res = [];
        var rechercheDebut = createDate(getDateParam(dateDebut),true);
        var rechercheFin = createDate(getDateParam(dateFin),true);
        this.cours.forEach(function(cours){
            if(cours.dateDebut.getFullYear() >= rechercheDebut.getFullYear()
                && cours.dateFin.getFullYear() <= rechercheFin.getFullYear()
                && cours.dateDebut.getMonth() >= rechercheDebut.getMonth()
                && cours.dateFin.getMonth() <= rechercheFin.getMonth()
                && cours.dateDebut.getDate() >= rechercheDebut.getDate()
                && cours.dateFin.getDate() <= rechercheFin.getDate()
            ){
                res.push(cours);
            }
        });
        return res;
    },
    getCoursDuJour : function (dateParam) {
        this.cours = getCalendrier(ressources,1,dateParam).cours;
        var calendrier = this;
        var res = [];
        var recherche = getDateParam(dateParam);
        this.cours.forEach(function(cours){
            if(dateEgales(cours.dateDebut,createDate(recherche,true))){
                res.push(cours);
            }
        });
        return res;
    },
    getCoursHeure : function (dateParam,heureParam) {
        this.cours = getCalendrier(ressources,1,dateParam).cours;
        var res = [];
        var recherche = getDateParam(dateParam,heureParam);
        this.cours.forEach(function(cours){
            if(dateEgales(cours.dateDebut,createDate(recherche,true),true)){
                res.push(cours);
            }
        });

        return res;
    },
    premierCoursDeLaJournee : function(dateParam){
        var cours = this.getCoursDuJour(dateParam);
        var date = createDate(getDateParam(dateParam));
        var retour = getPhraseDebut(date);
        if(cours.length == 0){
            retour += "vous n'avez pas de cours.";
        }else {
            retour += "vous commencez à "+cours[0].getHeureLongue(cours[0].dateDebut)+", vous pourriez mettre votre reveil 1H plus tôt !";
        }
        return retour;

    },
    dernierCoursDeLaJournee : function(dateParam){
        var cours = this.getCoursDuJour(dateParam);
        var date = createDate(getDateParam(dateParam));
        var retour = getPhraseDebut(date);
        if(cours.length == 0){
            retour += "vous n'avez pas de cours.";
        }else {
            retour += "vous terminez à "+cours[cours.length-1].getHeureLongue(cours[cours.length-1].dateFin);
        }
        return retour;

    },
    nbHeuresCoursDansLaPeriode : function(dateDebut,dateFin){
        var cours = this.getCoursPeriode(dateDebut,dateFin);
        var date = createDate(getDateParam(dateDebut));
        var retour = getPhraseDebut(date);
        if(cours.length == 0){
            retour += "vous n'avez pas de cours.";
        }else {
            var nbHeures = 0;
            cours.forEach(function (cours) {
                nbHeures += cours.dureeDuCours();
            });
            console.log(afficherHeure(nbHeures));
            retour += "vous commencez à "+cours[0].getHeureLongue(cours[0].dateDebut);
        }
        return retour;

    },
    afficherCoursJour : function(dateParam){
        var cours = this.getCoursDuJour(dateParam);
        var date = createDate(getDateParam(dateParam));
        var retour = getPhraseDebut(date);
        if(cours.length == 0){
            retour += "vous n'avez pas de cours.";
        }else {
            retour += "vous assisterez à :\n";
            var matin = false, aprem = false;
            cours.forEach(function (cour) {
                retour += "- ";
                if(cour.dateDebut.getHours() < 13 && !matin){
                    matin = true;
                    retour += "le matin, ";
                }else if(cour.dateDebut.getHours() >= 13 && !aprem){
                    aprem = true;
                    retour += "l'après-midi, ";
                }
                retour += 'à '+cour.getHeureLongue(cour.dateDebut)+', '+cour.nom
                if(cour.salle != ''){
                    retour += ' en salle '+cour.salle.replaceAll('_',' ');
                }
                retour += ".\r\n";
            });
        }
        console.log(retour);
        return retour;
    }
};

function parseCalendrier(output,endLine){
    var calendrier = [];
    var cours = output.split('BEGIN:VEVENT'+endLine);
    for(var i=1; i<cours.length; i++){
        var coursBrut = cours[i].split(endLine);
        var nom,salle,dateFin,dateDebut,description;
        for(var h=0; h<coursBrut.length; h++){
            var champs = coursBrut[h].split(':');
            if(champs.length >= 2) {
                switch (champs[0]) {
                    case 'DTSTART':
                        dateDebut = champs[1];
                        break;
                    case 'DTEND':
                        dateFin = champs[1];
                        break;
                    case 'SUMMARY':
                        nom = champs[1];
                        break;
                    case 'LOCATION':
                        salle = champs[1];
                        break;
                    case 'DESCRIPTION':
                        description = champs[1];
                        break;
                }
            }
        }
        calendrier[i] = new Cours(nom,salle,dateFin,dateDebut,description);
    }
    return new Calendrier(calendrier);
}

module.exports = Calendrier.prototype;


//var calendar = getCalendrier(ressources,nbWeeks,timestamp);

//var cours = calendar.getCoursHeure('2018-03-22','14:00:00');

console.log(Calendrier.prototype.nbHeuresCoursDansLaPeriode('2018-03-02','2018-04-07'));
//console.log(calendar.cours[2].getDateLongue(calendar.cours[2].dateFin));
//console.log(calendar.getCoursHeure(23,3,2018,16,0));*/