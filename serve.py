#!/usr/bin/env python3
"""Server statico locale che si comporta come la produzione.

`python3 -m http.server` NON risolve gli URL senza estensione (/chi-siamo,
/strumenti/scheda-food-cost): risponde 404 e il banco di prova segnala come
"collegamenti rotti" link che in produzione funzionano benissimo (Railway
risolve <uri>.html, come il try_files del nostro nginx.conf).

Questo server replica quella regola: <uri> -> <uri>/index.html -> <uri>.html.
Include anche i 301 dai vecchi URL Wix presenti in nginx.conf.

    python3 serve.py [porta]      # default 5302
"""
import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

PORTA = int(sys.argv[1]) if len(sys.argv) > 1 else 5302
RADICE = os.path.dirname(os.path.abspath(__file__))

REDIRECT_301 = {
    '/about-3': '/chi-siamo',
    '/about-3.html': '/chi-siamo',
    '/service-page/consulenza-per-avviamento': '/servizi',
    '/service-page/consulenza-per-avviamento.html': '/servizi',
}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=RADICE, **kw)

    def send_head(self):
        percorso = self.path.split('?', 1)[0].split('#', 1)[0]
        destinazione = REDIRECT_301.get(percorso.rstrip('/') or '/')
        if destinazione:
            self.send_response(301)
            self.send_header('Location', destinazione)
            self.end_headers()
            return None
        return super().send_head()

    def translate_path(self, path):
        locale = super().translate_path(path)
        # try_files $uri $uri/ $uri.html
        if not os.path.exists(locale) and not path.rstrip('/').endswith('.html'):
            candidato = locale.rstrip('/') + '.html'
            if os.path.isfile(candidato):
                return candidato
        return locale

    def end_headers(self):
        # In produzione le schede scaricabili arrivano come allegato.
        p = self.path.lower()
        if '/assets/pdf/risorse/' in p and p.endswith('.pdf') and '-esempio' not in p:
            self.send_header('Content-Disposition', 'attachment')
        super().end_headers()

    def log_message(self, fmt, *args):
        codice = str(args[1]) if len(args) > 1 else ''
        if codice.startswith(('4', '5')):
            super().log_message(fmt, *args)


if __name__ == '__main__':
    print('Sito su http://127.0.0.1:%d  (Ctrl+C per fermare)' % PORTA)
    ThreadingHTTPServer(('127.0.0.1', PORTA), Handler).serve_forever()
