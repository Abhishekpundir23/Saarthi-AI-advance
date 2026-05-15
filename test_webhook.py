import httpx
import asyncio

async def test():
    data = {
        "From": "whatsapp:+1234567890",
        "Body": "Mujhe Andheri mein ek ghar dekhna hai, budget 3 crore hai"
    }
    async with httpx.AsyncClient() as client:
        response = await client.post("http://127.0.0.1:8000/webhook", data=data)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")

if __name__ == "__main__":
    asyncio.run(test())
