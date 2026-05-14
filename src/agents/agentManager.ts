import { IncomingMessage, SessionContext } from '../types.js';
import { analyzeIntent } from './intentAgent.js';
import { validateOrder, confirmOrder } from './inventoryAgent.js';
import { composeReply } from './responseAgent.js';
import { transcribeAudio } from './voiceAgent.js';
import { sessionStore } from '../services/sessionStore.js';

const confirmTrigger = /\b(confirm|confirm order|place order|yes please|yes|ok|okay)\b/i;

export async function orchestrateMessage(message: IncomingMessage): Promise<SessionContext> {
  const session = sessionStore.getSession(message.from);
  const context: SessionContext = { message, session };

  if (message.type === 'audio') {
    const transcription = await transcribeAudio(message);
    context.message = { ...message, type: 'text', text: transcription };
  }

  const text = (context.message.text || '').trim();
  let intent = await analyzeIntent(context.message);

  if (session.pendingOrder && confirmTrigger.test(text)) {
    intent = { intent: 'confirm_intent', confidence: 0.98, entities: {} };
  }

  context.intent = intent;

  if (intent.intent === 'order_intent' || intent.intent === 'negotiation_intent') {
    context.proposal = await validateOrder(context.message, intent);
    session.pendingOrder = context.proposal;
  }

  if (intent.intent === 'confirm_intent') {
    if (!session.pendingOrder) {
      context.reply = 'I do not have an open order to confirm. Please send an order request first.';
    } else {
      const confirmation = await confirmOrder(session.pendingOrder);
      if (confirmation.success && session.orders) {
        session.orders.push({
          orderId: confirmation.orderId!,
          proposal: session.pendingOrder,
          status: 'confirmed',
          confirmedAt: new Date().toISOString(),
        });
      } else if (confirmation.success) {
        session.orders = [
          {
            orderId: confirmation.orderId!,
            proposal: session.pendingOrder,
            status: 'confirmed',
            confirmedAt: new Date().toISOString(),
          },
        ];
      }
      if (confirmation.success) {
        session.pendingOrder = undefined;
      }
      context.reply = confirmation.message;
    }
  }

  if (!context.reply) {
    context.reply = await composeReply(context);
  }

  session.history.push({
    timestamp: new Date().toISOString(),
    message: context.message.text || '<audio request>',
    intent: intent.intent,
    reply: context.reply,
  });
  sessionStore.saveSession(session);

  return context;
}
