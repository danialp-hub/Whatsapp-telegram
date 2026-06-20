const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "alma123";
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

const LEADS_FILE = path.join(__dirname, "leads.json");
const LISTS_DIR = path.join(__dirname, "broadcast_lists");

const DEFAULT_BROADCAST_LIMIT = Number(process.env.DEFAULT_BROADCAST_LIMIT || 250);
const BROADCAST_DELAY_MS = Number(process.env.BROADCAST_DELAY_MS || 2500);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizePhone(value) {
  let phone = String(value || "").trim();
  phone = phone.replace(/\s+/g, "");
  phone = phone.replace(/[^\d+]/g, "");

  if (phone.startsWith("+")) phone = phone.slice(1);
  if (phone.startsWith("00")) phone = phone.slice(2);

  return phone;
}

function readCSVPhones(listName) {
  const safeName = String(listName || "").replace(/[^\w.-]/g, "");
  const filePath = path.join(LISTS_DIR, `${safeName}.csv`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`List not found: ${safeName}`);
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/).map(x => x.trim()).filter(Boolean);

  const phones = [];

  for (const line of lines) {
    if (line.toLowerCase() === "phone") continue;

    const phone = normalizePhone(line.split(",")[0]);

    if (phone.length >= 8 && phone.length <= 15) {
      phones.push(phone);
    }
  }

  return [...new Set(phones)];
}

function getLists() {
  if (!fs.existsSync(LISTS_DIR)) return [];

  return fs.readdirSync(LISTS_DIR)
    .filter(file => file.toLowerCase().endsWith(".csv"))
    .map(file => file.replace(/\.csv$/i, ""))
    .sort();
}

function readLeads() {
  try {
    if (!fs.existsSync(LEADS_FILE)) {
      fs.writeFileSync(LEADS_FILE, JSON.stringify([], null, 2));
    }

    return JSON.parse(fs.readFileSync(LEADS_FILE, "utf8") || "[]");
  } catch {
    return [];
  }
}

function saveLead(phone, message) {
  const leads = readLeads();

  leads.push({
    phone,
    message,
    date: new Date().toISOString(),
  });

  fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2));
  console.log("Lead saved:", phone, message);
}

function getLeadsText() {
  const leads = readLeads();

  if (!leads.length) return "No leads saved yet.";

  const last = leads.slice(-20).reverse();

  return "📋 Last Leads:\n\n" + last.map((lead, i) =>
    `${i + 1}. ${lead.phone}\n💬 ${lead.message}\n🕒 ${lead.date}`
  ).join("\n\n");
}

async function sendTelegram(text) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) return;

  await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    chat_id: TELEGRAM_CHAT_ID,
    text,
  });
}

async function sendWhatsAppText(to, text) {
  await axios.post(
    `https://graph.facebook.com/v25.0/${PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: "whatsapp",
      to: normalizePhone(to),
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

async function sendWhatsAppTemplate(to, templateName, languageCode = "en") {
  await axios.post(
    `https://graph.facebook.com/v25.0/${PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: "whatsapp",
      to: normalizePhone(to),
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
      },
    },
    {
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );
}

function extractPhoneFromTelegramMessage(text) {
  if (!text) return null;

  const match = text.match(/From:\s*(\d+)/i);
  if (match && match[1]) return match[1];

  const fallback = text.match(/\b\d{8,15}\b/);
  if (fallback && fallback[0]) return fallback[0];

  return null;
}

async function runBroadcast(listName, templateName, limit) {
  const phones = readCSVPhones(listName).slice(0, limit);

  let success = 0;
  let failed = 0;
  const failedNumbers = [];

  await sendTelegram(
    `🚀 Broadcast started\n\nList: ${listName}\nTemplate: ${templateName}\nTotal: ${phones.length}`
  );

  for (let i = 0; i < phones.length; i++) {
    const phone = phones[i];

    try {
      await sendWhatsAppTemplate(phone, templateName, "en");
      success++;
      console.log(`[Broadcast] Sent ${i + 1}/${phones.length}: ${phone}`);
    } catch (error) {
      failed++;
      failedNumbers.push(phone);
      console.error("[Broadcast Error]", phone, error.response?.data || error.message);
    }

    if ((i + 1) % 25 === 0) {
      await sendTelegram(
        `📊 Progress\n\nList: ${listName}\nDone: ${i + 1}/${phones.length}\nSuccess: ${success}\nFailed: ${failed}`
      );
    }

    await sleep(BROADCAST_DELAY_MS);
  }

  let report = `✅ Broadcast finished\n\nList: ${listName}\nSuccess: ${success}\nFailed: ${failed}`;

  if (failedNumbers.length) {
    report += `\n\nFailed numbers:\n${failedNumbers.slice(0, 20).join("\n")}`;
  }

  await sendTelegram(report);
}

app.get("/", (req, res) => {
  res.send("ALMA DXB WhatsApp Telegram Broadcast Bot Running");
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

app.post("/telegram", async (req, res) => {
  try {
    const message = req.body?.message;
    const text = message?.text || "";

    if (!message || !text) return res.sendStatus(200);

    if (message.reply_to_message && !text.startsWith("/")) {
      const originalText = message.reply_to_message.text || "";
      const phone = extractPhoneFromTelegramMessage(originalText);

      if (!phone) {
        await sendTelegram("❌ Phone number not found in replied message.");
        return res.sendStatus(200);
      }

      await sendWhatsAppText(phone, text);
      await sendTelegram(`✅ Reply sent:\n${phone}\n\n${text}`);
      return res.sendStatus(200);
    }

    if (text === "/start" || text === "/help") {
      await sendTelegram(
`ALMA DXB Bot Commands ✅

/lists
/leads
/send 971501234567 Your message
/broadcast LIST_NAME TEMPLATE_NAME LIMIT

Examples:
/broadcast Broadcast_250_1 alma_text 250
/broadcast Iran_Part1 alma_text 100
/broadcast Nigeria alma_text 36

Your current Meta limit is 250 business-initiated conversations per 24h.`
      );
      return res.sendStatus(200);
    }

    if (text === "/lists") {
      const lists = getLists();
      await sendTelegram(lists.length ? `📂 Lists:\n\n${lists.join("\n")}` : "No lists found.");
      return res.sendStatus(200);
    }

    if (text === "/leads") {
      await sendTelegram(getLeadsText());
      return res.sendStatus(200);
    }

    if (text.startsWith("/send ")) {
      const parts = text.split(" ");
      const phone = parts[1];
      const msg = parts.slice(2).join(" ");

      if (!phone || !msg) {
        await sendTelegram("❌ Use:\n/send 971501234567 Your message");
        return res.sendStatus(200);
      }

      await sendWhatsAppText(phone, msg);
      await sendTelegram(`✅ Sent:\n${phone}\n\n${msg}`);
      return res.sendStatus(200);
    }

    if (text.startsWith("/broadcast ")) {
      const parts = text.split(" ");
      const listName = parts[1];
      const templateName = parts[2] || "alma_text";
      const requestedLimit = Number(parts[3] || DEFAULT_BROADCAST_LIMIT);
      const limit = Math.min(requestedLimit, DEFAULT_BROADCAST_LIMIT);

      if (!listName || !templateName) {
        await sendTelegram("❌ Use:\n/broadcast Broadcast_250_1 alma_text 250");
        return res.sendStatus(200);
      }

      res.sendStatus(200);

      runBroadcast(listName, templateName, limit).catch(async (error) => {
        console.error("Broadcast Error:", error.response?.data || error.message);
        await sendTelegram(`❌ Broadcast error:\n${error.response?.data?.error?.message || error.message}`);
      });

      return;
    }

    await sendTelegram("Unknown command. Send /help");
    return res.sendStatus(200);
  } catch (error) {
    console.error("Telegram Error:", error.response?.data || error.message);
    return res.sendStatus(500);
  }
});

app.post("/webhook", async (req, res) => {
  try {
    const value = req.body?.entry?.[0]?.changes?.[0]?.value;
    const message = value?.messages?.[0];

    if (!message) return res.sendStatus(200);

    const from = message.from;
    const text = message.text?.body || "[Non-text message]";

    console.log(`Message from ${from}: ${text}`);

    saveLead(from, text);

    await sendTelegram(`📱 WhatsApp Message\n\n👤 From: ${from}\n💬 ${text}`);

    const lower = text.toLowerCase();

    if (lower.includes("catalog") || lower.includes("list") || lower.includes("price") || lower.includes("offer")) {
      const reply = `📢 ALMA DXB

For our latest Smartwatch, Earbuds, Huawei, Samsung, JBL and Anker offers, our team will assist you shortly.

📲 WhatsApp: +971 55 140 0474`;

      await sendWhatsAppText(from, reply);
    } else if (lower.includes("hi") || lower.includes("hello") || lower.includes("سلام")) {
      const reply = `Hello 👋

Thank you for contacting ALMA DXB.

For our latest product catalog and offers, please reply:

CATALOG`;

      await sendWhatsAppText(from, reply);
    }

    return res.sendStatus(200);
  } catch (error) {
    console.error("Webhook Error:", error.response?.data || error.message);
    return res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
