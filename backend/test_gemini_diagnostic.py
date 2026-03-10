import sys
import os
from pathlib import Path
from dotenv import load_dotenv
from google import genai
from google.genai import types

# Add the backend directory to sys.path to import app modules if needed
backend_dir = r"c:\Users\dhruv\OneDrive\Desktop\Kharcha\backend"
sys.path.append(backend_dir)

# Try to load .env from the backend directory
load_dotenv(os.path.join(backend_dir, ".env"))

api_key = os.getenv("GEMINI_API_KEY") or os.getenv("gemini_api_key")

print(f"--- Gemini Diagnostics ---")
if not api_key:
    print("ERROR: GEMINI_API_KEY NOT FOUND in .env or environment!")
    sys.exit(1)

# Only show first 4 and last 4 characters for security
masked_key = f"{api_key[:4]}...{api_key[-4:]}"
print(f"API Key found: {masked_key}")

try:
    client = genai.Client(api_key=api_key)
    print("Client initialized. Sending test request (Hello)...")
    
    response = client.models.generate_content(
        model="gemini-2.5-flash-lite",
        contents="Hello",
    )
    print("\nSUCCESS!")
    print(f"Response: {response.text}")

except Exception as e:
    print("\nFAILED with Error:")
    print(str(e))
