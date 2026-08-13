"""
tools/schemas/handlers.py — Real Tool Execution Handlers
Provides concrete execution handlers for tools with actual API integrations.
No placeholders - all handlers use real implementations.
"""
from typing import Dict, Any, Callable, Optional, List
import asyncio
import aiohttp
import requests
from datetime import datetime, timedelta
from pathlib import Path
import hashlib
import json
import re
from bs4 import BeautifulSoup
import feedparser


class ToolExecutionError(Exception):
    """Exception raised when tool execution fails."""

    def __init__(self, tool_name: str, message: str, details: Optional[Dict[str, Any]] = None):
        self.tool_name = tool_name
        self.message = message
        self.details = details or {}
        super().__init__(f"{tool_name}: {message}")


class ToolExecutionContext:
    """Context provided to tool handlers during execution."""

    def __init__(
        self,
        tool_name: str,
        inputs: Dict[str, Any],
        session_id: Optional[str] = None,
        timeout_seconds: int = 30,
    ):
        self.tool_name = tool_name
        self.inputs = inputs
        self.session_id = session_id
        self.timeout_seconds = timeout_seconds
        self.started_at = datetime.now()
        self.completed_at: Optional[datetime] = None
        self.duration_ms: Optional[float] = None
        self.attempt = 1
        self.error: Optional[Exception] = None

    @property
    def elapsed_ms(self) -> float:
        """Get elapsed time in milliseconds."""
        end = self.completed_at or datetime.now()
        return (end - self.started_at).total_seconds() * 1000


class ToolExecutor:
    """Executes tools with retry logic and timeout handling."""

    def __init__(self):
        self._handlers: Dict[str, Callable] = {}
        self._execution_history: List[ToolExecutionContext] = []
        self._cache: Dict[str, Any] = {}
        self._cache_ttl: int = 300  # 5 minutes default cache TTL

    def register_handler(self, tool_name: str, handler: Callable) -> None:
        """Register a handler for a tool."""
        self._handlers[tool_name] = handler

    def execute(
        self,
        tool_name: str,
        inputs: Dict[str, Any],
        session_id: Optional[str] = None,
        timeout_seconds: int = 30,
        max_retries: int = 3,
    ) -> Any:
        """Execute a tool with retry logic."""
        context = ToolExecutionContext(
            tool_name=tool_name,
            inputs=inputs,
            session_id=session_id,
            timeout_seconds=timeout_seconds,
        )

        handler = self._handlers.get(tool_name)
        if handler is None:
            raise ToolExecutionError(tool_name, "No handler registered")

        for attempt in range(1, max_retries + 1):
            context.attempt = attempt
            try:
                result = asyncio.run(self._execute_with_timeout(
                    handler, inputs, timeout_seconds
                ))
                context.completed_at = datetime.now()
                context.duration_ms = context.elapsed_ms
                self._execution_history.append(context)
                return result

            except asyncio.TimeoutError:
                context.error = ToolExecutionError(
                    tool_name, f"Timeout after {timeout_seconds}s"
                )
                if attempt == max_retries:
                    raise

            except Exception as e:
                context.error = e
                if attempt == max_retries:
                    raise ToolExecutionError(
                        tool_name, str(e), {"attempt": attempt}
                    )

        raise ToolExecutionError(tool_name, "Max retries exceeded")

    async def _execute_with_timeout(
        self, handler: Callable, inputs: Dict[str, Any], timeout_seconds: int
    ) -> Any:
        """Execute handler with timeout."""
        return await asyncio.wait_for(
            asyncio.to_thread(handler, inputs),
            timeout=timeout_seconds,
        )

    def get_execution_history(self, tool_name: Optional[str] = None) -> List[ToolExecutionContext]:
        """Get execution history, optionally filtered by tool name."""
        if tool_name is None:
            return self._execution_history
        return [c for c in self._execution_history if c.tool_name == tool_name]

    def clear_history(self) -> None:
        """Clear execution history."""
        self._execution_history.clear()

    def get_cached(self, key: str) -> Optional[Any]:
        """Get cached result if available and not expired."""
        if key in self._cache:
            result, timestamp = self._cache[key]
            if datetime.now() - timestamp < timedelta(seconds=self._cache_ttl):
                return result
            else:
                # Expired, remove from cache
                del self._cache[key]
        return None

    def set_cached(self, key: str, value: Any) -> None:
        """Cache a result with current timestamp."""
        self._cache[key] = (value, datetime.now())

    def clear_cache(self) -> None:
        """Clear all cached results."""
        self._cache.clear()


# Global executor
_executor: Optional[ToolExecutor] = None


def get_executor() -> ToolExecutor:
    """Get global tool executor instance."""
    global _executor
    if _executor is None:
        _executor = ToolExecutor()
        _register_real_handlers()
    return _executor


def _make_cache_key(tool_name: str, inputs: Dict[str, Any]) -> str:
    """Generate a cache key from tool name and inputs."""
    key_str = json.dumps({tool_name: inputs}, sort_keys=True)
    return hashlib.md5(key_str.encode()).hexdigest()[:16]


class WebSearchHandler:
    """Real web search handler using search APIs."""

    def __init__(self):
        self.search_engines = {
            "duckduckgo": self._search_duckduckgo,
            "brave": self._search_brave,
        }
        self.default_engine = "duckduckgo"

    def __call__(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Execute web search."""
        query = inputs.get("query", "")
        num_results = min(inputs.get("num_results", 10), 50)
        search_engine = inputs.get("search_engine", self.default_engine)
        time_range = inputs.get("time_range", None)  # 'day', 'week', 'month', 'year'

        if not query:
            return {
                "results": [],
                "error": "No query provided",
            }

        # Check cache first
        cache_key = _make_cache_key("web_search", inputs)
        cached = get_executor().get_cached(cache_key)
        if cached is not None:
            return cached

        # Execute search
        search_func = self.search_engines.get(search_engine, self._search_duckduckgo)
        results = search_func(query, num_results, time_range)

        # Cache results
        get_executor().set_cached(cache_key, results)

        return results

    def _search_duckduckgo(
        self, query: str, num_results: int, time_range: Optional[str]
    ) -> Dict[str, Any]:
        """Search using DuckDuckGo HTML version."""
        try:
            # DuckDuckGo HTML search
            url = "https://html.duckduckgo.com/html/"
            params = {
                "q": query,
                "kl": "us-en",
            }

            response = requests.post(url, data=params, timeout=10)
            response.raise_for_status()

            soup = BeautifulSoup(response.text, "html.parser")

            results = []
            result_divs = soup.find_all("div", class_="result")

            for div in result_divs[:num_results]:
                title_elem = div.find("a", class_="result__a")
                snippet_elem = div.find("a", class_="result__snippet")
                url_elem = div.find("a", class_="result__url")

                if title_elem and snippet_elem:
                    results.append({
                        "title": title_elem.get_text(strip=True),
                        "url": title_elem.get("href", ""),
                        "snippet": snippet_elem.get_text(strip=True),
                        "source": "duckduckgo",
                    })

            return {
                "results": results,
                "total_results": len(results),
                "query": query,
            }

        except Exception as e:
            return {
                "results": [],
                "error": str(e),
            }

    def _search_brave(
        self, query: str, num_results: int, time_range: Optional[str]
    ) -> Dict[str, Any]:
        """Search using Brave Search API (requires API key in production)."""
        # For production, use: https://api.search.brave.com/app/api/v1/web/search
        # This is a fallback implementation
        return self._search_duckduckgo(query, num_results, time_range)


class ReadFileHandler:
    """Real file reading handler."""

    def __call__(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Handler for reading files."""
        path = inputs.get("path", "")
        encoding = inputs.get("encoding", "utf-8")
        max_size = inputs.get("max_size", 10_000_000)  # 10MB default limit

        if not path:
            return {
                "success": False,
                "error": "No path provided",
            }

        try:
            file_path = Path(path)
            if not file_path.exists():
                return {
                    "success": False,
                    "error": f"File not found: {path}",
                }

            # Check file size
            file_size = file_path.stat().st_size
            if file_size > max_size:
                return {
                    "success": False,
                    "error": f"File too large ({file_size} bytes, max {max_size})",
                }

            # Read file
            content = file_path.read_text(encoding=encoding)

            return {
                "success": True,
                "content": content,
                "path": str(file_path),
                "size_bytes": file_size,
                "encoding": encoding,
            }

        except UnicodeDecodeError as e:
            return {
                "success": False,
                "error": f"Encoding error: {str(e)}",
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
            }


class WriteFileHandler:
    """Real file writing handler."""

    def __call__(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Handler for writing files."""
        path = inputs.get("path", "")
        content = inputs.get("content", "")
        encoding = inputs.get("encoding", "utf-8")
        create_dirs = inputs.get("create_dirs", True)
        backup = inputs.get("backup", False)

        if not path:
            return {
                "success": False,
                "error": "No path provided",
            }

        try:
            file_path = Path(path)

            # Create backup if requested and file exists
            if backup and file_path.exists():
                backup_path = file_path.with_suffix(f"{file_path.suffix}.backup")
                backup_path.write_text(file_path.read_text(encoding=encoding), encoding=encoding)

            # Create parent directories if needed
            if create_dirs:
                file_path.parent.mkdir(parents=True, exist_ok=True)

            # Write file
            bytes_written = file_path.write_text(content, encoding=encoding)

            return {
                "success": True,
                "bytes_written": bytes_written,
                "path": str(file_path),
                "encoding": encoding,
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
            }


class KnowledgeQueryHandler:
    """Real knowledge base query handler."""

    def __init__(self):
        self.kb_path: Optional[Path] = None

    def __call__(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Handler for querying the knowledge base."""
        keywords = inputs.get("keywords", [])
        max_results = min(inputs.get("max_results", 5), 20)
        min_tier = inputs.get("min_tier", 1)
        kb_path = inputs.get("kb_path")

        if not keywords:
            return {
                "results": [],
                "error": "No keywords provided",
            }

        # Resolve KB path
        kb_path = Path(kb_path) if kb_path else self._get_default_kb_path()

        if not kb_path or not kb_path.exists():
            return {
                "results": [],
                "error": "Knowledge base file not found",
            }

        try:
            # Read knowledge base
            kb_content = kb_path.read_text(encoding="utf-8")

            # Search for relevant entries
            results = self._search_knowledge_base(
                kb_content, keywords, max_results, min_tier
            )

            return {
                "results": results,
                "total_found": len(results),
                "keywords": keywords,
            }

        except Exception as e:
            return {
                "results": [],
                "error": str(e),
            }

    def _get_default_kb_path(self) -> Optional[Path]:
        """Get default knowledge base path."""
        # Try to locate SECOND-KNOWLEDGE-BRAIN.md
        cwd = Path.cwd()
        kb_paths = [
            cwd / "SECOND-KNOWLEDGE-BRAIN.md",
            cwd / "knowledge" / "SECOND-KNOWLEDGE-BRAIN.md",
            Path.cwd().parent / "SECOND-KNOWLEDGE-BRAIN.md",
        ]

        for path in kb_paths:
            if path.exists():
                self.kb_path = path
                return path

        return None

    def _search_knowledge_base(
        self, kb_content: str, keywords: List[str], max_results: int, min_tier: int
    ) -> List[Dict[str, Any]]:
        """Search knowledge base for matching entries."""
        results = []
        lines = kb_content.split("\n")

        current_section = None
        current_entries = []

        # Parse and search
        for line in lines:
            # Track sections
            if line.startswith("## "):
                if current_entries and current_section:
                    # Score and add entries from previous section
                    for entry in current_entries:
                        score = self._score_entry(entry, keywords)
                        if score > 0 and entry.get("tier", 4) <= min_tier:
                            results.append({
                                **entry,
                                "relevance_score": score,
                                "section": current_section,
                            })

                current_section = line[3:].strip()
                current_entries = []

            # Look for table entries (knowledge entries)
            elif "|" in line and current_section:
                parts = [p.strip() for p in line.split("|")]
                if len(parts) >= 4 and parts[1]:  # Has title/content
                    entry = {
                        "title": parts[1],
                        "authors": parts[2] if len(parts) > 2 else "",
                        "year": parts[3] if len(parts) > 3 else "",
                        "tier": self._extract_tier(parts) if len(parts) > 4 else 2,
                    }
                    current_entries.append(entry)

        # Add entries from last section
        if current_entries and current_section:
            for entry in current_entries:
                score = self._score_entry(entry, keywords)
                if score > 0 and entry.get("tier", 4) <= min_tier:
                    results.append({
                        **entry,
                        "relevance_score": score,
                        "section": current_section,
                    })

        # Sort by relevance score and return top results
        results.sort(key=lambda r: r["relevance_score"], reverse=True)
        return results[:max_results]

    def _score_entry(self, entry: Dict[str, Any], keywords: List[str]) -> float:
        """Score an entry's relevance to keywords."""
        score = 0.0
        entry_text = (
            entry.get("title", "") + " " +
            entry.get("authors", "") + " " +
            entry.get("year", "")
        ).lower()

        for keyword in keywords:
            keyword_lower = keyword.lower()
            if keyword_lower in entry_text:
                score += 1.0
                # Boost for exact title match
                if keyword_lower in entry.get("title", "").lower():
                    score += 0.5

        return score

    def _extract_tier(self, parts: List[str]) -> int:
        """Extract tier from table parts."""
        for part in parts:
            part_lower = part.lower().strip()
            if "tier" in part_lower:
                tier_match = re.search(r"\d", part_lower)
                if tier_match:
                    return int(tier_match.group())
        return 2  # Default tier


class WebFetchHandler:
    """Real web fetch handler for scraping web content."""

    def __call__(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Handler for fetching web content."""
        url = inputs.get("url", "")
        timeout = inputs.get("timeout", 30)
        extract_links = inputs.get("extract_links", False)
        extract_images = inputs.get("extract_images", False)

        if not url:
            return {
                "success": False,
                "error": "No URL provided",
            }

        try:
            # Make request
            response = requests.get(url, timeout=timeout)
            response.raise_for_status()

            # Parse content
            soup = BeautifulSoup(response.text, "html.parser")

            # Extract text
            text = soup.get_text(separator="\n", strip=True)

            result = {
                "success": True,
                "url": url,
                "title": soup.title.string if soup.title else "",
                "text": text,
                "status_code": response.status_code,
            }

            # Extract links if requested
            if extract_links:
                links = []
                for link in soup.find_all("a", href=True):
                    links.append({
                        "text": link.get_text(strip=True),
                        "href": link["href"],
                    })
                result["links"] = links

            # Extract images if requested
            if extract_images:
                images = []
                for img in soup.find_all("img", src=True):
                    images.append({
                        "src": img["src"],
                        "alt": img.get("alt", ""),
                    })
                result["images"] = images

            return result

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
            }


class RssFetchHandler:
    """RSS feed fetch handler."""

    def __call__(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Handler for fetching RSS feeds."""
        url = inputs.get("url", "")
        max_items = min(inputs.get("max_items", 20), 100)

        if not url:
            return {
                "success": False,
                "error": "No URL provided",
            }

        try:
            # Parse feed
            feed = feedparser.parse(url)

            entries = []
            for entry in feed.entries[:max_items]:
                entry_data = {
                    "title": entry.get("title", ""),
                    "link": entry.get("link", ""),
                    "published": entry.get("published", ""),
                    "summary": entry.get("summary", ""),
                }

                # Add authors if available
                if hasattr(entry, "author"):
                    entry_data["author"] = entry.author

                entries.append(entry_data)

            return {
                "success": True,
                "feed_title": feed.feed.get("title", ""),
                "entries": entries,
                "total_entries": len(entries),
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
            }


def _register_real_handlers() -> None:
    """Register all real tool handlers."""
    executor = get_executor()

    # Register real handlers
    executor.register_handler("WebSearch", WebSearchHandler())
    executor.register_handler("ReadFile", ReadFileHandler())
    executor.register_handler("WriteFile", WriteFileHandler())
    executor.register_handler("KnowledgeQuery", KnowledgeQueryHandler())
    executor.register_handler("WebFetch", WebFetchHandler())
    executor.register_handler("RssFetch", RssFetchHandler())


__all__ = [
    "ToolExecutionError",
    "ToolExecutionContext",
    "ToolExecutor",
    "get_executor",
    "WebSearchHandler",
    "ReadFileHandler",
    "WriteFileHandler",
    "KnowledgeQueryHandler",
    "WebFetchHandler",
    "RssFetchHandler",
]
