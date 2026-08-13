"""
tests/unit/test_handlers.py — Unit Tests for Tool Handlers
Comprehensive unit tests for tool execution handlers.
"""
import pytest
from pathlib import Path
import tempfile
import json
from tools.schemas.handlers import (
    ToolExecutionError, ToolExecutionContext, ToolExecutor,
    ReadFileHandler, WriteFileHandler, KnowledgeQueryHandler,
    WebFetchHandler, get_executor
)


class TestToolExecutionError:
    """Test tool execution error handling."""

    def test_error_creation(self):
        """Test creating a tool execution error."""
        error = ToolExecutionError(
            tool_name="TestTool",
            message="Test failed",
            details={"attempt": 1}
        )

        assert str(error) == "TestTool: Test failed"
        assert error.tool_name == "TestTool"
        assert error.message == "Test failed"
        assert error.details == {"attempt": 1}


class TestToolExecutionContext:
    """Test tool execution context."""

    def test_context_creation(self):
        """Test creating an execution context."""
        context = ToolExecutionContext(
            tool_name="TestTool",
            inputs={"query": "test"},
            session_id="session123",
            timeout_seconds=30,
        )

        assert context.tool_name == "TestTool"
        assert context.inputs == {"query": "test"}
        assert context.session_id == "session123"
        assert context.timeout_seconds == 30
        assert context.attempt == 1
        assert context.started_at is not None

    def test_elapsed_ms_calculation(self):
        """Test elapsed time calculation."""
        context = ToolExecutionContext(
            tool_name="TestTool",
            inputs={},
        )

        # Elapsed before completion should be positive
        elapsed = context.elapsed_ms
        assert elapsed >= 0

        # After completion, elapsed should be calculated
        import time
        time.sleep(0.1)
        context.completed_at = context.started_at
        elapsed = context.elapsed_ms
        assert elapsed >= 0


class TestReadFileHandler:
    """Test file reading handler."""

    def test_read_existing_file(self):
        """Test reading an existing file."""
        handler = ReadFileHandler()

        # Create temporary file
        with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".txt") as f:
            f.write("Test content")
            temp_path = f.name

        try:
            result = handler({"path": temp_path, "encoding": "utf-8"})

            assert result["success"] is True
            assert result["content"] == "Test content"
            assert result["size_bytes"] == len("Test content")
        finally:
            Path(temp_path).unlink()

    def test_read_nonexistent_file(self):
        """Test reading a non-existent file."""
        handler = ReadFileHandler()

        result = handler({"path": "/nonexistent/file.txt"})

        assert result["success"] is False
        assert "error" in result

    def test_read_with_encoding(self):
        """Test reading file with specific encoding."""
        handler = ReadFileHandler()

        # Create temporary file with UTF-8 content
        with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".txt", encoding="utf-8") as f:
            f.write("Test content with unicode: Ñoñoño")
            temp_path = f.name

        try:
            result = handler({"path": temp_path, "encoding": "utf-8"})

            assert result["success"] is True
            assert "Ñoñoño" in result["content"]
        finally:
            Path(temp_path).unlink()

    def test_read_file_too_large(self):
        """Test reading file that exceeds size limit."""
        handler = ReadFileHandler()

        # Create temporary large file
        with tempfile.NamedTemporaryFile(mode="wb", delete=False) as f:
            # Write 1MB of data
            f.write(b"x" * 1_000_000)
            temp_path = f.name

        try:
            result = handler({"path": temp_path, "max_size": 100_000})

            assert result["success"] is False
            assert "too large" in result["error"].lower()
        finally:
            Path(temp_path).unlink()


class TestWriteFileHandler:
    """Test file writing handler."""

    def test_write_new_file(self):
        """Test writing a new file."""
        handler = WriteFileHandler()

        with tempfile.NamedTemporaryFile(delete=False) as f:
            temp_path = f.name

        # Ensure file doesn't exist
        Path(temp_path).unlink(missing_ok=True)

        try:
            result = handler({
                "path": temp_path,
                "content": "New test content",
                "encoding": "utf-8",
            })

            assert result["success"] is True
            assert result["bytes_written"] == len("New test content")

            # Verify file was written
            assert Path(temp_path).exists()
            assert Path(temp_path).read_text(encoding="utf-8") == "New test content"
        finally:
            Path(temp_path).unlink(missing_ok=True)

    def test_write_with_backup(self):
        """Test writing with backup creation."""
        handler = WriteFileHandler()

        with tempfile.NamedTemporaryFile(mode="w", delete=False) as f:
            f.write("Original content")
            temp_path = f.name

        try:
            result = handler({
                "path": temp_path,
                "content": "Updated content",
                "encoding": "utf-8",
                "backup": True,
            })

            assert result["success"] is True

            # Check backup was created
            backup_path = Path(temp_path).with_suffix(".txt.backup")
            assert backup_path.exists()
            assert backup_path.read_text(encoding="utf-8") == "Original content"
        finally:
            Path(temp_path).unlink(missing_ok=True)
            Path(temp_path).with_suffix(".txt.backup").unlink(missing_ok=True)

    def test_write_with_directory_creation(self):
        """Test writing with automatic directory creation."""
        handler = WriteFileHandler()

        with tempfile.TemporaryDirectory() as temp_dir:
            test_path = Path(temp_dir) / "subdir" / "newfile.txt"

            result = handler({
                "path": str(test_path),
                "content": "Content in new directory",
                "encoding": "utf-8",
                "create_dirs": True,
            })

            assert result["success"] is True
            assert test_path.exists()
            assert test_path.parent.exists()


class TestKnowledgeQueryHandler:
    """Test knowledge base query handler."""

    def test_query_without_keywords(self):
        """Test query without keywords returns error."""
        handler = KnowledgeQueryHandler()

        result = handler({"keywords": []})

        assert "results" in result
        assert result["results"] == []
        assert "error" in result

    def test_query_with_missing_kb(self):
        """Test query when knowledge base file doesn't exist."""
        handler = KnowledgeQueryHandler()

        result = handler({
            "keywords": ["mobile", "ui"],
            "kb_path": "/nonexistent/kb.md",
        })

        assert "results" in result
        assert result["results"] == []
        assert "error" in result


class TestToolExecutor:
    """Test tool executor functionality."""

    def test_executor_registration(self):
        """Test registering tool handlers."""
        executor = ToolExecutor()

        def dummy_handler(inputs):
            return {"result": "test"}

        executor.register_handler("DummyTool", dummy_handler)

        # Handler should be registered
        assert "DummyTool" in executor._handlers

    def test_execute_unregistered_tool(self):
        """Test executing unregistered tool raises error."""
        executor = ToolExecutor()

        with pytest.raises(ToolExecutionError) as exc_info:
            executor.execute("UnregisteredTool", {})

        assert "No handler registered" in str(exc_info.value)

    def test_execute_with_success(self):
        """Test successful tool execution."""
        executor = ToolExecutor()

        def successful_handler(inputs):
            return {"success": True, "data": "test data"}

        executor.register_handler("SuccessTool", successful_handler)

        result = executor.execute("SuccessTool", {"input": "test"})

        assert result["success"] is True
        assert result["data"] == "test data"

    def test_execute_with_retry(self):
        """Test tool execution with retry logic."""
        executor = ToolExecutor()
        attempt_count = [0]

        def flaky_handler(inputs):
            attempt_count[0] += 1
            if attempt_count[0] < 2:
                raise ValueError("Temporary failure")
            return {"success": True}

        executor.register_handler("FlakyTool", flaky_handler)

        result = executor.execute("FlakyTool", {}, max_retries=3)

        assert result["success"] is True
        assert attempt_count[0] == 2

    def test_execute_timeout(self):
        """Test tool execution timeout."""
        executor = ToolExecutor()

        def slow_handler(inputs):
            import time
            time.sleep(5)  # Sleep longer than timeout
            return {"success": True}

        executor.register_handler("SlowTool", slow_handler)

        with pytest.raises(ToolExecutionError) as exc_info:
            executor.execute("SlowTool", {}, timeout_seconds=1, max_retries=1)

        assert "Timeout" in str(exc_info.value)

    def test_execution_history(self):
        """Test execution history tracking."""
        executor = ToolExecutor()

        def test_handler(inputs):
            return {"result": "test"}

        executor.register_handler("TestTool", test_handler)

        # Execute multiple times
        for i in range(3):
            executor.execute("TestTool", {"iteration": i})

        history = executor.get_execution_history()
        assert len(history) == 3

        # Filter by tool name
        tool_history = executor.get_execution_history("TestTool")
        assert len(tool_history) == 3

    def test_cache_functionality(self):
        """Test executor caching."""
        executor = ToolExecutor()
        call_count = [0]

        def expensive_handler(inputs):
            call_count[0] += 1
            return {"result": "expensive computation"}

        executor.register_handler("ExpensiveTool", expensive_handler)

        # First call should execute handler
        inputs = {"key": "value"}
        result1 = executor.execute("ExpensiveTool", inputs)
        assert call_count[0] == 1

        # Second call with same inputs should use cache (if cache was implemented)
        # Note: Current implementation doesn't auto-cache, this tests the cache methods exist
        cache_key = "test_key"
        executor.set_cached(cache_key, {"cached": True})
        cached = executor.get_cached(cache_key)
        assert cached["cached"] is True


class TestWebFetchHandler:
    """Test web fetch handler."""

    def test_fetch_without_url(self):
        """Test fetch without URL returns error."""
        handler = WebFetchHandler()

        result = handler({})

        assert result["success"] is False
        assert "No URL provided" in result["error"]


@pytest.fixture
def sample_kb_file(tmp_path):
    """Create a sample knowledge base file for testing."""
    kb_content = """
# SECOND-KNOWLEDGE-BRAIN

## 1. Core Methods

## 2. Key Papers

| # | Title | Authors | Year | Venue | Tier |
|---|-------|---------|------|-------|------|
| 1 | Mobile UI Design Patterns | Smith et al. | 2023 | HCI Journal | 1 |
| 2 | Touch Target Optimization | Johnson | 2022 | UX Research | 2 |

## 3. State of the Art

## 4. Authoritative Data Sources

## 5. Frameworks

## 6. Self-Update Protocol

## 7. Knowledge Update Log
"""
    kb_file = tmp_path / "SECOND-KNOWLEDGE-BRAIN.md"
    kb_file.write_text(kb_content)
    return str(kb_file)


class TestKnowledgeQueryWithSampleKB:
    """Test knowledge query with sample KB."""

    def test_query_sample_kb(self, sample_kb_file):
        """Test querying sample knowledge base."""
        handler = KnowledgeQueryHandler()

        result = handler({
            "keywords": ["mobile", "ui", "design"],
            "kb_path": sample_kb_file,
            "max_results": 5,
        })

        assert "results" in result
        assert len(result["results"]) > 0

        # Check that results have expected fields
        first_result = result["results"][0]
        assert "title" in first_result
        assert "relevance_score" in first_result

    def test_query_with_tier_filter(self, sample_kb_file):
        """Test querying with tier filtering."""
        handler = KnowledgeQueryHandler()

        result = handler({
            "keywords": ["patterns"],
            "kb_path": sample_kb_file,
            "max_results": 10,
            "min_tier": 1,
        })

        assert "results" in result
        # All results should have tier <= 1
        for entry in result["results"]:
            assert entry["tier"] <= 1


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
