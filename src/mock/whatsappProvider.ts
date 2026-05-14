export async function sendWhatsAppReply(to: string, message: string): Promise<void> {
  console.log(`\n--- WhatsApp reply to ${to} ---\n${message}\n-----------------------------\n`);
}
