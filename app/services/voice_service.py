import os
import httpx
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

# Initialize Groq client
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

async def download_media(media_url: str, output_path: str):
    """
    Downloads media from Twilio.
    """
    # Twilio media URLs usually require HTTP Basic Auth with Account SID and Auth Token
    # However, some setups leave them public. For robustness, we add auth if available.
    account_sid = os.getenv("TWILIO_ACCOUNT_SID")
    auth_token = os.getenv("TWILIO_AUTH_TOKEN")
    
    auth = (account_sid, auth_token) if account_sid and auth_token else None
    
    async with httpx.AsyncClient() as client:
        # Follow redirects because Twilio Media URLs redirect to S3
        response = await client.get(media_url, auth=auth, follow_redirects=True)
        response.raise_for_status()
        
        with open(output_path, "wb") as f:
            f.write(response.content)

async def transcribe_voice(media_url: str) -> str:
    """
    Downloads voice note from Twilio and transcribes it using Groq's Whisper model.
    """
    temp_file_path = "temp_voice_note.ogg"
    
    try:
        # 1. Download the audio file
        print(f"Downloading voice note from {media_url}...")
        await download_media(media_url, temp_file_path)
        
        # 2. Transcribe using Groq
        print("Transcribing with Groq Whisper...")
        with open(temp_file_path, "rb") as file:
            transcription = groq_client.audio.transcriptions.create(
                file=(temp_file_path, file.read()),
                model="whisper-large-v3",
                prompt="The audio might be in Hinglish, Hindi, or English. Transcribe accurately.",
                response_format="text",
                language="hi" # Hinting Hindi/Hinglish helps Whisper
            )
            
        print(f"Transcription successful: '{transcription}'")
        return transcription
        
    except Exception as e:
        print(f"Error transcribing voice note: {e}")
        return "[Voice Note Unreadable - Ask customer to type or send again]"
    finally:
        # Clean up
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
