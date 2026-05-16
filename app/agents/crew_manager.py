from crewai import Agent, Task, Crew, Process, LLM
import os
from dotenv import load_dotenv
import asyncio

from app.services.twilio_service import send_whatsapp_message
from app.services.voice_service import transcribe_voice
from app.agents.tools.inventory_tools import search_inventory

load_dotenv()

# We will use Groq for the language model via CrewAI's native LLM wrapper (which uses litellm)
# Ensure GROQ_API_KEY is in your .env file
model_name = os.getenv("GROQ_MODEL", "llama3-70b-8192")
# CrewAI/litellm expects the provider prefix for groq
if not model_name.startswith("groq/"):
    model_name = f"groq/{model_name}"

llm = LLM(model=model_name, api_key=os.getenv("GROQ_API_KEY"), temperature=0.3)

# 1. Define Agents
router_agent = Agent(
    role="Customer Intent Router & Qualifier",
    goal="Analyze the incoming WhatsApp message, extract intent, and determine if the customer wants to look at real estate properties.",
    backstory="You are a highly efficient assistant for an Indian real estate broker. You understand Hinglish, Hindi, and English. Your job is to be polite and figure out what the customer wants.",
    verbose=True,
    allow_delegation=True,
    llm=llm
)

real_estate_agent = Agent(
    role="Expert Real Estate Broker",
    goal="Match the customer with the perfect property from the inventory, answer questions, and negotiate slightly if required. Never offer a price below the minimum_price_inr.",
    backstory="You are a seasoned real estate broker in Mumbai. You know the local market inside out. You speak in a friendly, professional manner, often mixing English and Hindi (Hinglish) to build rapport. You are fiercely protective of your margins and will only offer small discounts if the customer is pushing hard.",
    verbose=True,
    allow_delegation=False,
    tools=[search_inventory],
    llm=llm
)

def process_whatsapp_message(sender_number: str, message_body: str, media_url: str = None):
    """
    Main entry point for processing a WhatsApp message using CrewAI.
    """
    print(f"Received message from {sender_number}: {message_body}")
    
    if media_url:
        print(f"Media URL received (Voice note): {media_url}")
        # Transcribe the voice note using Groq Whisper
        transcribed_text = asyncio.run(transcribe_voice(media_url))
        message_body = f"[User sent a Voice Note. Transcription: {transcribed_text}]"
    
    # 2. Define Tasks
    understand_intent_task = Task(
        description=f"""
        Analyze this incoming WhatsApp message from a customer: "{message_body}"
        1. Determine their intent (e.g., looking for a new home, negotiating price, asking for location).
        2. Extract any key parameters like budget, preferred location (e.g., Andheri, Bandra), or BHK requirements.
        3. Formulate a clear instruction for the Real Estate Broker agent based on this information.
        CRITICAL: If the customer asks about something completely unrelated to Real Estate (like vegetables, cars, tech support), DO NOT use any tools to contact the customer. Just return a final answer saying "I am a Real Estate AI, I can only help with property queries."
        """,
        expected_output="A structured summary of the customer's intent and parameters, or a polite rejection for out-of-domain queries.",
        agent=router_agent
    )

    respond_to_customer_task = Task(
        description="""
        Based on the Router's analysis, use the 'Search Real Estate Inventory' tool to find matching properties.
        Then, draft a friendly WhatsApp reply to the customer. 
        Rules:
        - Speak in conversational Hinglish.
        - Be concise (WhatsApp messages shouldn't be massive essays).
        - If quoting a price, use the 'price_display' format (e.g., '2.5 Cr').
        - NEVER reveal the 'minimum_price_inr' to the customer.
        - Ask a follow-up question to keep the conversation going (e.g., 'Would you like to schedule a site visit?').
        """,
        expected_output="The exact text of the WhatsApp message to send back to the customer.",
        agent=real_estate_agent
    )

    # 3. Form the Crew
    crew = Crew(
        agents=[router_agent, real_estate_agent],
        tasks=[understand_intent_task, respond_to_customer_task],
        process=Process.sequential,
        verbose=True,
        memory=False,
        cache=False
    )

    # 4. Kickoff the process
    try:
        print("Kicking off CrewAI process...")
        result = crew.kickoff()
        
        # Guardrails check (simplified for MVP)
        final_reply = str(result)
        if "minimum_price_inr" in final_reply.lower() or "prop00" in final_reply.lower():
            final_reply = "I found some great options for you, but I need to double-check the latest availability. Let me get back to you shortly! 😊"
            
        print(f"Sending reply: {final_reply}")
        
        # 5. Send back via Twilio
        send_whatsapp_message(sender_number, final_reply)
        
    except Exception as e:
        print(f"Error during CrewAI processing: {e}")
        fallback_msg = "Aapka message mil gaya! We are currently checking our inventory and will reply soon. 🏡"
        send_whatsapp_message(sender_number, fallback_msg)
