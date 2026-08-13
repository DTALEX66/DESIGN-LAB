"""
tools/schemas/__init__.py — Tool Schemas and Execution Handlers
Defines JSON schemas for tool inputs/outputs and provides execution handlers.
"""
from typing import Dict, Any, Optional, List, Callable
from dataclasses import dataclass, field
from enum import Enum
import json


class ToolCategory(Enum):
    """Tool categories."""
    DATA_FETCH = "data_fetch"
    ANALYSIS = "analysis"
    KNOWLEDGE = "knowledge"
    OUTPUT = "output"
    UTILITY = "utility"


@dataclass
class ToolParameter:
    """Tool parameter definition."""
    name: str
    type: str
    description: str
    required: bool = True
    default: Any = None
    enum: Optional[List[Any]] = None
    pattern: Optional[str] = None
    min_length: Optional[int] = None
    max_length: Optional[int] = None
    minimum: Optional[float] = None
    maximum: Optional[float] = None


@dataclass
class ToolOutput:
    """Tool output definition."""
    name: str
    type: str
    description: str
    array_type: Optional[str] = None


@dataclass
class ToolSchema:
    """Complete tool schema definition."""
    name: str
    category: ToolCategory
    description: str
    input_schema: Dict[str, Any]
    output_schema: Dict[str, Any]
    handler: Optional[Callable] = None
    timeout_seconds: int = 30
    retryable: bool = True
    max_retries: int = 3

    def to_json_schema(self) -> Dict[str, Any]:
        """Convert to JSON Schema format."""
        return {
            "name": self.name,
            "category": self.category.value,
            "description": self.description,
            "inputSchema": self.input_schema,
            "outputSchema": self.output_schema,
            "timeout": self.timeout_seconds,
            "retryable": self.retryable,
            "maxRetries": self.max_retries,
        }


class ToolRegistry:
    """Registry for tool schemas and handlers."""

    def __init__(self):
        self._tools: Dict[str, ToolSchema] = {}

    def register(self, schema: ToolSchema) -> None:
        """Register a tool schema."""
        self._tools[schema.name] = schema

    def get(self, name: str) -> Optional[ToolSchema]:
        """Get a tool schema by name."""
        return self._tools.get(name)

    def list(self, category: Optional[ToolCategory] = None) -> List[ToolSchema]:
        """List all tools, optionally filtered by category."""
        if category is None:
            return list(self._tools.values())
        return [t for t in self._tools.values() if t.category == category]

    def execute(self, name: str, inputs: Dict[str, Any]) -> Any:
        """Execute a tool with given inputs."""
        schema = self.get(name)
        if schema is None:
            raise ValueError(f"Tool not found: {name}")
        if schema.handler is None:
            raise ValueError(f"Tool has no handler: {name}")

        return schema.handler(inputs)

    def validate_input(self, name: str, inputs: Dict[str, Any]) -> List[str]:
        """Validate inputs against tool schema."""
        schema = self.get(name)
        if schema is None:
            return [f"Tool not found: {name}"]

        errors = []
        input_schema = schema.input_schema

        for param_name, param_def in input_schema.get("properties", {}).items():
            if param_def.get("required", False) and param_name not in inputs:
                errors.append(f"Missing required parameter: {param_name}")

            if param_name in inputs:
                value = inputs[param_name]
                param_type = param_def.get("type")

                if param_type == "string":
                    if not isinstance(value, str):
                        errors.append(f"Parameter {param_name} must be string")
                    else:
                        if "minLength" in param_def and len(value) < param_def["minLength"]:
                            errors.append(f"Parameter {param_name} too short")
                        if "maxLength" in param_def and len(value) > param_def["maxLength"]:
                            errors.append(f"Parameter {param_name} too long")
                        if "pattern" in param_def:
                            import re
                            if not re.match(param_def["pattern"], value):
                                errors.append(f"Parameter {param_name} does not match pattern")

                elif param_type == "number":
                    if not isinstance(value, (int, float)):
                        errors.append(f"Parameter {param_name} must be number")
                    else:
                        if "minimum" in param_def and value < param_def["minimum"]:
                            errors.append(f"Parameter {param_name} below minimum")
                        if "maximum" in param_def and value > param_def["maximum"]:
                            errors.append(f"Parameter {param_name} above maximum")

                elif param_type == "integer":
                    if not isinstance(value, int):
                        errors.append(f"Parameter {param_name} must be integer")

                elif param_type == "boolean":
                    if not isinstance(value, bool):
                        errors.append(f"Parameter {param_name} must be boolean")

                elif param_type == "array":
                    if not isinstance(value, list):
                        errors.append(f"Parameter {param_name} must be array")
                    elif "items" in param_def:
                        item_type = param_def["items"].get("type")
                        for i, item in enumerate(value):
                            if item_type == "string" and not isinstance(item, str):
                                errors.append(f"Array item {i} must be string")

                elif param_type == "enum":
                    if "enum" in param_def and value not in param_def["enum"]:
                        errors.append(f"Parameter {param_name} must be one of: {param_def['enum']}")

        return errors


# Global tool registry
_tool_registry: Optional[ToolRegistry] = None


def get_tool_registry() -> ToolRegistry:
    """Get global tool registry instance."""
    global _tool_registry
    if _tool_registry is None:
        _tool_registry = ToolRegistry()
        _register_default_tools()
    return _tool_registry


def _register_default_tools() -> None:
    """Register default tool schemas."""
    registry = get_tool_registry()

    # WebSearch tool
    registry.register(ToolSchema(
        name="WebSearch",
        category=ToolCategory.DATA_FETCH,
        description="Search the web for current information",
        input_schema={
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search query",
                    "required": True,
                    "minLength": 2,
                },
                "num_results": {
                    "type": "integer",
                    "description": "Number of results to return",
                    "default": 10,
                    "minimum": 1,
                    "maximum": 50,
                },
            },
        },
        output_schema={
            "type": "object",
            "properties": {
                "results": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "title": {"type": "string"},
                            "url": {"type": "string"},
                            "snippet": {"type": "string"},
                        },
                    },
                },
            },
        },
    ))

    # ReadFile tool
    registry.register(ToolSchema(
        name="ReadFile",
        category=ToolCategory.UTILITY,
        description="Read a file from the filesystem",
        input_schema={
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "File path to read",
                    "required": True,
                    "minLength": 1,
                },
                "encoding": {
                    "type": "string",
                    "description": "File encoding",
                    "default": "utf-8",
                },
            },
        },
        output_schema={
            "type": "object",
            "properties": {
                "content": {"type": "string"},
                "success": {"type": "boolean"},
                "error": {"type": "string"},
            },
        },
    ))

    # WriteFile tool
    registry.register(ToolSchema(
        name="WriteFile",
        category=ToolCategory.OUTPUT,
        description="Write content to a file",
        input_schema={
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "File path to write",
                    "required": True,
                    "minLength": 1,
                },
                "content": {
                    "type": "string",
                    "description": "Content to write",
                    "required": True,
                },
                "encoding": {
                    "type": "string",
                    "description": "File encoding",
                    "default": "utf-8",
                },
            },
        },
        output_schema={
            "type": "object",
            "properties": {
                "success": {"type": "boolean"},
                "bytes_written": {"type": "integer"},
                "error": {"type": "string"},
            },
        },
    ))

    # KnowledgeQuery tool
    registry.register(ToolSchema(
        name="KnowledgeQuery",
        category=ToolCategory.KNOWLEDGE,
        description="Query the knowledge base for domain evidence",
        input_schema={
            "type": "object",
            "properties": {
                "keywords": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Keywords to search for",
                    "required": True,
                },
                "max_results": {
                    "type": "integer",
                    "description": "Maximum number of results",
                    "default": 5,
                    "minimum": 1,
                    "maximum": 20,
                },
                "min_tier": {
                    "type": "integer",
                    "description": "Minimum evidence tier (1-4)",
                    "default": 1,
                    "minimum": 1,
                    "maximum": 4,
                },
            },
        },
        output_schema={
            "type": "object",
            "properties": {
                "results": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "title": {"type": "string"},
                            "authors": {"type": "string"},
                            "year": {"type": "integer"},
                            "venue": {"type": "string"},
                            "tier": {"type": "integer"},
                            "relevance_score": {"type": "number"},
                        },
                    },
                },
            },
        },
    ))


__all__ = [
    "ToolCategory",
    "ToolParameter",
    "ToolOutput",
    "ToolSchema",
    "ToolRegistry",
    "get_tool_registry",
]
