"use strict";

var ressources = 153989; // TODO apprenteam <3
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
        console.log(body);
        endLine = '\n';
    }finally {
        calendrier = parseCalendrier(body,endLine);
    }
    return calendrier;
}

function getFromTextIfAdeFail(){
    var fs = require('fs');
    var contents = fs.readFileSync('calendrier/export_ade.txt', 'utf8');
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
var TEXTE_ANNEE = ['premiere','deuxieme','troisieme','quatrieme','cinquieme'];

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
    var heure = minutes/60;
    var min = minutes%60;
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

function getMinDate(dateTexte){
    var date = createDate(getDateParam(dateTexte),true);
    if(date < new Date()) {
       return new Date();
    }else{
        return date;
    }
}

function Cours(nom,salle,dateFin,dateDebut,description){
    this.nom = nom;
    this.salle = salle;
    this.dateDebut = createDate(dateDebut);
    this.dateFin = createDate(dateFin);
    this.description = description;
    this.enseignant = description.split("\\n")[3];
    if(this.enseignant == ''){
        this.enseignant = 'un prof qui veut garder son anonymat';
    }else{
        var enseignantDatas = this.enseignant.split(' ');
        var nom = '';
        var prenom = '';
        enseignantDatas.forEach(function (value) {
            if(value.toUpperCase() == value){ // nom
                nom += value+" ";
            }else{ // prénom
                prenom += value+" ";
            }
        });
        this.enseignant = prenom+nom;
    }
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
    return (this.dateFin-this.dateDebut)/(1000*60);
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

String.prototype.formatter = function () {
    return this.normalize('NFD').replace(/[\u0300-\u036f]/g, "").replaceAll(' ','_').toLowerCase();
};

Calendrier.prototype = {
    cours : [],
    setGroupe : function(ecole,annee,groupe) {
        ecole = ecole.formatter();
        if (ecole.includes('ecole')) {
            ecole = ecole.substr(6);
        }
        var anneeDatas = annee.split(' ');
        if (annee.length >= 2) {
            var num = parseInt(anneeDatas[anneeDatas.length-2][0]);
            if(!num) {
                annee = anneeDatas[anneeDatas.length - 2] + " " + anneeDatas[anneeDatas.length - 1];
            }else if(anneeDatas[anneeDatas.length-2][1] == 'e'){
                annee = TEXTE_ANNEE[num-1] + " " + anneeDatas[anneeDatas.length - 1];
            }
            annee = annee.formatter();
        }
        groupe = groupe.formatter();
        var groupeDatas = groupe.split('_');
        if(groupeDatas.indexOf('classe') == 0){
            groupe = groupeDatas[1];
            if(groupe == 'de'){
                groupe = '2';
            }
        }

        console.log("Groupe info => "+ecole+" "+annee+" "+groupe);
        var fs = require('fs');
        var contents = JSON.parse(fs.readFileSync('calendrier/groupes.json', 'utf8'));
        var id = -1;
        if(contents[ecole] != undefined){
            if(contents[ecole][annee] != undefined){
                if(contents[ecole][annee][groupe] != undefined){
                    id = contents[ecole][annee][groupe];
                }
            }
        }
        if(id != -1) {
            ressources = id;
            return "Vous êtes en " + annee.replaceAll('_', ' ') + ", groupe " + groupe.replaceAll('_', ' ') + " à " + ecole.replaceAll('_', ' ') + ".";
        }else{
            return "Votre groupe n'est pas connu";
        }
    },
    getCoursPeriode : function (dateDebut,dateFin) {
        var timestamp = createDate(getDateParam(dateFin),true).getTime()/1000;
        var needWeeks = Math.floor((timestamp-createDate(getDateParam(dateDebut),true).getTime()/1000)/(60*60*24*7))+1;
        this.cours = getCalendrier(ressources,needWeeks,dateDebut).cours;
        var calendrier = this;
        var res = [];
        var rechercheDebut = getMinDate(dateDebut);
        var rechercheFin = getMinDate(dateFin);
        this.cours.forEach(function(cours){
            var ok = true;
            if(cours.dateDebut.getFullYear() < rechercheDebut.getFullYear()){
                ok = false;
            }else if(cours.dateDebut.getFullYear() == rechercheDebut.getFullYear()){
                if(cours.dateDebut.getMonth() < rechercheDebut.getMonth()){
                    ok = false;
                }else if(cours.dateDebut.getMonth() == rechercheDebut.getMonth()){
                    if(cours.dateDebut.getDate() < rechercheDebut.getDate()){
                        ok = false;
                    }
                }
            }
            if(cours.dateFin.getFullYear() > rechercheFin.getFullYear()){
                ok = false;
            }else if(cours.dateFin.getFullYear() == rechercheFin.getFullYear()){
                if(cours.dateFin.getMonth() > rechercheFin.getMonth()){
                    ok = false;
                }else if(cours.dateFin.getMonth() == rechercheFin.getMonth()){
                    if(cours.dateFin.getDate() > rechercheFin.getDate()){
                        ok = false;
                    }
                }
            }
            if(ok){res.push(cours);}
        });
        return res;
    },
    getCoursDuJour : function (dateParam) {
        this.cours = getCalendrier(ressources,1,dateParam).cours;
        var calendrier = this;
        var res = [];
        var recherche = getMinDate(dateParam);
        this.cours.forEach(function(cours){
            if(dateEgales(cours.dateDebut,recherche)){
                res.push(cours);
            }
        });
        return res;
    },
    getCoursHeure : function (dateParam,heureParam) {
        this.cours = getCalendrier(ressources,1,dateParam).cours;
        var res = [];
        var recherche = createDate(getDateParam(dateParam,heureParam),true);
        this.cours.forEach(function(cours){
            if(dateEgales(cours.dateDebut,recherche,false)){
                if(cours.dateDebut.getHours() <= recherche.getHours() && cours.dateFin.getHours() > recherche.getHours())
                res.push(cours);
            }
        });

        return res;
    },
    premierCoursDeLaJournee : function(dateParam){
        var cours = this.getCoursDuJour(dateParam);
        var date = getMinDate(dateParam);
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
        var date = getMinDate(dateParam);
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
        var date = getMinDate(dateDebut);
        var retour = '';

        if(cours.length == 0){
            retour += "vous n'avez pas de cours.";
        }else {
            retour += "Entre le "+cours[0].getDateLongue(cours[0].dateDebut)+" et le "+cours[cours.length-1].getDateLongue(cours[cours.length-1].dateFin)+" vous aurez ";
            var nbHeures = 0;
            cours.forEach(function (cour) {
                nbHeures += cour.dureeDuCours();
            });
            retour += ""+afficherHeure(nbHeures)+" de cours";
        }
        return retour;

    },
    afficherCoursJour : function(dateParam){
        var cours = this.getCoursDuJour(dateParam);
        var date = getMinDate(dateParam);
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
        return retour;
    },
    afficherCoursHeure : function(dateParam,heureParam){
        var cours = this.getCoursHeure(dateParam,heureParam);
        var date = getMinDate(dateParam);
        var retour = getPhraseDebut(date);
        if(cours.length == 0){
            retour += "vous n'avez pas de cours à "+heureParam.substr(0,2)+"h.";
        }else {
            retour += "à "+cours[0].getHeureLongue(cours[0].dateDebut)+" vous assisterez à "+cours[0].nom;
            if(cours[0].salle != ''){
                retour += ' en salle '+cours[0].salle.replaceAll('_',' ');
            }
            retour += ".\r\n";
        }
        return retour;
    },
    afficherCoursPrecendent : function (dateDebut,heureDebut) {
        var heure = (parseInt(heureDebut.substr(0,2))-1);
        heure = (heure.toString().length == 2?heure:'0'+heure);
        heureDebut = ""+heure+heureDebut.substr(2);
        var retour = '';
        var date = createDate(getDateParam(dateDebut,heureDebut),true);
        var jour = (date.getDate().toString().length == 2 ? date.getDate() : "0" + date.getDate());
        var moisFin = (date.getMonth().toString().length == 2 ? (date.getMonth() + 1) : "0" + (date.getMonth() + 1));
        var dateFin = date.getFullYear() + "-" + moisFin + "-" + jour;
        var jour = (new Date().getDate().toString().length == 2 ? new Date().getDate() : "0" + new Date().getDate());
        var mois = (new Date().getMonth().toString().length == 2 ? (new Date().getMonth()) : "0" + (new Date().getMonth()));
        var cours = this.getCoursPeriode(new Date().getFullYear() + '-' + mois + '-' + jour,dateFin);
        var dernierCourTrouve;
        var trouve = false;
        if(cours.length == 0){
            retour = "Vous n'avez pas de cours avant.";
        }else {
            cours.forEach(function (cour) {
                if (cour.dateDebut <= date) {
                    trouve = true;
                    dernierCourTrouve = cour;
                }
            });
        }
        if(trouve){
            retour += getPhraseDebut(dernierCourTrouve.dateDebut) + "à " + dernierCourTrouve.getHeureLongue(dernierCourTrouve.dateDebut) + " vous assisterez à " + dernierCourTrouve.nom;
            if (dernierCourTrouve.salle != '') {
                retour += ' en salle ' + dernierCourTrouve.salle.replaceAll('_', ' ');
            }
            retour += ".\r\n";
            var heure = (dernierCourTrouve.dateDebut.getHours().toString().length == 2 ? dernierCourTrouve.dateDebut.getHours() : "0" + dernierCourTrouve.dateDebut.getHours());
            var minutes = (dernierCourTrouve.dateDebut.getMinutes().toString().length == 2 ? dernierCourTrouve.dateDebut.getMinutes() : "0" + dernierCourTrouve.dateDebut.getMinutes());
            var jour = (dernierCourTrouve.dateDebut.getDate().toString().length == 2 ? dernierCourTrouve.dateDebut.getDate() : "0" + dernierCourTrouve.dateDebut.getDate());
            var mois = (dernierCourTrouve.dateDebut.getMonth().toString().length == 2 ? (dernierCourTrouve.dateDebut.getMonth()+1) : "0" + (dernierCourTrouve.dateDebut.getMonth()+1));
            retour = {
                text: retour,
                date: dernierCourTrouve.dateDebut.getFullYear() + '-' + mois + '-' + jour,
                heure: heure + ':' + minutes + ':00'
            };
        }
        return retour;
    },
    afficherProchainCoursAvecGroupe : function(ecole,annee,groupe){
        var id = ressources;
        var res = this.setGroupe(ecole,annee,groupe).indexOf("Vous êtes");
        if(res == 0){
            res = this.afficherProchainCours();
        }
        ressources = id;
        return res;
    },
    afficherProchainCours : function(exam,dateDebut,dateFin,heureDebut){
        var date = new Date();
        var periode = false;
        var jour = (date.getDate().toString().length == 2 ? date.getDate() : "0" + date.getDate());
        if(dateFin && dateDebut){periode = true;}
        if(!dateDebut) {
            var moisDebut = (date.getMonth().toString().length == 2 ? (date.getMonth() + 1) : "0" + (date.getMonth() + 1));
            dateDebut = date.getFullYear() + "-" + moisDebut + "-" + jour;
        }else{
            if(heureDebut){heureDebut = heureDebut.substr(0,7)+"1";}
            date = createDate(getDateParam(dateDebut,heureDebut),true);
            jour = (date.getDate().toString().length == 2 ? date.getDate() : "0" + date.getDate());
        }
        dateFin = undefined;
        if(!dateFin){
            var moisFin = (date.getMonth().toString().length == 2 ? (date.getMonth() + 2) : "0" + (date.getMonth() + 2));
            dateFin = date.getFullYear() + "-" + moisFin + "-" + jour;
        }
        var cours = this.getCoursPeriode(dateDebut,dateFin);
        var dernierCourTrouve;
        var retour = '';
        if(cours.length == 0){
            if(exam){retour = "Vous n'avez pas d'examen à venir";}
            else{retour = "Vous n'avez pas de cours à venir";}
        }else {
            var trouve = false;
            cours.forEach(function (cour) {
                if((!trouve || periode)&& cour.dateDebut >= date){
                    if((exam && (cour.nom.toLowerCase().indexOf('exam') != -1 || cour.nom.toLowerCase().indexOf('ds') != -1)) || !exam){
                        trouve = true;
                        dernierCourTrouve = cour;
                        retour += getPhraseDebut(cour.dateDebut)+"à "+cour.getHeureLongue(cour.dateDebut)+" vous assisterez à "+cour.nom;
                        if(cour.salle != ''){
                            retour += ' en salle '+cour.salle.replaceAll('_',' ');
                        }
                        retour += ".\r\n";
                    }
                }
            });
            if(!trouve){
                if(exam) {
                    retour = "Aucun examen à venir.\r\n";
                }else{
                    retour = "Aucun cours trouvé.\r\n";
                }
            }else{
                if(exam && periode){
                    retour = "Entre le "+cours[0].getDateLongue(cours[0].dateDebut)+" et le "+cours[cours.length-1].getDateLongue(cours[cours.length-1].dateFin)+" vous aurez les examens suivants : "+retour;
                }
            }
        }
        if(heureDebut){
            var heure = (dernierCourTrouve.dateDebut.getHours().toString().length == 2 ? dernierCourTrouve.dateDebut.getHours() : "0" + dernierCourTrouve.dateDebut.getHours());
            var minutes = (dernierCourTrouve.dateDebut.getMinutes().toString().length == 2 ? dernierCourTrouve.dateDebut.getMinutes() : "0" + dernierCourTrouve.dateDebut.getMinutes());
            var jour = (dernierCourTrouve.dateDebut.getDate().toString().length == 2 ? dernierCourTrouve.dateDebut.getDate() : "0" + dernierCourTrouve.dateDebut.getDate());
            var mois = (dernierCourTrouve.dateDebut.getMonth().toString().length == 2 ? (dernierCourTrouve.dateDebut.getMonth()+1) : "0" + (dernierCourTrouve.dateDebut.getMonth()+1));
            retour = {
                text: retour,
                date: dernierCourTrouve.dateDebut.getFullYear() + '-' + mois + '-' + jour,
                heure: heure + ':' + minutes + ':00'
            };
        }
        return retour;
    },
    afficherDureeCoursHeure : function(dateParam,heureParam){
        var cours = this.getCoursHeure(dateParam,heureParam);
        var date = getMinDate(dateParam);
        var retour;
        if(cours.length == 0){
            retour = "vous n'avez pas de cours à "+heureParam.substr(0,2)+"h.";
        }else {
            retour = "Ce cours dure "+afficherHeure(cours[0].dureeDuCours());
            retour += ".\r\n";
        }
        return retour;
    },
    afficherEnseignant : function(dateParam,heureParam){
        var cours = this.getCoursHeure(dateParam,heureParam);
        var date = getMinDate(dateParam);
        var retour;
        if(cours.length == 0){
            retour = "vous n'avez pas de cours à "+heureParam.substr(0,2)+"h.";
        }else {
            retour = "Ce cours sera donné par " + cours[0].enseignant;
            retour += ".\r\n";
        }
        return retour;
    },
    getLogin : function (login) {
        var login = login.formatter();
        var fs = require('fs');
        var contents = fs.readFileSync('calendrier/login.json', 'utf8');
        var json = JSON.parse(contents);

        var res = '';
        if(json[login]){
            ressources = res;
            return "Vous êtes connectés en tant que "+login.replaceAll('_',' ');+'.';
        }else{
            return "Login inconnu.";
        }
    },
    saveLogin : function (login) {
        var login = login.formatter();
        var fs = require('fs');
        var contents = fs.readFileSync('calendrier/login.json', 'utf8');
        var json = JSON.parse(contents);

        json[login] = ressources;

        var data = JSON.stringify(json);
        fs.writeFileSync('calendrier/login.json', data);

        return 'Votre identifiant est bien sauvergardé.';
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

console.log(Calendrier.prototype.getLogin("ophélien","AMSLER"));

//var calendar = getCalendrier(ressources,nbWeeks,timestamp);

//var cours = calendar.getCoursHeure('2018-03-22','14:00:00');
//console.log(Calendrier.prototype.afficherProchainCoursAvecGroupe("IUT Nancy Charlemagne","deuxieme année","SI 1"));


//console.log(Calendrier.prototype.afficherProchainCours());
//console.log(calendar.cours[2].getDateLongue(calendar.cours[2].dateFin));
//console.log(calendar.getCoursHeure(23,3,2018,16,0));*/