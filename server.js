const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "alma123";
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

app.get("/", (req, res) => {
  res.send("WhatsApp-Telegram Bot Running");
});

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

async function sendWhatsAppText(to, text) {
  await axios.post(
    `https://graph.facebook.com/v25.0/${PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    },
    {
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );
}

app.post("/webhook", async (req, res) => {
  try {
    console.log("Incoming webhook:", JSON.stringify(req.body));

    const message = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (message) {
      const from = message.from;
      const text = message.text?.body || "[Non-text message]";

      console.log(`Message from ${from}: ${text}`);

      if (TELEGRAM_TOKEN && TELEGRAM_CHAT_ID) {
        await axios.post(
          `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
          {
            chat_id: TELEGRAM_CHAT_ID,
            text: `📱 WhatsApp Message\n\n👤 From: ${from}\n💬 ${text}`,
          }
        );
      }

      const lowerText = text.toLowerCase();

      if (
        lowerText.includes("catalog") ||
        lowerText.includes("list") ||
        lowerText.includes("price") ||
        lowerText.includes("offer")
      ) {
        const catalog1 = `📢 ALMA TECH DUBAI – JUNE 2026 CATALOG

⌚ Redmi & Xiaomi
• Redmi Buds 8 Active – 58 AED
• Redmi Buds 8 Pro – 197 AED
• Redmi Watch 5 Lite – 134 AED
• Redmi Watch 5 Active – 92 AED
• Xiaomi Band 10 – 129 AED

🎧 Anker Soundcore
• Liberty 5 – 145 AED
• R60i NC – 70 AED
• R50i NC – 51 AED
• C50i – 120 AED

⌚ Kieslect
• Actor Leading – 205 AED
• Actor – 175 AED
• KS3 Elite – 155 AED
• KS3 – 140 AED
• KS Note 3 – 145 AED
• KR2 Pro – 175 AED
• KR2 LTD – 110 AED
• Balance – 80 AED
• Balance Edge – 85 AED
• Lora 3 – 180 AED
• Pura ELE – 80 AED
• Earbuds Open – 65 AED`;

        const catalog2 = `⌚ Haylou
• Watch S6 – 60 AED
• Solar 5 – 140 AED
• Solar Ultra – 150 AED
• Watch 4S – 110 AED
• Vibe – 100 AED
• Watch 3 – 85 AED
• Solar Neo 2 – 90 AED

⌚ Huawei
• Watch Fit 4 – 325 AED
• Watch Fit 4 Pro – 435 AED
• Watch Fit 5 – 425 AED
• Watch Fit 5 Pro – 725 AED
• GT6 Pro Titanium – 1175 AED
• GT5 Pro Titanium – 860 AED
• Watch D2 Blue – 1070 AED
• Band 11 – 105 AED
• Band 11 Pro – 195 AED

Huawei Audio
• FreeBuds SE 2 – 63 AED
• FreeClip – 375 AED
• FreeBuds SE 4 NC – 148 AED
• FreeBuds Pro 5 – 505 AED`;

        const catalog3 = `⌚ Samsung
• Galaxy Watch 8 (44mm) Silver – 680 AED
• Galaxy Watch 8 Classic – From 760 AED
• Galaxy Watch Ultra 2025 – From 1050 AED

Samsung Audio
• Galaxy Buds 4 – From 380 AED
• Galaxy Buds 4 Pro – From 560 AED
• Galaxy Buds 3 FE – 205 AED
• Galaxy Buds 3 Pro – 395 AED

🎧 CMF by Nothing
• Buds 2A – 65 AED
• Buds 2 Plus – 105 AED
• Buds Pro 2 – 120 AED
• Watch Pro 2 – 139 AED
• Watch 3 Pro – 230 AED
• Headphone Pro – 230 AED
• Ear – 340 AED
• Ear A – 160 AED
• Ear Open – 315 AED`;

        const catalog4 = `🔊 JBL Speakers
• Go 5 – 149 AED
• Clip 5 – 199 AED
• Flip 7 – 270 AED
• Charge 6 – 370 AED
• Xtreme 5 – 970 AED

PartyBox Series
• Encore Essential 2 – 640 AED
• On-The-Go 2 (1 Mic) – 840 AED
• PartyBox 120 – 850 AED
• PartyBox 320 – 1210 AED
• PartyBox 520 – 1540 AED
• PartyBox 720 – 1990 AED
• PartyBox Ultimate – 3120 AED

🔊 Harman Kardon
• Onyx Studio 9 – 480 AED
• Luna 2 – 445 AED
• Go + Play 3 – 735 AED
• Aura Studio 5 – 740 AED
• SoundSticks 5 – 950 AED`;

        const catalog5 = `🎧 JBL Headphones
• Tune 305 – 39.5 AED
• Tune 310 – 39.5 AED
• Tune 530 – 97 AED
• Tune 730 – 125 AED
• Tune 780 – 185 AED
• Endurance Race 2 – 189 AED
• Soundgear Clips – 335 AED
• Live Beam 3 – 375 AED
• Live Flex 3 – 385 AED
• Tour Pro 3 – 720 AED
• Tour One M3 Smart – 920 AED

📺 JBL Soundbars
• Bar 2.1 Deep Bass MK2 – 695 AED
• Bar 580 – 790 AED
• Bar 500 MK2 – 1290 AED
• Bar 800 MK2 – 1890 AED
• Bar 1300 MK2 – 3830 AED

📍 ALMA TECH Dubai
📲 WhatsApp: +971 55 140 0474`;

        await sendWhatsAppText(from, catalog1);
        await sendWhatsAppText(from, catalog2);
        await sendWhatsAppText(from, catalog3);
        await sendWhatsAppText(from, catalog4);
        await sendWhatsAppText(from, catalog5);

        console.log("Catalog sent to WhatsApp");
      } else if (
        lowerText.includes("hi") ||
        lowerText.includes("hello") ||
        lowerText.includes("سلام")
      ) {
        const reply = `Hello 👋

Thank you for contacting ALMA TECH Dubai.

For our latest product catalog and offers, please reply with:

CATALOG

📍 ALMA TECH Dubai
📲 WhatsApp: +971 55 140 0474`;

        await sendWhatsAppText(from, reply);
        console.log("Welcome reply sent to WhatsApp");
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("Webhook Error:", error.response?.data || error.message);
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
