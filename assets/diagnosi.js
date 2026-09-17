/* ═══════════════════════════════════════════════════════════════════
   La diagnosi: da dove viene lo scostamento.

   Un parametro fuori soglia non è una notizia utile. Con i dati della
   cassa (ogni scontrino, ogni piatto venduto), il ricettario e gli
   scarichi di magazzino, il sistema scompone lo scostamento nelle sue
   cause e dà a ognuna il suo peso in punti percentuali.

   Ogni causa porta con sé la prova (quali piatti, quale ingrediente,
   quale fornitore) e la mossa specifica, non il consiglio generico.
   ═══════════════════════════════════════════════════════════════════ */

export const DIAGNOSI = {

'Pizzeria Santa Croce': { food: {
  scostamento: 6.2, atteso: 28, attuale: 34.2,
  sintesi: 'Due terzi dello scostamento vengono dal fiordilatte: costa di più e se ne usa di più del ricettario. Il resto è mix di vendita.',
  cause: [
    { titolo:'Il fiordilatte costa il 18 per cento in più', punti: 2.1, tipo:'fornitore',
      dettaglio:'Caseificio Vallelata ha aumentato due volte dal 5 agosto: da 6,40 a 7,55 euro al chilo. Nessuno ha rinegoziato.',
      prova:'Fatture del 5 e del 26 agosto, confrontate con il listino di luglio',
      mossa:'Chiedere il ritorno al listino di luglio o passare al secondo fornitore già contattato. Due settimane in parallelo per confrontare resa e qualità.' },
    { titolo:'Se ne usa più di quanto dice la ricetta', punti: 1.7, tipo:'porzione',
      dettaglio:'Consumo reale 22 kg a settimana contro 18,4 kg teorici sul venduto: 19 per cento in più. Sono circa 145 grammi a pizza invece dei 120 della scheda.',
      prova:'Scarichi dai tag NFC incrociati col venduto in cassa',
      mossa:'Tre giorni di pesatura in postazione: venti pizze a testa per i tre pizzaioli. Se il fuori scala è di una persona sola si corregge in un turno.' },
    { titolo:'Le tre pizze speciali hanno preso il posto delle margherite', punti: 1.6, tipo:'mix',
      dettaglio:'Bufala e crudo, Tartufo, Vegana pesano oggi il 22 per cento del venduto contro il 9 di giugno. Hanno food cost fra il 38 e il 43 per cento contro il 24 della margherita.',
      prova:'Mix di vendita dagli scontrini, confronto giugno contro settembre',
      mossa:'Riprezzare le tre speciali a 13,50 (oggi 11) oppure toglierne una. Il margine per pizza torna in linea senza toccare il resto della carta.' },
    { titolo:'Scarto impasto sopra soglia', punti: 0.8, tipo:'spreco',
      dettaglio:'4,1 per cento contro il 3 concordato. Concentrato il lunedì e il martedì, quando si impasta come nel fine settimana.',
      prova:'Scarichi di farina contro pizze vendute, per giorno',
      mossa:'Ridurre del 20 per cento le teglie del lunedì e martedì. Sono i due giorni con meno della metà dei coperti del sabato.' },
  ],
  piatti: {
    titolo:'I piatti che pesano di più questa settimana',
    colonne:['Piatto','Venduti','Food cost','Contributo'],
    nota:'La barra è il venduto, il colore è quanto quel piatto pesa sullo scostamento.',
    righe: [
      ['Bufala e crudo', '148', '43%', 'alto'],
      ['Tartufo e funghi', '96', '41%', 'alto'],
      ['Vegana', '61', '38%', 'alto'],
      ['Diavola', '204', '27%', 'in linea'],
      ['Margherita', '389', '24%', 'in linea'],
    ]
  },
  ingredienti: {
    titolo:'Consumo reale contro teorico, ultima settimana', verso:'basso',
    colonne:['Ingrediente','Teorico','Reale','Scostamento'],
    righe: [
      ['Fiordilatte', '18,4 kg', '22,0 kg', '+19,6%'],
      ['Farina tipo 0', '17,3 kg', '18,0 kg', '+4,0%'],
      ['Pomodoro pelato', '30,1 kg', '31,0 kg', '+3,0%'],
      ['Salumi', '8,6 kg', '9,0 kg', '+4,7%'],
      ['Olio EVO', '5,8 L', '6,0 L', '+3,4%'],
    ]
  },
}},

'Trattoria del Borgo': { pers: {
  scostamento: 5.2, atteso: 33, attuale: 38.2,
  sintesi: 'Tutto lo scostamento viene dalla sovrapposizione in cucina di tre settimane. Non è un problema strutturale: rientra da ottobre se i turni tornano a otto persone.',
  cause: [
    { titolo:'Due persone in più in cucina per tre settimane', punti: 3.8, tipo:'organico',
      dettaglio:'Dal 18 agosto al 7 settembre hanno lavorato dieci persone invece di otto: affiancamento dei due nuovi. Sono 96 ore in più a 15,10 euro.',
      prova:'Timbrature dai badge, confronto con la pianificazione',
      mossa:'Nessuna correzione: la spesa era prevista e finisce con settembre. Va solo tolta dal confronto, altrimenti sembra un problema che non c è.' },
    { titolo:'Il martedì è coperto come il giovedì', punti: 0.9, tipo:'turni',
      dettaglio:'Martedì sera: 3 persone in sala per 21 coperti medi. Giovedì: 3 persone per 38 coperti.',
      prova:'Badge incrociati coi coperti battuti in cassa, dodici settimane',
      mossa:'Togliere una persona il martedì sera. Sono circa 180 euro al mese, e nessun cliente se ne accorge.' },
    { titolo:'Straordinari non pianificati il sabato', punti: 0.5, tipo:'turni',
      dettaglio:'Media di 40 minuti oltre il turno per quattro persone, ogni sabato da luglio.',
      prova:'Timbrature di uscita contro orario previsto',
      mossa:'Anticipare di mezz ora l inizio del turno del sabato invece di allungarlo in fondo, quando è tutto già finito.' },
  ],
  piatti: {
    titolo:'Coperti serviti, sera per sera',
    nota:'La barra sono i coperti battuti in cassa, il colore dice se la sala era coperta come serviva. Martedì e mercoledì hanno le stesse persone in sala e trenta coperti di differenza.',
    colonne:['Giorno','Coperti','Giudizio','In sala','Coperti a testa'],
    righe: [
      ['Martedì',  '21','sovracoperto','3','7,0'],
      ['Mercoledì','29','in linea','3','9,7'],
      ['Giovedì',  '38','in linea','3','12,7'],
      ['Venerdì',  '51','in linea','4','12,8'],
      ['Sabato',   '58','al limite','4','14,5'],
    ]
  },
  ingredienti: {
    titolo:'Ore rilevate contro ore pianificate', verso:'basso',
    colonne:['Settimana','Pianificate','Rilevate','Scostamento'],
    righe: [
      ['1 settembre','268 h','301 h','+12,3%'],
      ['25 agosto','268 h','314 h','+17,2%'],
      ['18 agosto','268 h','309 h','+15,3%'],
      ['11 agosto','268 h','272 h','+1,5%'],
    ]
  },
}},

'Bar Aurelio': { chk: {
  scostamento: 44, atteso: 90, attuale: 46,
  sintesi: 'Le checklist si sono fermate quando è cambiato il turno del mattino. Non è pigrizia diffusa: sono due persone su sei a non compilarle mai.',
  cause: [
    { titolo:'Il turno del mattino non compila da tre settimane', punti: 31, tipo:'persone',
      dettaglio:'Apertura compilata 4 volte su 21. Le chiusure della sera restano al 78 per cento.',
      prova:'Registro delle compilazioni per turno e per persona',
      mossa:'Dare la responsabilità al capo turno del mattino, con nome e cognome. Finché è di tutti non è di nessuno.' },
    { titolo:'Il tag della postazione è stato spostato', punti: 9, tipo:'dotazione',
      dettaglio:'Il tag di apertura è finito dietro la macchina del caffè durante la pulizia del 14 agosto. Da lì le compilazioni sono crollate.',
      prova:'Ultimo tap registrato sul tag di apertura: 13 agosto',
      mossa:'Rimetterlo all altezza della mano, accanto all interruttore generale. Un locale compila se il gesto è sulla strada che già fa.' },
    { titolo:'Checklist troppo lunga per il mattino', punti: 4, tipo:'processo',
      dettaglio:'Diciotto voci, di cui sei riguardano la sala che al mattino non apre.',
      prova:'Tempo medio di compilazione: 6 minuti contro i 2 previsti',
      mossa:'Dividere in due: nove voci al mattino, il resto la sera. Due minuti ciascuna.' },
  ],
  piatti: {
    titolo:'Compilazioni per persona, ultime tre settimane', verso:'alto',
    colonne:['Persona','Atteso','Compilate','Turni'],
    righe: [
      ['Capo turno mattino','90%','19%','21 turni'],
      ['Aiuto mattino',     '90%','17%','18 turni'],
      ['Banco pomeriggio',  '90%','85%','20 turni'],
      ['Chiusura sera',     '90%','86%','21 turni'],
    ]
  },
  ingredienti: {
    titolo:'Cosa succede dopo, negli altri locali della rete',
    colonne:['Locale','Checklist','Dopo 4 settimane','Esito'],
    righe: [
      ['Trattoria Tiburtina','79%','sprechi +1,9 punti','confermato'],
      ['Pizzeria Marina','74% a luglio','food cost +2,1 punti','confermato'],
      ['Bar Trieste','89%','nessuno scostamento','stabile'],
    ]
  },
}},

'Trattoria Nonna Elsa': { sco: {
  scostamento: 4.4, atteso: 29, attuale: 24.6,
  sintesi: 'Non è il prezzo dei piatti: è che nessuno propone il secondo e il vino. Metà dei tavoli esce con primo e acqua.',
  cause: [
    { titolo:'Il vino si vende in un tavolo su tre', punti: 2.3, tipo:'vendita',
      dettaglio:'Il 31 per cento degli scontrini ha almeno un vino. Nelle altre trattorie della rete la media è 58 per cento.',
      prova:'Scontrini con almeno una riga vino sul totale coperti',
      mossa:'Carta dei vini al tavolo invece che a richiesta, e due calici del giorno annunciati a voce. Ne abbiamo parlato tre volte: serve che Pietro decida, non un altro suggerimento.' },
    { titolo:'I secondi non arrivano in tavola', punti: 1.4, tipo:'vendita',
      dettaglio:'Il 22 per cento dei coperti prende un secondo. Alle Grazie, stessa fascia di prezzo, siamo al 46 per cento.',
      prova:'Composizione degli scontrini per portata',
      mossa:'Tre secondi in evidenza sulla lavagna, e il cameriere che li nomina quando ritira il primo.' },
    { titolo:'Nessun dolce dopo le 21:30', punti: 0.7, tipo:'vendita',
      dettaglio:'Dopo quell ora il dolce sparisce dagli scontrini: il banco è già smontato.',
      prova:'Scontrini per fascia oraria',
      mossa:'Tenere due dolci pronti fino alla chiusura. Sono 4 euro a tavolo su circa quindici tavoli.' },
  ],
  piatti: {
    titolo:'Composizione dello scontrino, confronto con le trattorie della rete', verso:'alto',
    colonne:['Voce','Media rete','Qui','Scostamento'],
    righe: [
      ['Vino',     '58%','31%','-27 punti'],
      ['Secondo',  '46%','22%','-24 punti'],
      ['Dolce',    '29%','14%','-15 punti'],
      ['Antipasto','41%','38%','-3 punti'],
      ['Caffè',    '66%','62%','-4 punti'],
    ]
  },
  ingredienti: {
    titolo:'Scontrino medio per fascia oraria', verso:'alto',
    colonne:['Fascia','Atteso','Scontrino','Giudizio','Coperti'],
    righe: [
      ['19:00 - 20:30','29,00 €','21,80 €','sotto','96'],
      ['20:30 - 22:00','29,00 €','26,40 €','in linea','148'],
      ['dopo le 22:00','29,00 €','23,10 €','sotto','41'],
    ]
  },
}},

'Pizzeria Marina': {
  for: {
  scostamento: 7, atteso: 40, attuale: 33,
  sintesi: 'Il forno non è lento: è fermo nella prima mezz\'ora e ingolfato dopo le 20.30. Il collo di bottiglia è la comanda, non la cottura.',
  cause: [
    { titolo:'Le comande arrivano tutte insieme dopo le 20.30', punti: 3.4, tipo:'servizio',
      dettaglio:'Fra le 19 e le 20 il forno fa 18 pizze all\'ora con 52 di capienza. Dopo le 20.30 ne arrivano 47 all\'ora e la coda non rientra più.',
      prova:'Orario di battitura delle comande in cassa, raggruppato per mezz\'ora',
      mossa:'Due turni di prenotazione dichiarati, 19.30 e 21.15. Il secondo turno oggi esiste ma non viene proposto al telefono.' },
    { titolo:'Un solo pizzaiolo al banco fino alle 20', punti: 2.1, tipo:'turni',
      dettaglio:'Il secondo pizzaiolo timbra alle 20.05, quando la coda si è già formata. Le prime venti pizze del sabato escono con venti minuti di attesa.',
      prova:'Timbrature dei badge incrociate con gli orari delle comande',
      mossa:'Anticipare di un\'ora l\'ingresso del secondo pizzaiolo il venerdì e il sabato. Stesse ore totali, spostate dove servono.' },
    { titolo:'Impasto finito due sabati su quattro', punti: 1.5, tipo:'produzione',
      dettaglio:'Le palline preparate bastano per 280 pizze, i sabati pieni ne chiedono 320. Gli ultimi tavoli si sentono dire di no.',
      prova:'Scarichi di farina dai tag contro pizze battute in cassa, per giorno',
      mossa:'Portare l\'impasto del sabato a 340 palline. Il costo dell\'impasto è due euro, quello di una pizza non venduta è nove.' },
  ],
  piatti: {
    titolo:'Pizze all\'ora per fascia, media del venerdì e del sabato',
    colonne:['Fascia','Pizze/ora','Capienza','Giudizio'],
    righe: [
      ['19.00 - 20.00','18','52','forno fermo'],
      ['20.00 - 20.30','31','52','in salita'],
      ['20.30 - 21.30','47','52','coda'],
      ['21.30 - 22.30','24','52','rientro'],
    ]
  },
  ingredienti: {
    titolo:'Attesa dichiarata al tavolo contro attesa reale', verso:'basso',
    colonne:['Fascia','Detta al cliente','Reale','Tavoli'],
    righe: [
      ['Prima delle 20','10 min','21 min','34'],
      ['20.00 - 21.30','20 min','38 min','96'],
      ['Dopo le 21.30','15 min','17 min','41'],
    ]
  },
},
  pers: {
  scostamento: 5.4, atteso: 30, attuale: 35.4,
  sintesi: 'I turni sono ancora quelli di agosto mentre i coperti sono scesi del 40 per cento. È aritmetica, non organizzazione.',
  cause: [
    { titolo:'Organico da alta stagione a settembre', punti: 4.1, tipo:'organico',
      dettaglio:'Dodici persone come ad agosto, con 61 coperti medi a sera contro i 104 di agosto.',
      prova:'Badge contro coperti battuti, confronto agosto settembre',
      mossa:'Tornare a nove persone dal primo ottobre, come da contratto stagionale. Sono 1.900 euro al mese.' },
    { titolo:'Il lunedì resta aperto con quattro persone', punti: 0.9, tipo:'turni',
      dettaglio:'Media di 19 coperti il lunedì. Il locale copre a malapena il costo del personale di quella sera.',
      prova:'Coperti e incasso del lunedì, dodici settimane',
      mossa:'Chiudere il lunedì da ottobre a marzo, come fanno gli altri due locali della zona.' },
    { titolo:'Il cambio turno si sovrappone di un ora', punti: 0.4, tipo:'turni',
      dettaglio:'Dalle 18 alle 19 ci sono sia il turno del pomeriggio sia quello della sera, con pochi coperti.',
      prova:'Timbrature di ingresso e uscita',
      mossa:'Spostare il cambio alle 17:30, quando la sala è ancora vuota.' },
  ],
  piatti: {
    titolo:'Coperti e organico, mese per mese',
    colonne:['Mese','Coperti/sera','In servizio','Giudizio'],
    nota:'La barra sono i coperti serviti a sera, il colore dice se l\'organico li regge.',
    righe: [
      ['Giugno','88','11','in linea'],
      ['Luglio','112','12','in linea'],
      ['Agosto','104','12','in linea'],
      ['Settembre','61','12','sovracoperto'],
    ]
  },
  ingredienti: {
    titolo:'Costo del personale per coperto servito', verso:'basso',
    colonne:['Mese','Atteso','Per coperto','Ore','Costo'],
    righe: [
      ['Giugno',   '2,00 €','2,10 €','402 h','5.548 €'],
      ['Luglio',   '2,00 €','1,84 €','448 h','6.182 €'],
      ['Agosto',   '2,00 €','1,95 €','441 h','6.086 €'],
      ['Settembre','2,00 €','3,03 €','402 h','5.548 €'],
    ]
  },
}},

'Trattoria Tiburtina': {
  chk: {
  scostamento: 11, atteso: 90, attuale: 79,
  sintesi: 'Le checklist le compila una persona sola, e quando non c\'è lei non le compila nessuno. Non è pigrizia della squadra: è un processo appoggiato su una persona.',
  cause: [
    { titolo:'Il 71 per cento lo compila una persona sola', punti: 6, tipo:'processo',
      dettaglio:'Su 84 compilazioni delle ultime quattro settimane, 60 portano il nome di Luca. Nei suoi due giorni di riposo la compilazione scende al 22 per cento.',
      prova:'Nomi e orari registrati dall\'app, quattro settimane',
      mossa:'Assegnare la chiusura a chi chiude, non a chi se ne ricorda: turno per turno, con il nome scritto sul turno stesso.' },
    { titolo:'Il pre servizio è saltato quasi sempre', punti: 3, tipo:'processo',
      dettaglio:'Apertura al 91 per cento, chiusura all\'84, pre servizio al 47. È la checklist che serve di più e viene fatta di meno, perché cade nell\'ora di punta della preparazione.',
      prova:'Compilazioni per tipo di checklist',
      mossa:'Spostare il pre servizio alle 17.30, prima della pausa. Otto voci, tre minuti.' },
    { titolo:'Compilazioni a fine servizio, tutte insieme', punti: 2, tipo:'attendibilità',
      dettaglio:'Diciannove compilazioni su 84 sono registrate dopo mezzanotte, con tutte le voci spuntate nello stesso minuto. Quelle non dicono niente sul locale.',
      prova:'Orario di registrazione di ogni singola voce',
      mossa:'L\'app chiude la checklist di apertura alle 12. Se non è stata fatta, resta rossa: è un dato, non una colpa.' },
  ],
  piatti: {
    titolo:'Compilazione per tipo, ultime quattro settimane',
    colonne:['Checklist','Compilate','Attese','Giudizio'],
    righe: [
      ['Apertura','25','28','in linea'],
      ['Chiusura','23','28','da guardare'],
      ['Pre servizio','13','28','sotto'],
      ['HACCP settimanale','3','4','in linea'],
    ]
  },
  ingredienti: {
    titolo:'Chi compila',
    colonne:['Persona','Compilate','Orario medio','Nei giorni di riposo'],
    righe: [
      ['Luca Ferretti','60','07.45','—'],
      ['Sara Mancini','14','16.20','22%'],
      ['Resto della squadra','10','23.40','22%'],
    ]
  },
},
  spr: {
  scostamento: 1.9, atteso: 2.5, attuale: 4.4,
  sintesi: 'Gli sprechi si concentrano sul pesce e sulla pasta fresca, ed è un problema di rotazione in cella, non di acquisti.',
  cause: [
    { titolo:'La cella non rispetta il primo entrato primo uscito', punti: 1.1, tipo:'processo',
      dettaglio:'Il pesce nuovo viene messo davanti al vecchio: lo si vede dai tag, dove i lotti vecchi restano senza scarichi per giorni e poi spariscono tutti insieme.',
      prova:'Scarichi per lotto: tre lotti scaricati a zero lo stesso giorno',
      mossa:'Girare la scaffalatura e mettere le etichette con la data di apertura. Costa un pomeriggio del giovane in formazione.' },
    { titolo:'Pasta fresca preparata sul giorno sbagliato', punti: 0.5, tipo:'previsione',
      dettaglio:'Si prepara il giovedì per il fine settimana, ma il venerdì vende la metà del sabato.',
      prova:'Produzione contro venduto, per giorno',
      mossa:'Spostare metà della produzione al venerdì mattina. Stessa fatica, due giorni di freschezza in più.' },
    { titolo:'Ordini di pesce fissi, coperti variabili', punti: 0.3, tipo:'acquisti',
      dettaglio:'Ordine uguale ogni martedì e venerdì, con coperti che variano del 40 per cento fra una settimana e l altra.',
      prova:'Ordini a peso fisso contro prenotazioni registrate',
      mossa:'Legare l ordine del venerdì alle prenotazioni del mercoledì sera.' },
  ],
  piatti: {
    titolo:'Dove finiscono gli sprechi', verso:'alto',
    colonne:['Ingrediente','Scaricato','Venduto','Differenza'],
    nota:'La tacca è quanto è uscito dalla cella, la barra quanto è finito in tavola. Quello che manca è spreco.',
    righe: [
      ['Pesce fresco','5,0 kg','3,9 kg','1,1 kg'],
      ['Pasta fresca','8,0 kg','7,2 kg','0,8 kg'],
      ['Formaggi','5,0 kg','4,8 kg','0,2 kg'],
      ['Carne bovina','11,0 kg','10,8 kg','0,2 kg'],
    ]
  },
  ingredienti: {
    titolo:'Giorni fra carico e scarico completo del lotto', verso:'basso',
    colonne:['Lotto','Standard','Giorni in cella','Arrivato','Finito'],
    righe: [
      ['Pesce 12/09','3','4','12 settembre','16 settembre'],
      ['Pesce 09/09','3','7','9 settembre','16 settembre'],
      ['Pasta 11/09','3','4','11 settembre','15 settembre'],
    ]
  },
}},

};
