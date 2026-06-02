const express = require("express");
const axios = require("axios");

const app = express();

app.use(express.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

// Meta verification
app.get("/webhook", (req, res) => {
const mode = req.query["hub.mode"];
const token = req.query["hub.verify_token"];
const challenge = req.query["hub.challenge"];

if (mode && token === VERIFY_TOKEN) {
return res.status(200).send(challenge);
}

res.sendStatus(403);
});

// WhatsApp messages
app.post("/webhook", async (req, res) => {
try {
const message =
req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

if (message?.text?.body) {
await axios.post(
`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
{
chat_id: TELEGRAM_CHAT_ID,
text: message.text.body
}
);
}

res.sendStatus(200);
} catch (err) {
console.log(err);
res.sendStatus(500);
}
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
console.log("Server started");
});
