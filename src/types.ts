export type MessageType = 'text' | 'audio' | 'template';

export interface IncomingMessage {
  id: string;
  from: string;
  type: MessageType;
  text?: string;
  audioUrl?: string;
  timestamp: string;
}

export interface AgentResult<T = unknown> {
  success: boolean;
  payload: T;
  reason?: string;
}

export type IntentType =
  | 'order_intent'
  | 'support_intent'
  | 'negotiation_intent'
  | 'confirm_intent'
  | 'greeting_intent'
  | 'unknown_intent';

export interface IntentAnalysis {
  intent: IntentType;
  confidence: number;
  entities: Record<string, string>;
}

export interface InventoryItem {
  sku: string;
  name: string;
  stock: number;
  price: number;
  minOrderQty: number;
}

export interface OrderProposal {
  items: Array<{ sku: string; quantity: number; unitPrice: number }>;
  total: number;
  discountApplied: number;
  safeToConfirm: boolean;
  notes: string[];
}

export interface OrderRecord {
  orderId: string;
  proposal: OrderProposal;
  status: 'confirmed' | 'rejected';
  confirmedAt: string;
}

export interface CustomerSession {
  from: string;
  history: Array<{ timestamp: string; message: string; intent: IntentType; reply?: string }>;
  pendingOrder?: OrderProposal;
  orders?: OrderRecord[];
  lastUpdated: string;
}

export interface SessionContext {
  message: IncomingMessage;
  intent?: IntentAnalysis;
  inventory?: InventoryItem[];
  proposal?: OrderProposal;
  reply?: string;
  session?: CustomerSession;
}
