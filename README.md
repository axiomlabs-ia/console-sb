# Console SB

Prototipo della console che SB Food Consulting userebbe per seguire una rete di
locali con lo stesso format: parametri per tipologia, diagnosi dello scostamento
e misure che arrivano dagli strumenti installati nel locale.

Locali, nomi e numeri sono inventati. Serve a far vedere come funziona il
sistema, non a rappresentare clienti reali.

Sito statico, nessuna dipendenza da installare. In locale:

    python3 serve.py 5310

## Com'è fatto

| File | Cosa contiene |
|---|---|
| `assets/dati.js` | i parametri per tipologia e i dodici locali della rete |
| `assets/diagnosi.js` | la scomposizione degli scostamenti: cause, prove, mosse |
| `assets/misure.js` | gli strumenti installati e le misure che producono |
| `assets/grafici.js` | dalla tabella al grafico: la forma la sceglie il dato |
| `assets/app.js` | l'interfaccia: flotta, schede, quadranti |
| `assets/stile.css` | il linguaggio visivo |

Il dettaglio delle scelte è in `LEGGIMI.md`.
