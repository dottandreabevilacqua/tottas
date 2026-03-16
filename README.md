# 🦷 Tottas — Gestione Allineatori + Mari.a-ortho

Webapp per la gestione dei pazienti con allineatori dentali e assistente AI Mari.a-ortho.

## Deploy su Vercel (5 minuti)

1. Carica questo progetto su un repository GitHub
2. Vai su [vercel.com](https://vercel.com) e importa il repository
3. Aggiungi la variabile d'ambiente:
   - Nome: `ANTHROPIC_API_KEY`
   - Valore: la tua chiave API da [console.anthropic.com](https://console.anthropic.com)
4. Clicca **Deploy**

## Sviluppo locale

```bash
npm install
npm run dev
```

Per la chat AI in locale, crea un file `.env` con:
```
ANTHROPIC_API_KEY=sk-ant-...
```

## Struttura

- `src/App.jsx` — App principale (dashboard + chat Mari.a)
- `api/chat.js` — Serverless function per proxy API Anthropic (protegge la chiave)
- `vercel.json` — Configurazione deploy
