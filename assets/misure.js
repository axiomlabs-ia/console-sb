/* ═══════════════════════════════════════════════════════════════════
   Le misure: cosa sappiamo davvero di ogni locale.

   Sappiamo quali strumenti installiamo all'ingresso, quindi sappiamo
   esattamente quali dati arrivano e con che frequenza. Questo file
   descrive gli strumenti, dice quale parametro nasce da quale flusso,
   e ricostruisce le misure grezze dietro ogni numero.

   Le misure sono derivate dai dati del locale con una funzione
   deterministica: lo stesso locale dà sempre gli stessi numeri, e i
   dettagli tornano col totale mostrato in scheda.
   ═══════════════════════════════════════════════════════════════════ */

import { GIORNI, LOCALI } from './dati.js';

/* ─── gli strumenti che montiamo e cosa raccolgono ─────────────── */
export const STRUMENTI = {
  cassa: { ico:'point_of_sale', nome:'Cassa in cloud', freq:'in tempo reale',
    raccoglie:'Ogni scontrino riga per riga: piatto, quantità, prezzo, orario, tavolo, coperti, sconti, storni, forma di pagamento.' },
  nfc: { ico:'nfc', nome:'Tag NFC di magazzino', freq:'a ogni prelievo',
    raccoglie:'Ogni prelievo di materia prima: ingrediente, peso, orario, postazione. E ogni scarto, con il motivo.' },
  badge: { ico:'badge', nome:'Badge di presenza', freq:'a ogni timbratura',
    raccoglie:'Entrata e uscita di ogni persona, reparto, minuti oltre il turno previsto.' },
  checklist: { ico:'checklist', nome:'App delle checklist', freq:'tre volte al giorno',
    raccoglie:'Apertura, pre servizio e chiusura: chi compila, a che ora, cosa segnala.' },
  sonde: { ico:'thermostat', nome:'Sonde di temperatura', freq:'ogni quindici minuti',
    raccoglie:'Temperatura di celle e abbattitore, allarmi e durata dello sforamento. Registro HACCP automatico.' },
  recensioni: { ico:'reviews', nome:'Placca NFC e profilo Google', freq:'ogni giorno',
    raccoglie:'Tap sulla placca, recensioni lasciate, voto, tempo di risposta del locale.' },
  telecamere: { ico:'videocam', nome:'Telecamere con analisi', freq:'in continuo',
    raccoglie:'Solo conteggi aggregati: persone in sala per fascia, attesa al tavolo, coda alla cassa. Nessun riconoscimento delle persone, accordo sindacale art. 4.' },
};

/* L'icona usata nella dotazione del locale dice quale strumento è */
export const DA_ICONA = {
  point_of_sale:'cassa', nfc:'nfc', badge:'badge', checklist:'checklist',
  thermostat:'sonde', reviews:'recensioni', videocam:'telecamere',
};

/* Quali parametri alimenta ogni strumento */
export const ALIMENTA = {
  cassa:'Food cost, costo personale, scontrino medio, ritmo del servizio',
  nfc:'Food cost e sprechi',
  badge:'Costo personale',
  checklist:'Checklist compilate',
  sonde:'Nessun parametro: tiene il registro HACCP e avvisa sugli allarmi',
  recensioni:'Voto recensioni',
  telecamere:'Nessun parametro: serve a leggere i flussi di sala quando i numeri non bastano',
};

/* Da quali strumenti nasce ogni parametro */
export const SORGENTE = {
  food:['cassa','nfc'], pers:['badge','cassa'], sco:['cassa'], for:['cassa'],
  bev:['cassa'],  spr:['nfc','cassa'], chk:['checklist'], rec:['recensioni'],
};

/* ─── piccola macchina deterministica ──────────────────────────── */
function seme(testo){
  let h = 2166136261;
  for (let i = 0; i < testo.length; i++){ h ^= testo.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h ^= h >>> 13; return ((h >>> 0) % 10000) / 10000; };
}
const dec = (n, c = 1) => n.toFixed(c).replace('.', ',');
const pc  = n => dec(n) + '%';

/* Coperti serviti giorno per giorno: la capienza del locale pesata sul
   profilo settimanale della tipologia. Viene dai coperti battuti in cassa. */
const PROFILO = {
  pizzeria: [.42,.40,.52,.62,.86,1,.78],
  trattoria:[.46,.50,.58,.66,.88,1,.72],
  bar:      [.92,.94,.96,.98,1,.86,.52],
};
/* Quanti coperti servono in una sera dipende anche da quanto pesa il
   personale: se il costo personale è sopra l'atteso vuol dire che ogni
   persona in turno porta a casa meno coperti. Senza questo legame il
   grafico direbbe "sotto organico" in un locale che ha troppo personale. */
const ATTESO_PERS = { pizzeria: 30, trattoria: 33, bar: 32 };
export function copertiGiorno(l){
  const k = Math.min(1.35, Math.max(.55, Math.pow(ATTESO_PERS[l.tipo] / l.valori.pers, 3)));
  const base = l.coperti * (l.tipo === 'bar' ? 3.4 : 1.55) * k;
  return PROFILO[l.tipo].map(f => Math.round(base * f));
}

/* Consumo reale contro teorico, ingrediente per ingrediente: il reale
   arriva dai tag di magazzino, il teorico dal venduto per ricettario.
   Serve sia alla diagnosi del food cost sia alla scheda magazzino. */
export function consumo(l){
  const r = seme(l.nome + 'food');
  const P = { food: null };
  const scarto = l.valori.food - (l.tipo === 'pizzeria' ? 28 : l.tipo === 'trattoria' ? 31 : 24);
  return l.magazzino.map(([nome, qta, quando]) => {
    const n = parseFloat(String(qta).replace(',', '.'));
    const u = String(qta).replace(/[\d,.\s]/g, '');
    const ecc = Math.max(-2, scarto * (1.1 + r() * 2.4));
    const teo = n / (1 + ecc / 100);
    return [nome, dec(teo, 1) + ' ' + u, dec(n, 1) + ' ' + u,
            (ecc >= 0 ? '+' : '') + pc(ecc),
            ecc > 8 ? 'alto' : ecc > 3 ? 'da guardare' : 'in linea', quando];
  }).sort((a, b) => parseFloat(b[3].replace(',', '.')) - parseFloat(a[3].replace(',', '.')));
}

/* Quanti coperti a testa ci si aspetta in una sera: non è un numero
   deciso a tavolino, è la media dei locali della stessa tipologia che
   hanno il costo del personale dentro i parametri. È il vantaggio di
   avere una rete invece di un cliente solo. */
const memoria = {};
export function attesoCoperti(tipo){
  if (memoria[tipo]) return memoria[tipo];
  const buoni = LOCALI.filter(z => z.tipo === tipo && z.valori.pers <= ATTESO_PERS[tipo]);
  const rif = (buoni.length ? buoni : LOCALI.filter(z => z.tipo === tipo)).flatMap(z => {
    const c = copertiGiorno(z);
    return z.organico.sera.map((n, i) => c[i] / n);
  });
  return memoria[tipo] = Math.round(rif.reduce((a, b) => a + b, 0) / rif.length);
}

/* ─── le misure dietro un parametro ────────────────────────────── */
export function misure(l, p){
  const r = seme(l.nome + p.id);
  const cop = copertiGiorno(l);
  const settimana = cop.reduce((a, b) => a + b, 0);
  const scarto = p.verso === 'basso' ? l.valori[p.id] - p.atteso : p.atteso - l.valori[p.id];
  const blocchi = [];

  if (p.id === 'food'){
    const righe = consumo(l).map(x => x.slice(0, 5));
    blocchi.push({ titolo:'Consumo reale contro teorico, ultima settimana', verso:'basso',
      nota:'Il reale sono i prelievi letti dai tag. Il teorico è quanto sarebbe dovuto uscire per i piatti battuti in cassa.',
      colonne:['Ingrediente','Teorico','Reale','Scostamento','Giudizio'], righe });

    const listino = l.magazzino.map(([nome]) => {
      const base = 3 + Math.round(r() * 90) / 10;
      /* Dove il food cost è in linea qualche prezzo è sceso: sono le
         rinegoziazioni fatte alla visita. Dove è fuori, salgono tutti. */
      const oggi = base * (1 + scarto * (0.6 + r()) / 100 + (r() - .45) * .06);
      return [nome, dec(base, 2) + ' €', dec(oggi, 2) + ' €',
              (oggi > base ? '+' : '') + pc((oggi / base - 1) * 100)];
    });
    blocchi.push({ titolo:'Prezzo al chilo: ultimo acquisto contro listino d\'ingresso', verso:'basso',
      nota:'Preso dalle fatture caricate. È il controllo che nessun locale fa da solo.',
      colonne:['Ingrediente','All\'ingresso','Ultimo acquisto','Variazione'], righe: listino });
  }

  if (p.id === 'pers'){
    const ATTESO = attesoCoperti(l.tipo);
    const righe = l.organico.sera.map((n, i) => {
      const ore = Math.round(n * 7.5 + r() * 3);
      const perPersona = cop[i] / n;
      return [GIORNI[i].toUpperCase(), String(ATTESO), dec(perPersona, 1),
              perPersona < ATTESO * .7 ? 'troppa copertura'
                : perPersona > ATTESO * 1.3 ? 'sotto organico' : 'in linea',
              String(n), String(cop[i]), ore + ' h'];
    });
    blocchi.push({ titolo:'Coperti serviti a testa, sera per sera', verso:'alto',
      nota:`L'atteso è la media dei locali della rete della stessa tipologia che hanno il costo del personale in linea. Trenta per cento sotto vuol dire sala troppo coperta, trenta per cento sopra vuol dire scoperta. Le persone vengono dalle timbrature, i coperti dalla cassa.`,
      colonne:['Giorno','Atteso','Coperti a testa','Giudizio','In turno','Coperti','Ore'], righe });

    /* Un po' di straordinario c'è in ogni locale: la soglia concordata è
       il cinque per cento delle ore del reparto in quattro settimane. */
    const extra = Math.round((10 + r() * 40) * (1 + Math.max(0, scarto)));
    const reparti = [['Cucina', .55, .46, 'venerdì e sabato, in chiusura'],
                     ['Sala',   .33, .34, 'sabato sera'],
                     ['Banco',  .12, .20, 'sparse']];
    blocchi.push({ titolo:'Ore oltre il turno previsto, ultime quattro settimane', verso:'basso',
      nota:'Differenza fra orario di uscita timbrato e orario previsto. La soglia è il cinque per cento delle ore del reparto: sotto è fisiologico, sopra è un turno scritto male.',
      colonne:['Reparto','Soglia','Ore extra','Costo','Quando si concentrano'],
      righe: reparti.map(([nome, q, peso, quando]) => {
        const ore = extra * q;
        return [nome, Math.round(l.organico.ore * 4 * peso * .05) + ' h', dec(ore, 0) + ' h',
                Math.round(ore * l.organico.costoOra) + ' €', quando];
      })});
  }

  if (p.id === 'sco'){
    const v = l.valori.sco;
    const fasce = l.tipo === 'bar'
      ? [['Colazione, 6-11', .62], ['Pranzo, 11-15', 1.48], ['Pomeriggio, 15-18', .78], ['Aperitivo, 18-21', 1.32]]
      : [['Primo turno, 19-20.30', .92], ['Secondo turno, 20.30-22', 1.12], ['Tardi, dopo le 22', .84], ['Pranzo', .78]];
    blocchi.push({ titolo:'Scontrino medio per fascia', verso:'alto',
      nota:'Ogni riga è la media degli scontrini battuti in quella fascia nelle ultime quattro settimane, confrontata con l\'atteso per la tipologia.',
      colonne:['Fascia','Atteso','Scontrino medio','Voci a scontrino','Peso sul venduto'],
      righe: fasce.map(([nome, k]) => [nome, dec(p.atteso, 2) + ' €', dec(v * k, 2) + ' €',
                                        dec(1.6 + k + r() * .6, 1),
                                        pc(100 * k / fasce.reduce((a, b) => a + b[1], 0))]) });
    blocchi.push({ titolo:'Cosa non viene proposto', verso:'alto',
      nota:'Percentuale di scontrini che contengono la voce, contro quella attesa. È il margine che si lascia sul tavolo.',
      colonne:['Voce','Atteso','Presente sullo scontrino','Valore a settimana'],
      righe:[
        ['Dolce',    pc(9 + r() * 14),  '25%', Math.round(settimana * .08 * 4) + ' €'],
        ['Caffè',    pc(31 + r() * 22), '55%', Math.round(settimana * .09 * 1.3) + ' €'],
        ['Acqua',    pc(58 + r() * 24), '85%', Math.round(settimana * .12 * 2.5) + ' €'],
        ['Secondo bicchiere', pc(14 + r() * 16), '30%', Math.round(settimana * .07 * 5) + ' €'],
      ]});
  }

  if (p.id === 'for'){
    const max = l.valori.for;
    blocchi.push({ titolo:'Pizze sfornate per fascia oraria, media del venerdì e sabato', verso:'alto',
      nota:'Orario di battitura in cassa, raggruppato per mezz\'ora. Dice dove si ferma il servizio.',
      colonne:['Fascia','Pizze/ora','Capienza del forno','Giudizio'],
      righe:[
        ['19.00 - 19.30', String(Math.round(max * .55)), '52', 'sotto capienza'],
        ['19.30 - 20.30', String(Math.round(max * .92)), '52', 'in linea'],
        ['20.30 - 21.30', String(Math.round(max * 1.18)), '52', 'al limite'],
        ['21.30 - 22.30', String(Math.round(max * .74)), '52', 'sotto capienza'],
      ]});
    blocchi.push({ titolo:'Tempo fra comanda e uscita', verso:'basso',
      nota:'Differenza fra l\'ora della comanda e l\'ora del conto, per fascia. L\'obiettivo concordato è venti minuti.',
      colonne:['Fascia','Obiettivo','Attesa media','Oltre i 20 minuti','Tavoli'],
      righe:[
        ['Prima delle 20', '20 min', dec(11 + r() * 4) + ' min', pc(4 + r() * 6),  String(Math.round(settimana * .06))],
        ['20 - 21.30',     '20 min', dec(19 + r() * 9) + ' min', pc(22 + r() * 18), String(Math.round(settimana * .14))],
        ['Dopo le 21.30',  '20 min', dec(13 + r() * 5) + ' min', pc(7 + r() * 8),  String(Math.round(settimana * .08))],
      ]});
  }

  if (p.id === 'bev'){
    blocchi.push({ titolo:'Incidenza delle bevande sul venduto, per fascia', verso:'alto',
      nota:'Righe bevanda contro righe totali sugli scontrini della cassa.',
      colonne:['Fascia','Atteso','Incidenza','Scontrini'],
      righe:[
        ['Colazione', '32%', pc(l.valori.bev * .78),  String(Math.round(settimana * .34))],
        ['Pranzo',    '35%', pc(l.valori.bev * .92),  String(Math.round(settimana * .27))],
        ['Pomeriggio','40%', pc(l.valori.bev * 1.04), String(Math.round(settimana * .16))],
        ['Aperitivo', '52%', pc(l.valori.bev * 1.34), String(Math.round(settimana * .23))],
      ]});
    blocchi.push({ titolo:'Cosa si beve',
      nota:'Mix delle righe bevanda, ultime quattro settimane.',
      colonne:['Categoria','Peso','Margine','Nota'],
      righe:[
        ['Caffetteria',   pc(44 + r() * 10), '82%', 'la base, tiene'],
        ['Bibite in lattina', pc(18 + r() * 8), '61%', 'margine più basso della media'],
        ['Birra e vino',  pc(12 + r() * 12), '74%', 'cresce solo nell\'aperitivo'],
        ['Cocktail',      pc(4 + r() * 9),   '79%', 'carta ferma da mesi'],
      ]});
  }

  if (p.id === 'spr'){
    const kg = Math.round(settimana * l.valori.spr / 100 * 1.4);
    blocchi.push({ titolo:'Scarti registrati per motivo, ultime quattro settimane',
      nota:'Ogni scarto viene passato sul tag prima di andare via: motivo, peso, chi lo registra. Nessuno di questi chili è un buon numero.',
      colonne:['Motivo','Peso','Valore','Dove nasce'],
      righe:[
        ['Scaduto in cella',      dec(kg * .42) + ' kg', Math.round(kg * .42 * 7) + ' €', 'ordini più grandi del consumo'],
        ['Preparato e non venduto', dec(kg * .28) + ' kg', Math.round(kg * .28 * 9) + ' €', 'mise en place del sabato ripetuta di lunedì'],
        ['Errore di cucina',      dec(kg * .18) + ' kg', Math.round(kg * .18 * 11) + ' €', 'concentrato nelle ore di punta'],
        ['Reso dal cliente',      dec(kg * .12) + ' kg', Math.round(kg * .12 * 12) + ' €', 'due piatti su tutti'],
      ]});
    blocchi.push({ titolo:'Quanto resta in cella rispetto a quanto si ordina', verso:'basso',
      nota:'La tacca è il rimasto che il locale si è dato come limite, la barra quello vero. Quello che resta in cella oltre il limite è il primo posto dove nascono gli sprechi.',
      colonne:['Ingrediente','Tollerato','Rimasto','Ordinato','Consumato'],
      righe: l.magazzino.slice(0, 4).map(([nome, qta]) => {
        const n = parseFloat(String(qta).replace(',', '.'));
        const u = String(qta).replace(/[\d,.\s]/g, '');
        /* Quanto si ordina in più di quanto si consuma: è il primo
           numero da cui nascono gli sprechi, e infatti li segue. */
        const ord = n * (1 + (l.valori.spr ?? 2.2) / 100 * (.75 + r() * .6));
        const limite = n * 2.5 / 100;   /* il due e mezzo per cento concordato */
        return [nome, dec(limite, 2) + ' ' + u, dec(ord - n, 2) + ' ' + u,
                dec(ord) + ' ' + u, dec(n) + ' ' + u];
      })});
  }

  if (p.id === 'chk'){
    const v = l.valori.chk;
    blocchi.push({ titolo:'Compilazione per tipo di checklist, settimana per settimana',
      verso:'alto', obiettivo:90,
      nota:'L\'app registra chi compila e a che ora. Una checklist compilata alle tre di notte per tutta la giornata è segnalata come non attendibile.',
      colonne:['Checklist','4 sett. fa','3 sett. fa','2 sett. fa','Settimana scorsa'],
      righe:[
        ['Apertura',    pc(Math.min(100, v + 9)), pc(Math.min(100, v + 5)), pc(v), pc(Math.max(0, v - 3))],
        ['Pre servizio',pc(Math.max(0, v - 8)),   pc(Math.max(0, v - 12)),  pc(Math.max(0, v - 16)), pc(Math.max(0, v - 19))],
        ['Chiusura',    pc(Math.min(100, v + 4)), pc(v),                    pc(Math.max(0, v - 6)),  pc(Math.max(0, v - 9))],
      ]});
    blocchi.push({ titolo:'Chi compila',
      nota:'Se compila una persona sola, la checklist non è un processo del locale: è un\'abitudine di quella persona. Nessuna di queste quote è buona o cattiva da sola: conta che siano distribuite.',
      colonne:['Persona','Compilate','Orario medio','Segnalazioni aperte'],
      righe:[
        [l.titolare,   pc(38 + r() * 26), '07.40', String(Math.round(r() * 4))],
        [l.giovane,    pc(22 + r() * 24), '16.10', String(Math.round(r() * 3))],
        ['Resto della squadra', pc(8 + r() * 18), '23.20', String(Math.round(r() * 2))],
      ]});
  }

  if (p.id === 'rec'){
    const tap = Math.round(settimana * .18);
    const sett = [1, 2, 3, 4].map(() => {
      const t = Math.round(tap * (.8 + r() * .5));
      return { tap: t, rec: Math.round(t * (.14 + r() * .12)) };
    });
    blocchi.push({ titolo:'Placca NFC: tap e recensioni, ultime quattro settimane',
      nota:'Ogni tap è un cliente che ha avvicinato il telefono alla placca prima di uscire.',
      colonne:['', '4 sett. fa','3 sett. fa','2 sett. fa','Settimana scorsa'],
      righe:[
        ['Tap sulla placca',    ...sett.map(x => String(x.tap))],
        ['Recensioni lasciate', ...sett.map(x => String(x.rec))],
      ]});
    blocchi.push({ titolo:'Resa della placca, settimana per settimana', verso:'alto',
      nota:'Quante recensioni ogni cento tap. Sotto il venti per cento la placca è nel posto sbagliato, o nessuno la indica.',
      colonne:['Settimana','Obiettivo','Resa','Tap','Recensioni','Voto medio'],
      righe: sett.map((x, i) => ['Settimana ' + (i + 1), '20%', pc(x.rec / x.tap * 100),
                                 String(x.tap), String(x.rec), dec(l.valori.rec + (r() - .5) * .4, 1)])});
    blocchi.push({ titolo:'Cosa dicono le recensioni sotto le quattro stelle',
      nota:'Le parole ricorrenti, contate sulle recensioni negative degli ultimi tre mesi.',
      colonne:['Tema','Ricorrenze','Prima comparsa','Risposta del locale'],
      righe:[
        ['Attesa al tavolo', String(Math.round(4 + r() * 11)), 'giugno',  'nessuna'],
        ['Conto e prezzi',   String(Math.round(2 + r() * 8)),  'luglio',  'due su cinque'],
        ['Accoglienza',      String(Math.round(1 + r() * 6)),  'agosto',  'nessuna'],
        ['Pulizia',          String(Math.round(r() * 4)),      'maggio',  'tutte'],
      ]});
  }

  return blocchi;
}
