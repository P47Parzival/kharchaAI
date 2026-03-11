"""
KharchaAI — MCP Client for chrome-devtools-mcp
Manages a headless Chrome instance via the Model Context Protocol.
"""
import asyncio
import logging
from contextlib import asynccontextmanager

logger = logging.getLogger(__name__)


class MCPBrowserClient:
    """
    Client that connects to chrome-devtools-mcp server via MCP protocol.
    Spawns headless Chrome as a subprocess and communicates via stdio.
    """

    def __init__(self):
        self._session = None
        self._read = None
        self._write = None
        self._cm_stack = None
        self._connected = False
        self._lock = asyncio.Lock()

    async def connect(self):
        """Start the MCP server and establish a session."""
        if self._connected:
            return

        async with self._lock:
            if self._connected:
                return

            try:
                from mcp import ClientSession, StdioServerParameters
                from mcp.client.stdio import stdio_client

                server_params = StdioServerParameters(
                    command="npx",
                    args=["chrome-devtools-mcp@latest", "--headless"],
                )

                # Create the stdio transport
                self._stdio_cm = stdio_client(server_params)
                self._read, self._write = await self._stdio_cm.__aenter__()

                # Create and initialize the session
                self._session = ClientSession(self._read, self._write)
                await self._session.__aenter__()
                await self._session.initialize()

                self._connected = True
                logger.info("MCP browser client connected successfully")

            except Exception as e:
                logger.error(f"Failed to connect MCP browser client: {e}")
                self._connected = False
                raise

    async def disconnect(self):
        """Clean up the MCP session and subprocess."""
        if not self._connected:
            return

        try:
            if self._session:
                await self._session.__aexit__(None, None, None)
            if self._stdio_cm:
                await self._stdio_cm.__aexit__(None, None, None)
        except Exception as e:
            logger.warning(f"Error during MCP disconnect: {e}")
        finally:
            self._connected = False
            self._session = None
            self._read = None
            self._write = None

    async def navigate(self, url: str) -> dict:
        """Navigate to a URL and return the result."""
        if not self._connected:
            await self.connect()

        try:
            result = await self._session.call_tool("navigate", {"url": url})
            return {"success": True, "content": str(result.content) if result.content else ""}
        except Exception as e:
            logger.warning(f"MCP navigate failed for {url}: {e}")
            return {"success": False, "error": str(e)}

    async def get_page_content(self) -> str:
        """Get the current page's text content."""
        if not self._connected:
            return ""

        try:
            result = await self._session.call_tool("get_page_content", {})
            if result and result.content:
                # Extract text from the result
                content = str(result.content)
                return content[:15000]  # Limit to 15k chars
            return ""
        except Exception as e:
            logger.warning(f"MCP get_page_content failed: {e}")
            return ""

    async def execute_javascript(self, code: str) -> str:
        """Execute JavaScript on the current page."""
        if not self._connected:
            return ""

        try:
            result = await self._session.call_tool("execute_javascript", {"code": code})
            return str(result.content) if result and result.content else ""
        except Exception as e:
            logger.warning(f"MCP execute_javascript failed: {e}")
            return ""

    async def scrape_url(self, url: str, wait_ms: int = 3000) -> str:
        """Navigate to a URL, wait for content to load, and return the page text."""
        nav_result = await self.navigate(url)
        if not nav_result.get("success"):
            return ""

        # Wait for dynamic content to render
        await asyncio.sleep(wait_ms / 1000)

        # Try to get structured content via JS first
        content = await self.execute_javascript("""
            // Extract meaningful text content from the page
            const getText = () => {
                const elements = document.querySelectorAll(
                    'h1, h2, h3, h4, .price, [data-price], .product-title, .product-name, ' +
                    '.part-number, .availability, table, .search-result, .product-card, ' +
                    '.unit-price, .product-detail, [class*="price"], [class*="product"]'
                );
                
                let text = document.title + '\\n\\n';
                elements.forEach(el => {
                    const t = el.textContent.trim();
                    if (t && t.length > 2 && t.length < 500) {
                        text += t + '\\n';
                    }
                });
                
                // Fallback: if not much was found, get body text
                if (text.length < 200) {
                    text = document.body.innerText.substring(0, 12000);
                }
                
                return text.substring(0, 12000);
            };
            getText();
        """)

        if not content or len(content) < 100:
            # Fallback to full page content
            content = await self.get_page_content()

        return content

    @property
    def is_connected(self) -> bool:
        return self._connected


# Singleton
mcp_browser = MCPBrowserClient()
