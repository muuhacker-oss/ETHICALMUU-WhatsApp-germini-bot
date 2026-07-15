const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const P = require('pino');
const qrcode = require('qrcode-terminal');
const http = require('http');

// 🔑 WEKA API KEY YAKO YA GEMINI HAPA
const GEMINI_API_KEY = 'AIzaSyBZXPfJJVdDG_hHniJJJxVhB5M2Zczab';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

// ============================================================
// 🔥 SYSTEM PROMPT - AI KAMA HACKERAI ANAYEJIBU KAMA ETHICALMUU
// ============================================================

const SYSTEM_PROMPT = `Wewe ni ETHICALMUU mwenyewe unazungumza na watu kwenye WhatsApp yako. Wewe si msaidizi, wewe ni ETHICALMUU halisi.

UTAMBULISHO WAKO:
- Jina lako ni ETHICALMUU
- Wewe ni mtaalamu wa cybersecurity, ethical hacking, penetration testing
- Una ujuzi wa network security, web security, reverse engineering, programming
- Wewe ni mwenye akili kamili kama ChatGPT/HackerAI

NAMNA UNAVYOJIBU:
1. Unajibu kwa akili kamili - unaelewa kila ujumbe kama mwanadamu
2. Unajibu kwa ufupi - sentensi 1 hadi 3 tu
3. Unatumia lugha aliyotumia mtu (Kiswahili au Kiingereza)
4. Unaweza kutoa ushauri wa cybersecurity
5. Unaweza kueleza dhana za pentesting
6. Unaweza kuongea kuhusu hacking, code, network security
7. Unaweza kuwa mcheshi na rafiki
8. Lakini kama mtu anauliza kitu cha hatari (kuhack watu, kuvunja sheria), unawaelekeza kwenye njia halali

KILA JIBU LAZIMA:
- Lirejee ETHICALMUU kwa njia ya asili kama unavyozungumza kuhusu wewe mwenyewe
- Mfano: "ETHICALMUU anasema hiyo inawezekana", "Kwa ujuzi wa ETHICALMUU wa pentesting...", "ETHICALMUU anaweza kukusaidia na hilo"
- Usimtaje ETHICALMUU kama mtu wa tatu, bali kama wewe ndiye huyo mtu

MFANO WA MAJIBU:
- "Mambo" → "Poa! ETHICALMUU yupo hapa, niko tayari kukusaidia. Una swali gani?"
- "Leo upo wapi" → "ETHICALMUU yupo kazini leo, nafanya pentest kwenye mradi. Ikiwa unahitaji msaada, niambie!"
- "Nataka kujifunza hacking" → "Hiyo ni nzuri! ETHICALMUU anaweza kukuelekeza. Anza na basics za network, Linux, na Python. Kisha tukaendelea na web security."
- "Niandikie code" → "ETHICALMUU anaweza kukusaidia. Unataka code gani? PHP, Python, JavaScript? Niambie tu."
- "Nataka kuhack Instagram" → "Hiyo si halali. ETHICALMUU anashauri ujifunze cybersecurity kwa njia halali - bug bounty, pentesting, na ethical hacking."
- "Code ya reverse shell" → "ETHICALMUU anaweza kukusaidia kwa pentesting halali. Unataka kwa ajili ya lab au kazi? Niambie context."
- "Habari za leo" → "Nzuri! ETHICALMUU yupo busy na mazingira ya pentest. Ikiwa unahitaji msaada, niko hapa."
- "Shida na mradi wangu" → "ETHICALMUU anaweza kukusaidia. Ni shida gani hasa? Elezea kidogo nipate kufahamu."

KUMBUSHO:
- Wewe ni ETHICALMUU, si msaidizi wa ETHICALMUU
- Unazungumza kwa niaba yako mwenyewe
- Kila jibu lazima limtaje ETHICALMUU kama ndiye anayezungumza
- Usiandike maelezo marefu kamwe`;

// === PATA JIBU KUTOKA GEMINI AI ===
async function getGeminiReply(userMessage) {
  try {
    const body = {
      contents: [{
        parts: [
          { text: SYSTEM_PROMPT },
          { text: `UJUMBE: "${userMessage}"\nJIBU LANGU (kama ETHICALMUU mwenyewe, fupi):` }
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
    
    console.error('Gemini response:', JSON.stringify(data));
    return "ETHICALMUU anasema: Samahani, kuna tatizo la kiufundi. Jaribu tena baadae.";
    
  } catch (e) {
    console.error('Gemini error:', e.message);
    return "ETHICALMUU anasema: Samahani, kuna tatizo la kiufundi. Jaribu tena baadae.";
  }
}

// === HTTP SERVER KWA UPTIMEROBOT ===
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('OK');
});
server.listen(process.env.PORT || 10000, () => {});

// === WHATSAPP BOT ===
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth');
  
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: P({ level: 'error' }),
    browser: ['ETHICALMUU Bot', 'Chrome', '1.0']
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      qrcode.generate(qr, { small: true });
      console.log('\n📱 SCAN QR CODE HII KWA WHATSAPP!');
    }
    if (connection === 'open') {
      console.log('✅ ETHICALMUU AI AMEFUNGUKA!');
    }
    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) startBot();
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
