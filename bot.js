// Pakia dotenv ili isome API key kwa usalama
require('dotenv').config();

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const P = require('pino');
const http = require('http');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Tumia Endpoint rasmi ya Gemini 2.0 Flash
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

// === SYSTEM PROMPT ===
const SYSTEM_PROMPT = "Wewe ni ETHICALMUU mwenye ujuzi wa cybersecurity. Unajibu kwa ufupi sana (sentensi 1 hadi 3).";

async function getGeminiReply(userMessage) {
  try {
    if (!GEMINI_API_KEY) {
      console.log("⚠️ API Key haipatikani kwenye Environment Variables!");
      return "ETHICALMUU anasema: API key haijawekwa vizuri.";
    }

    const body = {
      system_instruction: {
        parts: [{ text: SYSTEM_PROMPT }]
      },
      contents: [
        {
          role: "user",
          parts: [{ text: userMessage }]
        }
      ]
    };

    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await res.json();

    if (data.error) {
      console.error("Gemini API Error:", data.error);
      return "ETHICALMUU yupo imara lakini kuna tatizo la API key.";
    }

    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "ETHICALMUU yupo imara.";
  } catch (e) {
    console.error("Fetch Error:", e);
    return "ETHICALMUU yupo imara lakini kuna hitilafu ya mtandao.";
  }
}

// === HTTP SERVER (Inahitajika na Render) ===
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('ETHICALMUU Bot iko hai');
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`Server inakimbia kwenye port ${PORT}`);
});

// === BOT MAIN ===
let isReconnecting = false;
let pairingTimeout = null;

async function startBot() {
  // Folder la hifadhi ya Session
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
        console.log('⚠️ Imeshindwa kuomba Pairing Code kwa sasa hivi.', err);
      }
    }, 15000);
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
