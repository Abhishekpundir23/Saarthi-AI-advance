import { IncomingMessage, IntentAnalysis } from '../types.js';

const orderKeywords = ['order', 'stock', 'available', 'inventory', 'qty', 'quantity', 'pack'];
const supportKeywords = ['help', 'issue', 'problem', 'complaint', 'support', 'return'];
const negotiationKeywords = ['discount', 'rate', 'price', 'offer', 'deal', 'cheaper'];
const greetingKeywords = ['hi', 'hello', 'namaste', 'hey', 'good morning', 'good evening'];

export async function analyzeIntent(message: IncomingMessage): Promise<IntentAnalysis> {
  const text = (message.text || '').toLowerCase().trim();
  const entities: Record<string, string> = {};

  if (!text) {
    return {
      intent: 'unknown_intent',
      confidence: 0.35,
      entities,
    };
  }

  const score = (keywords: string[]) => keywords.filter((keyword) => text.includes(keyword)).length;
  const orderScore = score(orderKeywords);
  const supportScore = score(supportKeywords);
  const negotiationScore = score(negotiationKeywords);
  const greetingScore = score(greetingKeywords);

  let intent: IntentAnalysis['intent'] = 'unknown_intent';
  let confidence = 0.5;

  if (orderScore >= 2) {
    intent = 'order_intent';
    confidence = 0.92;
  } else if (negotiationScore >= 1 && orderScore >= 1) {
    intent = 'negotiation_intent';
    confidence = 0.88;
  } else if (supportScore >= 1) {
    intent = 'support_intent';
    confidence = 0.82;
  } else if (greetingScore >= 1) {
    intent = 'greeting_intent';
    confidence = 0.8;
  }

  if (intent === 'order_intent') {
    const itemMatch = text.match(/(cola|biscuit|shampoo|masala|milk|atta|rice|oil)/i);
    if (itemMatch) {
      entities.product = itemMatch[0];
    }
    const qtyMatch = text.match(/(\d+)\s*(kg|ltr|litre|pack|piece|pcs)?/i);
    if (qtyMatch) {
      entities.quantity = qtyMatch[1];
    }
  }

  if (intent === 'negotiation_intent') {
    const discountMatch = text.match(/(\d+)%/);
    if (discountMatch) {
      entities.requestedDiscount = discountMatch[1];
    }
  }

  return {
    intent,
    confidence,
    entities,
  };
}
