import { IntentAnalysis, InventoryItem, IncomingMessage, OrderProposal } from '../types.js';

const inventoryCatalog: InventoryItem[] = [
  { sku: 'KIR-001', name: 'Wheat Atta 5kg', stock: 120, price: 250, minOrderQty: 1 },
  { sku: 'KIR-002', name: 'Refined Sunflower Oil 1L', stock: 80, price: 220, minOrderQty: 1 },
  { sku: 'KIR-003', name: 'Tea Powder 250g', stock: 150, price: 140, minOrderQty: 1 },
  { sku: 'KIR-004', name: 'Digestive Biscuits Pack', stock: 95, price: 60, minOrderQty: 1 },
];

function findBestMatch(product: string): InventoryItem | undefined {
  const normalized = product.toLowerCase();
  return inventoryCatalog.find((item) => item.name.toLowerCase().includes(normalized));
}

export async function validateOrder(
  message: IncomingMessage,
  intent: IntentAnalysis
): Promise<OrderProposal> {
  const product = intent.entities.product || 'wheat atta';
  const quantity = Number(intent.entities.quantity || '1');
  const targetItem = findBestMatch(product) || inventoryCatalog[0];

  const unitPrice = targetItem.price;
  const requestedTotal = quantity * unitPrice;
  const discountRequested = Number(intent.entities.requestedDiscount || '0');
  const maxAllowedDiscount = 8;
  const discountApplied = Math.min(discountRequested, maxAllowedDiscount);
  const total = requestedTotal - Math.round((requestedTotal * discountApplied) / 100);

  const notes: string[] = [];
  let safeToConfirm = true;

  if (quantity > targetItem.stock) {
    notes.push(`Requested quantity exceeds current stock of ${targetItem.stock}.`);
    safeToConfirm = false;
  }

  if (discountRequested > maxAllowedDiscount) {
    notes.push(`Discount request of ${discountRequested}% exceeds the safe threshold of ${maxAllowedDiscount}%.`);
  }

  return {
    items: [{ sku: targetItem.sku, quantity: Math.max(quantity, targetItem.minOrderQty), unitPrice }],
    total,
    discountApplied,
    safeToConfirm,
    notes,
  };
}

export async function confirmOrder(
  proposal: OrderProposal
): Promise<{ success: boolean; orderId?: string; message: string }> {
  if (!proposal.safeToConfirm) {
    return {
      success: false,
      message: `This order cannot be confirmed automatically because of the following issues:\n- ${proposal.notes.join('\n- ')}`,
    };
  }

  proposal.items.forEach((item) => {
    const inventoryItem = inventoryCatalog.find((catalogItem) => catalogItem.sku === item.sku);
    if (inventoryItem) {
      inventoryItem.stock = Math.max(0, inventoryItem.stock - item.quantity);
    }
  });

  const orderId = `ORD-${Date.now()}`;
  return {
    success: true,
    orderId,
    message: `Your order has been confirmed successfully with Order ID ${orderId}. We will share the delivery details shortly.`,
  };
}
