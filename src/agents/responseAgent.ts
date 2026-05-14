import { SessionContext } from '../types.js';
import { config } from '../config.js';
import { generateGroqReply } from '../providers/groqProvider.js';

export async function composeReply(context: SessionContext): Promise<string> {
  if (config.useGroq) {
    console.log('Groq is enabled; generating reply through Groq.');
    try {
      const groqReply = await generateGroqReply(context);
      console.log('Groq generated reply:', groqReply);
      return groqReply;
    } catch (error) {
      console.warn('Groq reply generation failed, falling back to rule-based reply.', error);
    }
  }

  const intent = context.intent?.intent ?? 'unknown_intent';
  const proposal = context.proposal;
  const businessName = config.businessName;

  if (intent === 'greeting_intent') {
    return `Hi! Welcome to ${businessName}. How can I help you today? You can ask for stock, place an order, or request support.`;
  }

  if (intent === 'support_intent') {
    return `Thanks for reaching out. Please share the issue in a sentence, and I will check with the team immediately.`;
  }

  if (!proposal) {
    return `I am sorry, I did not understand that request. Can you please rephrase in Hinglish or tell me the product name and quantity?`;
  }

  const safeBadge = proposal.safeToConfirm ? '✅ Ready to confirm' : '⚠️ Need review';
  const noteLines = proposal.notes.length ? `Notes:\n- ${proposal.notes.join('\n- ')}` : '';

  return `Order summary:\n
Product: ${proposal.items[0].sku}\nQuantity: ${proposal.items[0].quantity}\nUnit price: ₹${proposal.items[0].unitPrice}\nDiscount: ${proposal.discountApplied}%\nTotal: ₹${proposal.total}\n${safeBadge}\n${noteLines}\n
If everything looks good, type 'confirm' to place your order.`;
}
