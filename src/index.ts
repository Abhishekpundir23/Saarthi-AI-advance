import express from 'express';
import { IncomingMessage } from './types.js';
import { orchestrateMessage } from './agents/agentManager.js';
import { sendWhatsAppMessage, parseTwilioIncoming, verifyTwilioSignature } from './providers/twilioProvider.js';
import { sendWhatsAppReply } from './mock/whatsappProvider.js';
import { config } from './config.js';

const app = express();
app.use(express.json());
app.use(
  express.urlencoded({
    extended: false,
    verify: (req, _res, buf) => {
      (req as any).rawBody = buf.toString();
    },
  })
);

app.post('/webhook', async (req, res) => {
  const payload = req.body as IncomingMessage;

  if (!payload || !payload.from || !payload.type) {
    return res.status(400).json({ ok: false, error: 'Invalid payload' });
  }

  try {
    const response = await orchestrateMessage(payload);
    const reply = response.reply ?? 'I am sorry, something went wrong while preparing your response.';
    await sendWhatsAppReply(payload.from, reply);
    return res.status(200).json({ ok: true, response });
  } catch (error) {
    console.error('Webhook orchestration failed:', error);
    return res.status(500).json({ ok: false, error: 'Processing failed' });
  }
});

app.post('/twilio/webhook', async (req, res) => {
  const rawBody = (req as any).rawBody ?? '';
  // Use HTTPS for signature validation since ngrok forwards HTTPS to HTTP
  const webhookUrl = `https://${req.get('host')}${req.originalUrl}`;

  console.log('Received Twilio webhook:', {
    url: webhookUrl,
    headers: {
      'x-twilio-signature': req.headers['x-twilio-signature'],
      'Content-Type': req.headers['content-type'],
    },
    body: req.body,
  });

  if (!verifyTwilioSignature(webhookUrl, req.headers, rawBody)) {
    console.warn('Invalid Twilio signature');
    return res.status(401).send('Invalid signature');
  }

  const payload = parseTwilioIncoming(req.body);
  console.log('Parsed Twilio incoming payload:', payload);

  try {
    const response = await orchestrateMessage(payload);
    const reply = response.reply ?? 'I am sorry, something went wrong while preparing your response.';
    await sendWhatsAppMessage(payload.from, reply);
    res.type('text/xml');
    return res.send('<Response></Response>');
  } catch (error) {
    console.error('Twilio webhook processing failed:', error);
    return res.status(500).send('<Response></Response>');
  }
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.get('/', (_req, res) => {
  res.send('WhatsApp AI Employee prototype is running.');
});

const port = config.port;
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
  console.log(`Twilio mode: ${config.useTwilio ? 'enabled' : 'disabled'}`);
  if (!config.useTwilio) {
    console.log('Twilio credentials not found. Replies will use mock transport.');
  }
});
