from fastapi import FastAPI, Request, Form, BackgroundTasks
from fastapi.responses import PlainTextResponse
import uvicorn
import sys
import os
from dotenv import load_dotenv

# Fix Windows terminal UnicodeEncodeError for emojis
sys.stdout.reconfigure(encoding='utf-8')

from app.agents.crew_manager import process_whatsapp_message

load_dotenv()

app = FastAPI(title="Saarthi AI - WhatsApp Agent")

@app.get("/")
async def root():
    return {"status": "ok", "message": "Saarthi AI WhatsApp Webhook is running"}

@app.post("/webhook")
async def twilio_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    Body: str = Form(default=""),
    From: str = Form(default=""),
    NumMedia: str = Form(default="0")
):
    """
    Twilio Webhook endpoint for receiving WhatsApp messages.
    """
    # Parse form data (Twilio sends form-urlencoded)
    form_data = await request.form()
    
    # Extract voice media if present (for later Bhashini integration)
    media_url = form_data.get("MediaUrl0") if NumMedia != "0" else None
    
    # Process message asynchronously so Twilio doesn't timeout
    background_tasks.add_task(process_whatsapp_message, From, Body, media_url)
    
    # Twilio requires an immediate 200 OK response with TwiML
    # We send an empty TwiML response because we will send the actual reply asynchronously via the Twilio API
    from twilio.twiml.messaging_response import MessagingResponse
    resp = MessagingResponse()
    return PlainTextResponse(str(resp), media_type="application/xml")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
