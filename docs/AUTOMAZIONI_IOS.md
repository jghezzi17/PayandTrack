# 📲 Guida & Backup Automazioni iOS (Comandi Rapidi / Shortcuts)

Questo documento contiene:
1. **Il backup completo della vecchia logica basata su Apple Wallet** (per poter tornare indietro o ripristinarla in qualsiasi momento).
2. **La nuova logica basata sulle notifiche di Revolut e Intesa Sanpaolo** (per tracciare anche pagamenti online, abbonamenti e transazioni senza Apple Pay).
3. **Le formule Regex e le configurazioni HTTP** per l'invio a Supabase.

---

## ⚠️ Regola Fondamentale: Disattivare, NON Cancellare

Su iPhone, nell'app **Comandi Rapidi** (tab *Automazioni*):
- **NON cancellare l'automazione di Apple Wallet.**
- Aprila e disattiva semplicemente il selettore **"Abilita questa automazione"**.
- In questo modo la vecchia logica rimane salvata al 100% sul tuo telefono, senza cancellare alcuna azione o configurazione. Se vorrai ripristinarla, ti basterà riaccendere quel selettore!

---

## 🗄️ PARTE 1: Backup della Vecchia Logica (Apple Wallet)

Se in futuro desideri riattivare l'integrazione con Apple Wallet, ecco come è strutturata:

### 1. Trigger
- **Tipo:** Transazione (Apple Pay / Wallet)
- **Carta:** Seleziona carta specifica o "Qualsiasi carta"
- **Categoria / Esercente:** Qualsiasi
- **Opzione di esecuzione:** "Esegui immediatamente" (senza conferma)

### 2. Dati forniti nativamente da iOS:
- `Scorciatoia input > Importo` (Valore numerico della transazione)
- `Scorciatoia input > Esercente` (Nome dell'attività commerciale / negozio)
- `Data corrente` (Formato data ISO `YYYY-MM-DD`)

### 3. Azione HTTP verso Supabase:
- **Azione:** "Ottieni contenuti da URL"
- **URL:** `https://<TUO-ID-SUPABASE>.supabase.co/rest/v1/expenses`
- **Metodo:** `POST`
- **Intestazioni (Headers):**
  - `apikey`: `<LA_TUA_SUPABASE_ANON_KEY>`
  - `Authorization`: `Bearer <LA_TUA_SUPABASE_ANON_KEY>`
  - `Content-Type`: `application/json`
  - `Prefer`: `return=minimal`
- **Corpo della richiesta (JSON):**
  ```json
  {
    "title": "Esercente",
    "amount": Importo,
    "date": "Data corrente (formattata YYYY-MM-DD)"
  }
  ```

---

## 🚀 PARTE 2: Nuova Logica (Notifiche Revolut & Intesa Sanpaolo)

Questa nuova logica intercetta **ogni transazione**:
- Pagamenti fisici (contactless o inserimento PIN)
- Pagamenti online (Amazon, siti web, bonifici, inserimento manuale carta)
- Rinnovi automatici e abbonamenti (Spotify, Netflix, iCloud, ecc.)

---

### A. Automazione per REVOLUT

#### Formato tipico notifica Revolut:
> *"Hai speso 15,50 € da Amazon"*  
> oppure  
> *"Pagamento di 22,00 EUR a favore di Esselunga"*

#### 1. Creazione Trigger:
1. Apri **Comandi Rapidi** > tab **Automazioni** > premi **`+`**.
2. Seleziona **Notifica**.
3. **App:** Scegli **Revolut**.
4. **Il messaggio contiene:** inserisci `speso` oppure `€` (oppure lascia vuoto per intercettare ogni notifica di pagamento).
5. Seleziona **"Esegui immediatamente"** e disattiva *"Notifica quando viene eseguito"*.
6. Tocca **Avanti** > seleziona **"Nuova automazione vuota"**.

#### 2. Azioni nel comando:
1. **Prendi il testo della notifica:**
   - Aggiungi azione **"Testo"** con valore: `Scorciatoia input` (o il corpo della notifica).
2. **Estrai l'Importo (Regex):**
   - Azione **"Trova corrispondenze di testo"**:
     - Cerca pattern: `(\d+[,\.]\d{2})`
   - Azione **"Ottieni elemento dall'elenco"**:
     - Primo elemento dalle corrispondenze trovate.
   - Azione **"Sostituisci testo"**:
     - Sostituisci `,` (virgola) con `.` (punto) per avere il formato numerico corretto.
     - Assegna questa variabile a `ImportoSpesa`.
3. **Estrai l'Esercente:**
   - Azione **"Trova corrispondenze di testo"**:
     - Se la notifica è *"Hai speso ... da [Nome]"*:
       - Pattern regex: `(?<=da\s)(.+)$`
     - Se non vuoi usare regex per il nome, puoi estrarre il testo dopo "da" o prendere le ultime parole del testo.
     - Assegna a `NomeEsercente`.
4. **Data:**
   - Azione **"Data"**: `Data corrente` formattata come `YYYY-MM-DD`.
5. **Invia a Supabase (POST):**
   - Azione **"Ottieni contenuti da URL"**:
     - **URL:** `https://<TUO-ID-SUPABASE>.supabase.co/rest/v1/expenses`
     - **Metodo:** `POST`
     - **Intestazioni:**
       - `apikey`: `<LA_TUA_SUPABASE_ANON_KEY>`
       - `Authorization`: `Bearer <LA_TUA_SUPABASE_ANON_KEY>`
       - `Content-Type`: `application/json`
       - `Prefer`: `return=minimal`
     - **Corpo della richiesta (JSON):**
       ```json
       {
         "title": NomeEsercente,
         "amount": ImportoSpesa,
         "date": DataFormattata
       }
       ```

---

### B. Automazione per INTESA SANPAOLO

*(Assicurati che nell'app Intesa Sanpaolo siano attive le notifiche push per i movimenti della carta)*

#### Formato tipico notifica Intesa:
> *"Operazione con Carta ... di 18,30 EUR presso BAR CENTRALE"*  
> oppure  
> *"Pagamento di 25,00 EUR effettuato"*

#### 1. Creazione Trigger:
1. In **Comandi Rapidi** > **Automazioni** > premi **`+`**.
2. Seleziona **Notifica**.
3. **App:** Scegli **Intesa Sanpaolo**.
4. **Il messaggio contiene:** `EUR` o `Operazione` (per evitare notifiche di sicurezza/marketing).
5. Seleziona **"Esegui immediatamente"**.

#### 2. Azioni nel comando:
1. **Estrai l'Importo:**
   - Regex: `(\d+[,\.]\d{2})`
   - Sostituisci la virgola `,` con il punto `.`.
2. **Estrai l'Esercente:**
   - Se la notifica contiene *"presso [Nome]"*:
     - Pattern regex: `(?<=presso\s)(.+)$`
3. **Invia a Supabase:**
   - Stessa identica azione HTTP POST verso `/rest/v1/expenses`.

---

## 💡 Consiglio Pay & Track sull'Auto-Categorizzazione

In [src/App.jsx](file:///Users/jacopoghezzi/Desktop/PayandTrack/src/App.jsx) l'app include un sistema di **Auto-Categorizzazione Intelligente**:
- Quando la spesa arriva con un titolo come `Amazon`, `Esselunga`, `Deliveroo`, `Trenitalia` o `Tabacchi`, Pay & Track assegna automaticamente la categoria corretta.
- Se modifichi manualmente una spesa assegnandole una categoria (es. *"Bar Centrale"* -> *"Cibo"*), l'app lo ricorderà e categorizzerà in automatico tutti i futuri acquisti con quel nome.
