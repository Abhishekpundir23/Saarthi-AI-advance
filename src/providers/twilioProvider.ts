import axios from 'axios';
import dns from 'node:dns';
import twilio from 'twilio';
import { IncomingMessage } from '../types.js';
import { config } from '../config.js';

async function ensureTwilioDns(): Promise<void> {
  try {
    await dns.promises.lookup('api.twilio.com', { family: 4 });
  } catch (_error) {
    console.warn('Default DNS lookup failed for api.twilio.com; using public resolvers');
    const resolver = new dns.promises.Resolver();
    resolver.setServers(['8.8.8.8', '1.1.1.1']);
    const addresses = await resolver.resolve4('api.twilio.com');
    if (!addresses || addresses.length === 0) {
      throw new Error('Unable to resolve api.twilio.com via fallback DNS.');
    }
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  }
}

export async function sendWhatsAppMessage(to: string, message: string): Promise<void> {
  if (!config.useTwilio || !config.twilio.accountSid || !config.twilio.authToken) {
    console.log(`\n--- WhatsApp mock reply to ${to} ---\n${message}\n-----------------------------\n`);
    return;
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${config.twilio.accountSid}/Messages.json`;
  const whatsappFrom = config.twilio.whatsappFrom as string;
  const body = new URLSearchParams({
    To: to,
    From: whatsappFrom,
    Body: message,
  }).toString();

  console.log(`Sending WhatsApp message to ${to}`);

  await ensureTwilioDns();

  const response = await axios.post(url, body, {
    auth: {
      username: config.twilio.accountSid,
      password: config.twilio.authToken,
    },
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    proxy: false,
    timeout: 30000,
  });

  console.log(`Twilio send result: ${response.data.sid}`);
}

export function parseTwilioIncoming(body: Record<string, any>): IncomingMessage {
  const text = String(body.Body || '').trim();
  const numMedia = Number(body.NumMedia || 0);
  const mediaType = numMedia > 0 ? String(body.MediaContentType0 || '').toLowerCase() : '';

  return {
    id: String(body.MessageSid || body.SmsMessageSid || Date.now()),
    from: String(body.From || 'unknown'),
    type: mediaType.startsWith('audio') ? 'audio' : 'text',
    text: mediaType.startsWith('audio') ? undefined : text,
    audioUrl: numMedia > 0 ? String(body.MediaUrl0) : undefined,
    timestamp: new Date().toISOString(),
  };
}

export function verifyTwilioSignature(
  url: string,
  headers: Record<string, string | string[] | undefined>,
  rawBody: string
): boolean {
  if (!config.useTwilio || !config.twilio.authToken) {
    return true;
  }

  const signature =
    (headers['x-twilio-signature'] as string) ||
    (headers['X-Twilio-Signature'] as string) ||
    '';

  const params = Object.fromEntries(new URLSearchParams(rawBody)) as Record<string, any>;
  return twilio.validateRequest(config.twilio.authToken, signature, url, params);
}
