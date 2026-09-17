# Console SB · prototipo

La console che userebbe Simone per seguire la rete dei locali.
Progetto statico: nessuna dipendenza da installare, nessun build.

## Come si apre

```bash
cd /Volumes/Programmazione/sbfc_console
python3 serve.py 5310
```

Poi apri **http://127.0.0.1:5310** nel browser.

## Cosa contiene

| File | Cosa c'è dentro |
|---|---|
| `index.html` | L'impianto della pagina |
| `assets/stile.css` | Tutto il disegno: colori, tipografia, impaginazione |
| `assets/dati.js` | I dodici locali e i parametri per tipologia |
| `assets/diagnosi.js` | **La scomposizione degli scostamenti**: le cause, le prove, le mosse |
| `assets/app.js` | La logica: calcolo degli stati, grafici, navigazione |

## La cosa che conta

La linguetta **Diagnosi** non dice «il food cost è alto, fai menu engineering».
Scompone lo scostamento nelle sue cause con i numeri di ciascuna, incrociando
scontrini della cassa, ricettario e scarichi dai tag del magazzino:

> +6,2 punti di food cost, di cui
> +2,1 il fiordilatte che costa il 18% in più dal 5 agosto
> +1,7 il consumo oltre ricetta (145 g a pizza invece di 120)
> +1,6 il mix spostato su tre pizze a margine basso
> +0,8 lo scarto impasto del lunedì

Ogni causa porta la prova (quale fattura, quale scarico, quale scontrino) e la
mossa specifica per quella causa.

## Dati

Tutto inventato: locali, numeri, titolari, note di visita. Le foto vengono da un
servizio di immagini segnaposto. Serve a far vedere come funziona il sistema.

## assets/misure.js

Gli strumenti che installiamo in un locale e i dati che ognuno produce.

- `STRUMENTI` — cassa in cloud, tag NFC di magazzino, badge di presenza, app
  delle checklist, sonde di temperatura, placca NFC recensioni, telecamere con
  analisi. Per ognuno: cosa raccoglie e con che frequenza.
- `SORGENTE` — da quali strumenti nasce ogni parametro.
- `ALIMENTA` — quali parametri alimenta ogni strumento (il giro inverso).
- `misure(locale, parametro)` — le misure grezze dietro un numero, ricostruite
  in modo deterministico dai dati del locale: stesso locale, stessi numeri.

La linguetta Diagnosi mostra un quadrante circolare per parametro. Si clicca:
se il parametro è fuori, sotto compare la scomposizione dello scostamento
(`diagnosi.js`); altrimenti compaiono le misure che lo compongono. In fondo,
sempre, da dove arriva il numero.

## assets/grafici.js

Le tabelle di dati diventano grafici. La forma la sceglie il contenuto:

- **due colonne confrontabili** (teorico contro reale, ultimo acquisto contro
  listino, atteso contro presente) → barra del valore con la tacca bianca sul
  riferimento. Se l'unità è la stessa in tutta la tabella le righe stanno sulla
  stessa scala, se cambia riga per riga (chili e litri) ogni riga si misura su sé.
- **tre o più colonne della stessa unità** → andamento a colonnine, l'ultima è
  il valore di oggi, con il delta rispetto al primo periodo.
- **una sola colonna numerica** → barre semplici. Se la tabella ha una colonna
  di giudizio, è il giudizio a colorare la barra.
- **percentuali che sono una quota** → scala fissa 0-100, così il 50 per cento
  non riempie la riga.
- **niente di confrontabile** (unità diverse, testo) → resta una tabella: meglio
  una tabella di un grafico che mente.

### Il colore

Verde quando il dato sta dove deve, rosso quando no. Non è il grafico a
deciderlo: ogni blocco dichiara `verso: 'alto'` se più è meglio, `'basso'` se
meno è meglio, e il confronto è sempre contro una colonna di riferimento
(atteso, teorico, soglia, obiettivo, standard, media della rete). Senza questa
dichiarazione la barra resta neutra: una composizione — chi compila, cosa si
beve — non è buona né cattiva, è solo un mix.

Quando la tabella ha una colonna di giudizio è quella a comandare il colore.

Sotto ogni grafico il pulsante "I numeri" riapre la tabella esatta.
