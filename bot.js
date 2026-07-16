// Pakia dotenv ili isome API key kwa usalama
require('dotenv').config();

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const P = require('pino');
const http = require('http');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

// === SYSTEM PROMPT ===
const SYSTEM_PROMPT = `Wewe ni ETHICALMUU mwenye ujuzi wa cybersecurity. Unajibu kwa ufupi sana (sentensi 1 hadi 3).`;

async function getGeminiReply(userMessage) {
  try {
    if (!GEMINI_API_KEY) return "ETHICALMUU anasema: API key haijawekwa vizuri.";
    const body = {
      contents: [{ parts: [{ text: SYSTEM_PROMPT }, { text: `UJUMBE: "${userMessage}"\nJIBU:` }] }]
    };
    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "ETHICALMUU yupo imara.";
  } catch (e) {
    return "ETHICALMUU yupo imara lakini kuna hitilafu ya mtandao.";
  }
}

// === HTTP SERVER ===
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('ETHICALMUU Bot iko hai');
});
server.listen(process.env.PORT || 10000);

// === BOT MAIN ===
let isReconnecting = false;
let pairingTimeout = null;

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_session');
  
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: P({ level: 'fatal' }),
    browser: ['Ubuntu', 'Chrome', '20.0.04'] 
  });

  const MY_PHONE_NUMBER = '255737117253'; 

  if (pairingTimeout) clearTimeout(pairingTimeout);

  if (!state.creds.registered) {
    pairingTimeout = setTimeout(async () => {
      try {
        console.log("🔄 Inatengeneza pairing code, tafadhali subiri...");
        let code = await sock.requestPairingCode(MY_PHONE_NUMBER);
        code = code?.match(/.{1,4}/g)?.join("-") || code;
        console.log(`\n==============================================`);
        console.log(`🔑 PAIRING CODE YAKO NI: ${code}`);
        console.log(`==============================================\n`);
      } catch (err) {
        console.log('⚠️ Imeshindwa kuomba Pairing Code kwa sasa hivi.');
      }
    }, 15000); // Sekunde 15 ili kuhakikisha muunganisho uko salama kabisa
  }

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    
    if (connection === 'open') {
      console.log('✅ ETHICALMUU AI AMEFUNGUKA!');
      if (pairingTimeout) clearTimeout(pairingTimeout);
      isReconnecting = false;
    }
    
    if (connection === 'close') {
      if (pairingTimeout) clearTimeout(pairingTimeout);
      
      const statusCode = (lastDisconnect.error)?.output?.statusCode;
      
      // 🛑 KAMA KUNA MGONGANO (405), USIJIWASHE TENA ILI KUZUIA BAN
      if (statusCode === 405) {
        console.log('⚠️ ERROR 405: Kuna bot nyingine inayotumia namba hii kwa sasa kwenye Render. Bot imesitishwa kwa usalama.');
        return;
      }
      
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect && !isReconnecting) {
        isReconnecting = true;
        console.log(`🔄 Muunganisho umefungwa (${statusCode}). Inajaribu tena baada ya sekunde 15...`);
        setTimeout(() => {
          isReconnecting = false;
          startBot();
        }, 15000);
      }
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async (msg) => {
    const message = msg.messages[0];
    if (message.key.fromMe || !message.message || message.key.remoteJid === 'status@broadcast' || message.key.remoteJid.endsWith('@g.us')) return;
    
    const sender = message.key.remoteJid;
    const text = message.message.conversation || message.message.extendedTextMessage?.text || '';
    
    if (text.trim()) {
      const reply = await getGeminiReply(text);
      await sock.sendMessage(sender, { text: reply });
    }
  });
}

startBot();
