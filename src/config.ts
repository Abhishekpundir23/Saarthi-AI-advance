import dotenv from 'dotenv';

dotenv.config();

console.log(
  'Config loaded - Twilio mode:',
  process.env.TWILIO_ACCOUNT_SID ? 'enabled' : 'disabled',
  'Groq model:',
  process.env.GROQ_MODEL || 'openai/gpt-oss-20b'
);

export const config = {
  port: Number(process.env.PORT || 3000),
  businessName: process.env.BUSINESS_NAME || 'your distributor',
  defaultRegion: process.env.DEFAULT_REGION || 'Hinglish',
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    whatsappFrom: process.env.TWILIO_WHATSAPP_FROM,
  },
  groq: {
    apiKey: process.env.GROQ_API_KEY,
    model: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
  },
  useTwilio:
    Boolean(
      process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_AUTH_TOKEN &&
        process.env.TWILIO_WHATSAPP_FROM
    ),
  useGroq: Boolean(process.env.GROQ_API_KEY),
};
