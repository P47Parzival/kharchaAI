"""
KharchaAI LLM Service — Gemini Integration (using google.genai SDK)
"""
import json
import logging
from google import genai
from google.genai import types
from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

# Configure Gemini client
client = genai.Client(api_key=settings.gemini_api_key)

# ── Prompts ──────────────────────────────────────────────────────────────────

UNDERSTAND_REQUEST_PROMPT = """You are KharchaAI, an expert hardware engineer and cost estimation assistant.

The user is describing a hardware project they want to build. Your job is to:

1. Understand what they want to build
2. Identify if you have enough information to generate a Bill of Materials (BOM)
3. If unclear, ask 1-2 focused clarifying questions
4. If clear, confirm what you understood and propose to generate a BOM

CONVERSATION HISTORY:
{conversation_history}

USER'S LATEST MESSAGE:
{user_query}

Respond ONLY with valid JSON in this format:
{{
  "understood": true/false,
  "project_description": "Your understanding of what they want to build",
  "needs_clarification": true/false,
  "clarification_message": "If needs_clarification is true, your question(s) to the user. Be specific and concise.",
  "ready_to_generate": true/false,
  "confirmation_message": "If ready_to_generate is true, a brief summary like: 'I'll generate a BOM for a 4-channel EEG device with WiFi connectivity, including sensors, MCU, power supply, and enclosure. Shall I proceed with pricing?'"
}}

RULES:
- If the user's message is a general greeting or off-topic, set ready_to_generate to false and respond conversationally
- If the user confirms (e.g., "yes", "go ahead", "looks good"), set ready_to_generate to true
- If the project is clear from the first message, set ready_to_generate to true immediately — don't over-question
- Keep clarification questions to 1-2 maximum, focused on things that significantly affect the BOM
"""


BOM_GENERATION_PROMPT = """You are KharchaAI, an expert hardware engineer and procurement specialist.

Given a user's project description, identify ALL hardware components needed.

RULES:
- quantity MUST always be a positive integer (1, 2, 5, etc.) — NEVER "Varies"
- Keep the BOM focused: 6-10 key components. Group small passives into kits.
- Use specific part numbers when possible (e.g., ADS1299, ESP32-WROOM-32E)
- Include essential supporting components (power, connectors, PCB)

Respond ONLY with valid JSON:
{{
  "project_summary": "Brief description",
  "components": [
    {{
      "name": "Component Name",
      "category": "sensor|mcu|passive|module|connector|power|pcb|mechanical|other",
      "quantity": 1,
      "specs": "Key specifications",
      "search_keywords": ["keyword1", "keyword2"],
      "notes": "Optional notes"
    }}
  ],
  "additional_notes": "Build considerations"
}}"""


PRICE_ESTIMATION_PROMPT = """You are a hardware procurement expert. Estimate current market prices (USD) for these components.

Use your knowledge of typical DigiKey, Mouser, Amazon, and electronics supplier prices.
Be realistic and conservative. Give wider ranges if unsure.

Components:
{components_json}

Respond ONLY with valid JSON:
{{
  "prices": [
    {{
      "name": "Component Name",
      "min_price": 12.50,
      "max_price": 18.99,
      "avg_price": 15.75,
      "currency": "USD",
      "source": "DigiKey",
      "source_url": "",
      "confidence": "high|medium|low",
      "notes": "Brief note"
    }}
  ]
}}"""


PRICE_EXTRACTION_PROMPT = """Extract the price of this product from the webpage text below.
Product: {component_name}

Return ONLY valid JSON:
{{
  "found": true/false,
  "product_name": "exact product name found on page",
  "price": 12.99,
  "currency": "USD",
  "in_stock": true/false
}}

If you cannot find a clear price for this specific product, set "found" to false.

Webpage text:
{page_text}"""


RESPONSE_FORMATTING_PROMPT = """You are KharchaAI, a friendly hardware cost estimation assistant.

Format a clear response for the user with:
1. Brief project overview
2. Key components with price ranges and sources
3. Total estimated cost range
4. Money-saving tips

Be conversational. Use markdown. Cite sources.
If some prices are estimates, say so honestly.
Keep it concise — highlight the most important components.
"""


class LLMService:
    """Handles all LLM interactions using Google Gemini."""

    def __init__(self):
        self.model_name = settings.gemini_model

    async def understand_request(
        self, user_query: str, conversation_history: list[dict]
    ) -> dict:
        """Analyze user's request and decide if we need clarification."""
        history_text = ""
        for msg in conversation_history[-6:]:  # Last 6 messages for context
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if content:
                history_text += f"{role}: {content}\n"

        prompt = UNDERSTAND_REQUEST_PROMPT.format(
            conversation_history=history_text or "(no prior messages)",
            user_query=user_query,
        )

        response = client.models.generate_content(
            model=self.model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.3,
                response_mime_type="application/json",
            ),
        )

        try:
            return json.loads(response.text)
        except json.JSONDecodeError:
            text = response.text.strip()
            if text.startswith("```"):
                text = text.split("\n", 1)[1].rsplit("```", 1)[0]
            return json.loads(text)

    async def generate_bom(self, user_query: str) -> dict:
        """Generate a Bill of Materials from a project description."""
        response = client.models.generate_content(
            model=self.model_name,
            contents=f"{BOM_GENERATION_PROMPT}\n\nUser's project: {user_query}",
            config=types.GenerateContentConfig(
                temperature=0.3,
                response_mime_type="application/json",
            ),
        )

        try:
            bom = json.loads(response.text)
        except json.JSONDecodeError:
            text = response.text.strip()
            if text.startswith("```"):
                text = text.split("\n", 1)[1].rsplit("```", 1)[0]
            bom = json.loads(text)

        # Sanitize: ensure all quantities are integers
        for comp in bom.get("components", []):
            qty = comp.get("quantity", 1)
            if not isinstance(qty, int):
                try:
                    comp["quantity"] = int(qty)
                except (ValueError, TypeError):
                    comp["quantity"] = 1

        return bom

    async def estimate_prices(self, components: list[dict]) -> dict:
        """Use LLM to estimate prices (fallback when scraping fails)."""
        simplified = [
            {"name": c["name"], "specs": c.get("specs", ""), "quantity": c.get("quantity", 1)}
            for c in components
        ]

        prompt = PRICE_ESTIMATION_PROMPT.format(
            components_json=json.dumps(simplified, indent=2)
        )

        response = client.models.generate_content(
            model=self.model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.2,
                response_mime_type="application/json",
            ),
        )

        try:
            return json.loads(response.text)
        except json.JSONDecodeError:
            text = response.text.strip()
            if text.startswith("```"):
                text = text.split("\n", 1)[1].rsplit("```", 1)[0]
            try:
                return json.loads(text)
            except json.JSONDecodeError:
                logger.error(f"Failed to parse price estimation: {response.text[:200]}")
                return {"prices": []}

    async def extract_price_from_text(self, component_name: str, page_text: str) -> dict:
        """Extract pricing from raw page text."""
        prompt = PRICE_EXTRACTION_PROMPT.format(
            component_name=component_name,
            page_text=page_text[:8000],
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
            contents=f"{RESPONSE_FORMATTING_PROMPT}\n\nBOM:\n{json.dumps(bom_with_prices, indent=2)}",
            config=types.GenerateContentConfig(temperature=0.5),
        )
        return response.text


# Singleton
llm_service = LLMService()
