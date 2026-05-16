import os
from dotenv import load_dotenv
import asyncio
import re

from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage, ToolMessage

from app.services.twilio_service import send_whatsapp_message
from app.services.voice_service import transcribe_voice
from app.agents.tools.inventory_tools import search_inventory

load_dotenv()

# We will use ChatGroq from LangChain directly to bypass massive CrewAI overhead
model_name = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
if model_name.startswith("groq/"):
    model_name = model_name.replace("groq/", "")

llm = ChatGroq(model=model_name, api_key=os.getenv("GROQ_API_KEY"), temperature=0.3)
llm_with_tools = llm.bind_tools([search_inventory])

def process_whatsapp_message(sender_number: str, message_body: str, media_url: str = None):
    """
    Main entry point for processing a WhatsApp message using a lightweight LangChain loop.
    """
    print(f"Received message from {sender_number}: {message_body}")
    
    if media_url:
        print(f"Media URL received (Voice note): {media_url}")
        # Transcribe the voice note using Groq Whisper
        transcribed_text = asyncio.run(transcribe_voice(media_url))
        message_body = f"[User sent a Voice Note. Transcription: {transcribed_text}]"
    
    # 1. Define the System Prompt
    system_prompt = """You are a highly efficient Expert Real Estate Broker in India.
You understand Hinglish, Hindi, and English.
Your job is to match the customer with the perfect property from the inventory, answer questions, and negotiate slightly if required.

CRITICAL RULES:
1. If the customer asks about something completely unrelated to Real Estate (like vegetables, cars, tech support), DO NOT use any tools. Just return a final answer saying "I am a Real Estate AI, I can only help with property queries."
2. Speak in conversational Hinglish. Be friendly and professional.
3. Be concise (WhatsApp messages shouldn't be massive essays).
4. If quoting a price, use the 'price_display' format (e.g., '2.5 Cr').
5. NEVER reveal the 'minimum_price_inr' to the customer. This is your absolute bottom margin.
6. Ask a follow-up question to keep the conversation going (e.g., 'Would you like to schedule a site visit?').
"""

    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=message_body)
    ]

    # 2. Execute the lightweight LLM loop
    try:
        print("Sending initial request to Groq...")
        response = llm_with_tools.invoke(messages)
        messages.append(response)
        
        # Check if the LLM decided it needs to search the inventory
        if response.tool_calls:
            print(f"LLM called tools: {[tc['name'] for tc in response.tool_calls]}")
            for tool_call in response.tool_calls:
                if tool_call['name'] == 'search_inventory':
                    # Execute the tool natively
                    tool_result = search_inventory.invoke(tool_call['args'])
                    # Provide the result back to the LLM
                    messages.append(ToolMessage(content=tool_result, tool_call_id=tool_call['id']))
            
            # Get the final answer after it reads the tool output
            print("Sending tool results back to Groq for final answer...")
            final_response = llm_with_tools.invoke(messages)
            final_reply = final_response.content
        else:
            print("No tools called, LLM answered directly.")
            final_reply = response.content
            
        # Guardrails check (simplified for MVP)
        if "minimum_price_inr" in final_reply.lower() or "prop00" in final_reply.lower():
            final_reply = "I found some great options for you, but I need to double-check the latest availability. Let me get back to you shortly! 😊"
            
        # Clean up any leaked internal tool XML tags from Llama 3
        final_reply = re.sub(r'<function=.*?</function>', '', final_reply, flags=re.DOTALL).strip()
            
        print(f"Sending reply: {final_reply}")
        
        # 3. Send back via Twilio
        send_whatsapp_message(sender_number, final_reply)
        
    except Exception as e:
        print(f"Error during LangChain processing: {e}")
        fallback_msg = "Aapka message mil gaya! We are currently checking our inventory and will reply soon. 🏡"
        send_whatsapp_message(sender_number, fallback_msg)
