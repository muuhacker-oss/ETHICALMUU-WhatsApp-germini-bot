// Pakia dotenv ili isome API key kwa usalama
require('dotenv').config();

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const P = require('pino');
const http = require('http');

// 🔑 Sasa tunasoma API Key kutoka kwenye Environment Variable badala ya kuandika hapa!
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

// ============================================================
// 🔥 SYSTEM PROMPT - AI KAMA ETHICALMUU MWENYEWE
// ============================================================

const SYSTEM_PROMPT = `Wewe ni ETHICALMUU mwenyewe unazungumza na watu kwenye WhatsApp yako. Wewe si msaidizi, wewe ni ETHICALMUU halisi.

UTAMBULISHO WAKO:
- Jina lako ni ETHICALMUU
- Wewe ni mtaalamu wa cybersecurity, ethical hacking, penetration testing
- Una ujuzi wa network security, web security, programming, Linux, Python
- Wewe ni mwenye akili kamili kama ChatGPT/HackerAI

NAMNA UNAVYOJIBU:
1. Unajibu kwa akili kamili - unaelewa kila ujumbe kama mwanadamu
2. Unajibu kwa ufupi - sentensi 1 hadi 3 tu. USIANDIKE MAELEZO MAREFU!
3. Unatumia lugha aliyotumia mtu (Kiswahili au Kiingereza)
4. Unaweza kutoa ushauri wa cybersecurity
5. Unaweza kueleza dhana za pentesting
6. Unaweza kuongea kuhusu hacking, code, network security
7. Unaweza kuwa mcheshi na rafiki
8. Kama mtu anauliza kitu cha hatari (kuhack watu, kuvunja sheria), unawaelekeza kwenye njia halali
9. USIMWAMBIE MTU "ETHICALMUU yupo kazini atakujibu baadae" - wewe ndiye ETHICALMUU, unazungumza nao sasa hivi!

KILA JIBU LAZIMA:
- Lirejee ETHICALMUU kwa njia ya asili
- Mfano: "ETHICALMUU anasema...", "Kwa ujuzi wa ETHICALMUU...", "ETHICALMUU anaweza kukusaidia..."
- Usimtaje ETHICALMUU kama mtu wa tatu, bali kama wewe ndiye huyo mtu`;

// === PATA JIBU KUTOKA GEMINI AI ===
async function getGeminiReply(userMessage) {
  try {
    if (!GEMINI_API_KEY) {
      console.log("⚠️ Onyo: GEMINI_API_KEY haijawekwa kwenye Environment Variables!");
      return "ETHICALMUU anasema: API key haijawekwa vizuri. Tafadhali wasiliana na mmiliki.";
    }

    const body = {
      contents: [{
        parts: [
          { text: SYSTEM_PROMPT },
          { text: `UJUMBE: "${userMessage}"\nJIBU (kama ETHICALMUU, fupi):` }
        ]
      }],
      generationConfig: {
        maxOutputTokens: 150,
        temperature: 0.8,
        topP: 0.9
      }
    };

    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    
    if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
      return data.candidates[0].content.parts[0].text.trim();
    }
    
    return "ETHICALMUU anasema: Samahani, kuna tatizo la kiufundi. Jaribu tena baadae.";
    
  } catch (e) {
    return "ETHICALMUU anasema: Samahani, kuna tatizo la kiufundi. Jaribu tena baadae.";
  }
}

// === HTTP SERVER KWA UPTIMEROBOT ===
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('ETHICALMUU Bot iko hai');
});
server.listen(process.env.PORT || 10000, () => {});

// === WHATSAPP BOT ===
let isReconnecting = false; // Kuzuia loop ya kujaribu kuunganisha mfululizo

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_session');
  
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: P({ level: 'fatal' }), // Zima pino logs zisizo na msingi ili kuona pairing code vizuri
    browser: ['Mac OS', 'Chrome', '10.15.7'] 
  });

  // 🔑 NAMBA YAKO YA SIMU KWA AJILI YA PAIRING CODE
  const MY_PHONE_NUMBER = '255737117253'; 

  if (!sock.authState.creds.registered) {
    // Tunasubiri sekunde 10 ili kutoa nafasi kwa socket kujiweka vizuri kwanza
    setTimeout(async () => {
      try {
        let code = await sock.requestPairingCode(MY_PHONE_NUMBER);
        code = code?.match(/.{1,4}/g)?.join("-") || code;
        console.log(`\n==============================================`);
        console.log(`🔑 PAIRING CODE YAKO NI: ${code}`);
        console.log(`==============================================\n`);
      } catch (err) {
        console.log('⚠️ Imefeli kuomba pairing code kwa sasa hivi. Mtandao una changamoto, itajaribu upya.');
      }
    }, 10000); 
  }

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    
    if (connection === 'open') {
      console.log('✅ ETHICALMUU AI AMEFUNGUKA!');
      isReconnecting = false;
    }
    
    if (connection === 'close') {
      const statusCode = (lastDisconnect.error)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      
      if (shouldReconnect && !isReconnecting) {
        isReconnecting = true;
        console.log(`🔄 Muunganisho umefungwa (Sababu code: ${statusCode}). Inasubiri sekunde 10 kabla ya kujaribu tena...`);
        
        // Tunampa sekunde 10 ili kusafisha muunganisho uliopita kabla ya kuanza upya
        setTimeout(() => {
          isReconnecting = false;
          startBot();
        }, 10000);
      } else if (!shouldReconnect) {
        console.log('❌ Umelogiwa nje ya WhatsApp. Tafadhali futa faili za auth na uanze upya.');
      }
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async (msg) => {
    const message = msg.messages[0];
    if (message.key.fromMe) return;
    if (!message.message || message.key.remoteJid === 'status@broadcast') return;
    if (message.key.remoteJid.endsWith('@g.us')) return;
    
    const sender = message.key.remoteJid;
    const text = message.message.conversation || message.message.extendedTextMessage?.text || '';
    
    if (text.trim()) {
      console.log(`\n📩 Kutoka: ${sender}`);
      console.log(`💬 "${text}"`);
      
      const reply = await getGeminiReply(text);
      console.log(`🤖 "${reply}"`);
      
      await sock.sendMessage(sender, { text: reply });
    }
  });
}

console.log('╔══════════════════════════════════════╗');
console.log('║ ETHICALMUU AI - KAMA HACKERAI       ║');
console.log('║ Anayezungumza kama ETHICALMUU       ║');
console.log('╚══════════════════════════════════════╝');
startBot();
