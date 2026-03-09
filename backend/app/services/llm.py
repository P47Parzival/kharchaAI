"""
KharchaAI LLM Service — Gemini Integration (using google.genai SDK)
"""
import json
from google import genai
from google.genai import types
from app.config import get_settings

settings = get_settings()

# Configure Gemini client
client = genai.Client(api_key=settings.gemini_api_key)

# System prompts
BOM_GENERATION_PROMPT = """You are KharchaAI, an expert hardware engineer and procurement specialist.

Given a user's project description, you MUST:
1. Identify ALL hardware components needed to build the project
2. For each component, specify: exact part name, category, quantity needed, and search keywords for finding it on supplier websites
3. Be thorough — include connectors, wires, PCBs, power supplies, resistors, capacitors, and all supporting components
4. Suggest specific part numbers when possible (e.g., ADS1299 for EEG AFE, ESP32-WROOM-32 for WiFi MCU)

You MUST respond in this exact JSON format:
{
  "project_summary": "Brief description of what the user wants to build",
  "components": [
    {
      "name": "Component Name (e.g., ADS1299 Analog Front-End)",
      "category": "sensor|mcu|passive|module|connector|power|pcb|mechanical|other",
      "quantity": 1,
      "specs": "Key specifications (e.g., 8-channel, 24-bit ADC, SPI interface)",
      "search_keywords": ["ADS1299", "ADS1299 breakout board", "8-channel EEG AFE"],
      "notes": "Optional notes about alternatives or considerations"
    }
  ],
  "additional_notes": "Any important considerations about the build"
}

IMPORTANT: Only respond with valid JSON. No markdown, no code fences, no explanation outside the JSON."""


RESPONSE_FORMATTING_PROMPT = """You are KharchaAI, a friendly and knowledgeable hardware cost estimation assistant.

You are given a Bill of Materials (BOM) with real pricing data scraped from supplier websites.
Format a clear, helpful response for the user that includes:

1. A brief overview of the project and what components are needed
2. A structured breakdown of each component with:
   - Component name and what it does
   - Price range (min to max across sources)
   - Recommended source (cheapest reliable one)
3. Total estimated cost range
4. Any tips for saving money (bulk buys, alternatives, etc.)

Be conversational but informative. Use markdown formatting.
When mentioning prices, always cite the source.
If some prices couldn't be found, mention that honestly and suggest where to look.
"""


PRICE_EXTRACTION_PROMPT = """Extract the price of the product from the following webpage text.
The product I'm looking for is: {component_name}

Return ONLY a JSON object in this format:
{{
  "found": true/false,
  "product_name": "exact product name found",
  "price": 12.99,
  "currency": "USD",
  "source_url": "the page URL",
  "in_stock": true/false
}}

If you cannot find a clear price, set "found" to false.
Webpage text:
{page_text}
"""


class LLMService:
    """Handles all LLM interactions using Google Gemini."""

    def __init__(self):
        self.model_name = settings.gemini_model

    async def generate_bom(self, user_query: str) -> dict:
        """Generate a Bill of Materials from a user's project description."""
        response = client.models.generate_content(
            model=self.model_name,
            contents=f"{BOM_GENERATION_PROMPT}\n\nUser's project: {user_query}",
            config=types.GenerateContentConfig(
                temperature=0.3,
                response_mime_type="application/json",
            ),
        )

        try:
            return json.loads(response.text)
        except json.JSONDecodeError:
            # Try to extract JSON from the response
            text = response.text.strip()
            if text.startswith("```"):
                text = text.split("\n", 1)[1].rsplit("```", 1)[0]
            return json.loads(text)

    async def extract_price_from_text(self, component_name: str, page_text: str) -> dict:
        """Use LLM to extract pricing from raw page text (fallback method)."""
        prompt = PRICE_EXTRACTION_PROMPT.format(
            component_name=component_name,
            page_text=page_text[:8000],  # Limit text length
        )

        response = client.models.generate_content(
            model=self.model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.1,
                response_mime_type="application/json",
            ),
        )

        try:
            return json.loads(response.text)
        except json.JSONDecodeError:
            return {"found": False, "error": "Could not parse LLM response"}

    async def format_response(self, bom_with_prices: dict) -> str:
        """Format the final response with BOM and pricing data."""
        response = client.models.generate_content(
            model=self.model_name,
            contents=f"{RESPONSE_FORMATTING_PROMPT}\n\nBOM with pricing data:\n{json.dumps(bom_with_prices, indent=2)}",
            config=types.GenerateContentConfig(temperature=0.5),
        )
        return response.text


# Singleton instance
llm_service = LLMService()
