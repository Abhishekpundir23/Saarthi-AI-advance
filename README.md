# WhatsApp AI Employee Prototype

A starter implementation for a WhatsApp-native autonomous AI employee designed for Indian MSMEs.

## What this prototype includes

- WhatsApp webhook simulator for inbound messages
- Multi-agent orchestration architecture:
  - intent recognition
  - inventory and order validation
  - response generation
  - voice note fallback support
- Guardrails for pricing, discount safety, and business control

## Quick start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

3. Update `.env` with your API keys and business metadata.

4. Start the server:
   ```bash
   npm run dev
   ```

5. Send a POST request to `http://localhost:3000/webhook` with a message payload.

6. If you configure Twilio, use `/twilio/webhook` as the WhatsApp webhook endpoint.

## Twilio WhatsApp sandbox setup

1. Sign up for Twilio and activate the WhatsApp sandbox:
   - Go to the Twilio Console > Programmable Messaging > Try it Out > WhatsApp Sandbox.
   - Join the sandbox from your phone using the provided code.

2. Set your webhook URL in the sandbox configuration:
   - Incoming Messages webhook: `https://<your-public-host>/twilio/webhook`
   - Use a public URL from ngrok or a deployed instance.

3. Update `.env` with your Twilio credentials:
   ```env
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
   ```

4. Restart the server and verify the webhook is reachable.

5. Use the WhatsApp sandbox number to send messages and verify replies.

## Design goals

- WhatsApp-native experience for MSMEs that operate in Hinglish and regional languages
- Multi-agent backend to avoid single-prompt brittleness
- Simple stubbed evaluation path for safe order handling and negotiation
- Voice note readiness via the `voiceAgent` interface

## Next steps

- Add real WhatsApp Business API integration
- Replace stubbed logic with LLM-powered intent classification and response generation
- Plug in a regional voice transcription model
- Build a staging evaluation pipeline for edge-case detection
