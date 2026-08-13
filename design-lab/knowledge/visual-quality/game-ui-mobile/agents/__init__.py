"""
agents/__init__.py — Agent Architecture Module
Provides flexible agent patterns with chain-of-thought routers and specialized sub-agents.
"""
from typing import Optional, Dict, Any, List
from enum import Enum


class AgentType(Enum):
    """Types of agents available."""
    ROUTER = "router"  # Chain-of-thought router for decision routing
    SPECIALIST = "specialist"  # Domain-specific specialist agent
    ANALYZER = "analyzer"  # Data analysis agent
    ADVISOR = "advisor"  # Advisory/recommendation agent
    VALIDATOR = "validator"  # Quality/validation agent
    SYNTHESIZER = "synthesizer"  # Synthesis/aggregation agent


class AgentPriority(Enum):
    """Agent execution priority levels."""
    CRITICAL = 0  # Must execute
    HIGH = 1
    MEDIUM = 2
    LOW = 3


class AgentCapability:
    """Represents a specific agent capability."""

    def __init__(
        self,
        name: str,
        description: str,
        input_schema: Dict[str, Any],
        output_schema: Dict[str, Any],
        tools: List[str] = None,
    ):
        self.name = name
        self.description = description
        self.input_schema = input_schema
        self.output_schema = output_schema
        self.tools = tools or []


class Agent:
    """Base agent class."""

    def __init__(
        self,
        agent_id: str,
        agent_type: AgentType,
        name: str,
        description: str,
        capabilities: List[AgentCapability] = None,
        priority: AgentPriority = AgentPriority.MEDIUM,
    ):
        self.agent_id = agent_id
        self.agent_type = agent_type
        self.name = name
        self.description = description
        self.capabilities = capabilities or []
        self.priority = priority
        self.execution_count = 0
        self.success_count = 0
        self.failure_count = 0

    def execute(self, inputs: Dict[str, Any], context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Execute the agent with given inputs."""
        raise NotImplementedError("Subclasses must implement execute()")

    def can_handle(self, task: str, inputs: Dict[str, Any]) -> float:
        """Return confidence score (0-1) for ability to handle this task."""
        # Base implementation checks keyword overlap
        task_lower = task.lower()
        description_lower = self.description.lower()

        matches = sum(1 for word in task_lower.split() if word in description_lower)
        return min(matches / max(len(task_lower.split()), 1), 1.0)

    def get_stats(self) -> Dict[str, Any]:
        """Get agent execution statistics."""
        total = self.execution_count
        success_rate = (self.success_count / total * 100) if total > 0 else 0

        return {
            "agent_id": self.agent_id,
            "agent_type": self.agent_type.value,
            "execution_count": total,
            "success_count": self.success_count,
            "failure_count": self.failure_count,
            "success_rate": success_rate,
        }


class AgentRegistry:
    """Registry for managing available agents."""

    def __init__(self):
        self._agents: Dict[str, Agent] = {}
        self._router_agents: List[Agent] = []
        self._specialist_agents: Dict[str, List[Agent]] = {}

    def register(self, agent: Agent) -> None:
        """Register an agent."""
        self._agents[agent.agent_id] = agent

        if agent.agent_type == AgentType.ROUTER:
            self._router_agents.append(agent)
        else:
            # Group specialists by domain
            domain = agent.agent_id.split(":")[0] if ":" in agent.agent_id else "general"
            if domain not in self._specialist_agents:
                self._specialist_agents[domain] = []
            self._specialist_agents[domain].append(agent)

    def unregister(self, agent_id: str) -> bool:
        """Unregister an agent."""
        if agent_id not in self._agents:
            return False

        agent = self._agents[agent_id]
        if agent.agent_type == AgentType.ROUTER:
            self._router_agents.remove(agent)
        else:
            domain = agent_id.split(":")[0] if ":" in agent_id else "general"
            if domain in self._specialist_agents:
                self._specialist_agents[domain].remove(agent)

        del self._agents[agent_id]
        return True

    def get_agent(self, agent_id: str) -> Optional[Agent]:
        """Get an agent by ID."""
        return self._agents.get(agent_id)

    def find_best_agent(self, task: str, inputs: Dict[str, Any]) -> Optional[Agent]:
        """Find the best agent to handle a task."""
        best_agent = None
        best_score = 0.0

        for agent in self._agents.values():
            score = agent.can_handle(task, inputs)
            if score > best_score:
                best_score = score
                best_agent = agent

        return best_agent if best_score > 0.3 else None

    def get_routers(self) -> List[Agent]:
        """Get all router agents."""
        return self._router_agents.copy()

    def get_specialists(self, domain: str = None) -> List[Agent]:
        """Get specialist agents, optionally filtered by domain."""
        if domain:
            return self._specialist_agents.get(domain, []).copy()

        all_specialists = []
        for agents in self._specialist_agents.values():
            all_specialists.extend(agents)
        return all_specialists

    def get_all_agents(self) -> List[Agent]:
        """Get all registered agents."""
        return list(self._agents.values())

    def get_stats(self) -> Dict[str, Any]:
        """Get registry statistics."""
        return {
            "total_agents": len(self._agents),
            "router_agents": len(self._router_agents),
            "specialist_domains": len(self._specialist_agents),
            "agents_by_type": {
                agent_type.value: sum(1 for a in self._agents.values() if a.agent_type == agent_type)
                for agent_type in AgentType
            },
        }


# Global registry
_registry: Optional[AgentRegistry] = None


def get_agent_registry() -> AgentRegistry:
    """Get global agent registry instance."""
    global _registry
    if _registry is None:
        _registry = AgentRegistry()
    return _registry


def register_agent(agent: Agent) -> None:
    """Register an agent."""
    get_agent_registry().register(agent)


def unregister_agent(agent_id: str) -> bool:
    """Unregister an agent."""
    return get_agent_registry().unregister(agent_id)


__all__ = [
    "AgentType",
    "AgentPriority",
    "AgentCapability",
    "Agent",
    "AgentRegistry",
    "get_agent_registry",
    "register_agent",
    "unregister_agent",
]
