"""
tests/unit/test_agents.py — Unit Tests for Agent Architecture
Comprehensive unit tests for agent system components.
"""
import pytest
from datetime import datetime
from agents import (
    Agent, AgentType, AgentPriority, AgentCapability,
    AgentRegistry, register_agent, get_agent_registry
)
from agents.router import ChainOfThoughtRouter, RoutingDecision
from agents.specialized import (
    MobileUIAnalysisAgent, TouchInteractionAgent, AccessibilityAgent
)


class TestAgentBase:
    """Test base Agent class."""

    def test_agent_creation(self):
        """Test creating an agent."""
        agent = Agent(
            agent_id="test:agent",
            agent_type=AgentType.SPECIALIST,
            name="Test Agent",
            description="A test agent for unit testing",
            priority=AgentPriority.MEDIUM,
        )

        assert agent.agent_id == "test:agent"
        assert agent.agent_type == AgentType.SPECIALIST
        assert agent.name == "Test Agent"
        assert agent.priority == AgentPriority.MEDIUM

    def test_agent_stats_initialization(self):
        """Test agent statistics are initialized."""
        agent = Agent(
            agent_id="test:stats",
            agent_type=AgentType.SPECIALIST,
            name="Stats Test",
            description="Test stats initialization",
        )

        stats = agent.get_stats()
        assert stats["execution_count"] == 0
        assert stats["success_count"] == 0
        assert stats["failure_count"] == 0

    def test_agent_can_handle(self):
        """Test agent can_handle scoring."""
        agent = Agent(
            agent_id="test:handle",
            agent_type=AgentType.SPECIALIST,
            name="Handle Test",
            description="An agent for testing UI analysis and mobile design",
        )

        # Test matching keywords
        score = agent.can_handle("Analyze mobile UI", {})
        assert score > 0

        # Test non-matching query
        score = agent.can_handle("Calculate fibonacci numbers", {})
        assert score == 0


class TestAgentRegistry:
    """Test agent registry functionality."""

    def test_register_agent(self):
        """Test registering an agent."""
        registry = AgentRegistry()
        agent = Agent(
            agent_id="test:register",
            agent_type=AgentType.SPECIALIST,
            name="Register Test",
            description="Test agent registration",
        )

        registry.register(agent)
        assert registry.get_agent("test:register") == agent

    def test_unregister_agent(self):
        """Test unregistering an agent."""
        registry = AgentRegistry()
        agent = Agent(
            agent_id="test:unregister",
            agent_type=AgentType.SPECIALIST,
            name="Unregister Test",
            description="Test agent unregistration",
        )

        registry.register(agent)
        assert registry.get_agent("test:unregister") is not None

        registry.unregister("test:unregister")
        assert registry.get_agent("test:unregister") is None

    def test_find_best_agent(self):
        """Test finding the best agent for a task."""
        registry = AgentRegistry()

        # Register multiple agents
        ui_agent = Agent(
            agent_id="ui:analysis",
            agent_type=AgentType.SPECIALIST,
            name="UI Analysis",
            description="Analyzes user interface design and layout",
        )

        math_agent = Agent(
            agent_id="math:calculator",
            agent_type=AgentType.SPECIALIST,
            name="Math Calculator",
            description="Performs mathematical calculations",
        )

        registry.register(ui_agent)
        registry.register(math_agent)

        # Test UI task
        best = registry.find_best_agent("Analyze this UI layout", {})
        assert best is not None
        assert best.agent_id == "ui:analysis"

        # Test math task
        best = registry.find_best_agent("Calculate these numbers", {})
        assert best is not None
        assert best.agent_id == "math:calculator"

    def test_get_routers(self):
        """Test getting router agents."""
        registry = AgentRegistry()

        router = ChainOfThoughtRouter()
        registry.register(router)

        routers = registry.get_routers()
        assert len(routers) == 1
        assert routers[0].agent_id == "router:chain_of_thought"

    def test_get_specialists(self):
        """Test getting specialist agents."""
        registry = AgentRegistry()

        ui_agent = MobileUIAnalysisAgent()
        touch_agent = TouchInteractionAgent()
        a11y_agent = AccessibilityAgent()

        registry.register(ui_agent)
        registry.register(touch_agent)
        registry.register(a11y_agent)

        # Get all specialists
        specialists = registry.get_specialists()
        assert len(specialists) == 3

        # Get domain-specific specialists
        mobile_specialists = registry.get_specialists("mobile_ui")
        assert len(mobile_specialists) == 1


class TestChainOfThoughtRouter:
    """Test chain-of-thought router functionality."""

    def test_router_creation(self):
        """Test creating a router."""
        router = ChainOfThoughtRouter()

        assert router.agent_id == "router:chain_of_thought"
        assert router.agent_type == AgentType.ROUTER
        assert router.priority == AgentPriority.CRITICAL

    def test_routing_execution(self):
        """Test router executes with proper analysis."""
        router = ChainOfThoughtRouter()
        registry = get_agent_registry()

        # Register test agents
        ui_agent = MobileUIAnalysisAgent()
        registry.register(ui_agent)

        # Execute routing
        result = router.execute({
            "task": "Analyze mobile UI for touch targets",
            "inputs": {"screen_size": "standard"},
        })

        assert "decision" in result
        assert "execution_plan" in result
        assert "analysis" in result

        decision = result["decision"]
        assert "selected_agent_id" in decision
        assert "confidence" in decision
        assert "reasoning" in decision

    def test_routing_stats(self):
        """Test router statistics tracking."""
        router = ChainOfThoughtRouter()

        # Execute a few routes
        for i in range(3):
            router.execute({
                "task": f"Test task {i}",
                "inputs": {},
            })

        stats = router.get_routing_stats()
        assert stats["total_routings"] == 3


class TestMobileUIAnalysisAgent:
    """Test mobile UI analysis agent."""

    def test_agent_creation(self):
        """Test creating the agent."""
        agent = MobileUIAnalysisAgent()

        assert agent.agent_id == "mobile_ui:analysis"
        assert agent.agent_type == AgentType.SPECIALIST

    def test_analyze_layout(self):
        """Test UI layout analysis."""
        agent = MobileUIAnalysisAgent()

        result = agent._analyze_layout({
            "ui_elements": [
                {
                    "id": "button1",
                    "position": {"x": 50, "y": 10},
                    "size": {"width": 60, "height": 60},
                },
                {
                    "id": "button2",
                    "position": {"x": 50, "y": 80},
                    "size": {"width": 30, "height": 30},
                },
            ],
            "screen_size": "standard",
            "orientation": "portrait",
        }, {})

        assert "layout_score" in result
        assert "recommendations" in result
        assert result["layout_score"] >= 0
        assert result["layout_score"] <= 100

    def test_analyze_touch_targets(self):
        """Test touch target analysis."""
        agent = MobileUIAnalysisAgent()

        result = agent._analyze_touch_targets({
            "touch_targets": [
                {
                    "id": "target1",
                    "size": {"width": 50, "height": 50},
                },
                {
                    "id": "target2",
                    "size": {"width": 30, "height": 30},
                },
            ],
            "target_size_min": 44,
        }, {})

        assert "touch_score" in result
        assert "violations" in result
        assert "total_targets" in result
        assert result["total_targets"] == 2


class TestTouchInteractionAgent:
    """Test touch interaction agent."""

    def test_agent_creation(self):
        """Test creating the agent."""
        agent = TouchInteractionAgent()

        assert agent.agent_id == "touch_interaction:analysis"
        assert agent.agent_type == AgentType.SPECIALIST

    def test_analyze_gestures(self):
        """Test gesture analysis."""
        agent = TouchInteractionAgent()

        result = agent._analyze_gestures({
            "gestures": [
                {
                    "id": "swipe_left",
                    "type": "swipe",
                    "discoverability": "good",
                },
                {
                    "id": "pinch_zoom",
                    "type": "pinch",
                    "discoverability": "poor",
                },
            ],
        }, {})

        assert "gesture_score" in result
        assert "discoverability_issues" in result
        assert result["total_gestures"] == 2


class TestAccessibilityAgent:
    """Test accessibility agent."""

    def test_agent_creation(self):
        """Test creating the agent."""
        agent = AccessibilityAgent()

        assert agent.agent_id == "accessibility:analysis"
        assert agent.agent_type == AgentType.SPECIALIST

    def test_analyze_contrast(self):
        """Test contrast analysis."""
        agent = AccessibilityAgent()

        result = agent._analyze_contrast({
            "color_pairs": [
                {
                    "element_id": "text1",
                    "foreground": "#333333",
                    "background": "#FFFFFF",
                    "element_type": "text",
                },
                {
                    "element_id": "text2",
                    "foreground": "#CCCCCC",
                    "background": "#FFFFFF",
                    "element_type": "text",
                },
            ],
        }, {})

        assert "contrast_score" in result
        assert "violations" in result
        assert result["total_pairs"] == 2

    def test_analyze_colorblind(self):
        """Test colorblind accessibility analysis."""
        agent = AccessibilityAgent()

        result = agent._analyze_colorblind({
            "ui_elements": [
                {
                    "id": "indicator1",
                    "colors": ["red", "green"],
                    "has_icons": False,
                    "has_labels": False,
                },
                {
                    "id": "indicator2",
                    "colors": ["blue", "orange"],
                    "has_icons": True,
                },
            ],
        }, {})

        assert "colorblind_score" in result
        assert "issues" in result


class TestAgentIntegration:
    """Integration tests for agent system."""

    def test_full_routing_and_execution(self):
        """Test complete routing and execution flow."""
        # Create registry
        registry = AgentRegistry()

        # Register specialized agents
        agents = [
            MobileUIAnalysisAgent(),
            TouchInteractionAgent(),
            AccessibilityAgent(),
        ]

        for agent in agents:
            registry.register(agent)

        # Create router
        router = ChainOfThoughtRouter()
        registry.register(router)

        # Execute routing for UI analysis task
        result = router.execute({
            "task": "Analyze this mobile game UI for accessibility",
            "inputs": {"ui_elements": []},
        })

        # Verify routing succeeded
        assert result["decision"]["selected_agent_id"] is not None
        assert result["decision"]["confidence"] > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
