import os
from twilio.rest import Client
from dotenv import load_dotenv

load_dotenv()

# Check for both standard and custom env vars (just in case)
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_WHATSAPP_NUMBER = os.getenv("TWILIO_WHATSAPP_FROM")  # Should be formatted as "whatsapp:+14155238886"

# Ensure format
if TWILIO_WHATSAPP_NUMBER and not TWILIO_WHATSAPP_NUMBER.startswith("whatsapp:"):
    TWILIO_WHATSAPP_NUMBER = f"whatsapp:{TWILIO_WHATSAPP_NUMBER}"

client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN) if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN else None

def send_whatsapp_message(to_number: str, body: str):
    """
    Sends a WhatsApp message using the Twilio API.
    """
    if not client:
        print(f"[MOCK SEND] Twilio not configured. To: {to_number} | Msg: {body}")
        return

    try:
        # Twilio expects the "to" number to also have the "whatsapp:" prefix if not present
        if not to_number.startswith("whatsapp:"):
            to_number = f"whatsapp:{to_number}"

        message = client.messages.create(
            from_=TWILIO_WHATSAPP_NUMBER,
            body=body,
            to=to_number
        )
        print(f"Message sent successfully to {to_number}. SID: {message.sid}")
        return message.sid
    except Exception as e:
        print(f"Failed to send WhatsApp message: {e}")
        return None
