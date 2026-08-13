"""
tests/integration/test_full_harness.py — Integration Tests
End-to-end integration tests for the complete skill harness.
"""
import pytest
from pathlib import Path
import tempfile
import json
from agents import get_agent_registry, register_agent
from agents.specialized import create_specialized_agents
from agents.router import create_router
from hooks import get_hook_registry, register_builtin_hooks
from hooks.degradation import get_degradation_manager, register_degradation_hooks
from skills.registry import get_skill_registry, initialize_skills
from tools.schemas.handlers import get_executor


@pytest.fixture
def setup_system():
    """Set up the complete system for integration testing."""
    # Initialize hooks
    register_builtin_hooks()

    # Initialize agents
    create_specialized_agents()
    create_router()

    # Initialize skills (will scan skills/ directory)
    initialize_skills()

    yield {
        "agent_registry": get_agent_registry(),
        "hook_registry": get_hook_registry(),
        "skill_registry": get_skill_registry(),
        "degradation_manager": get_degradation_manager(),
        "tool_executor": get_executor(),
    }


class TestSystemIntegration:
    """Integration tests for complete system."""

    def test_hook_system_initialization(self, setup_system):
        """Test hook system initializes correctly."""
        hook_registry = setup_system["hook_registry"]
        stats = hook_registry.get_metadata()

        assert stats["registered_count"] > 0
        assert "events_registered" in stats

    def test_agent_registry_initialization(self, setup_system):
        """Test agent registry initializes with expected agents."""
        agent_registry = setup_system["agent_registry"]

        stats = agent_registry.get_stats()
        assert stats["total_agents"] >= 3  # At least 3 specialized agents

    def test_skill_registry_initialization(self, setup_system):
        """Test skill registry discovers and registers skills."""
        skill_registry = setup_system["skill_registry"]

        stats = skill_registry.get_stats()
        assert stats["total_skills"] > 0
        assert stats["enabled_skills"] > 0

    def test_tool_executor_has_handlers(self, setup_system):
        """Test tool executor has handlers registered."""
        executor = setup_system["tool_executor"]

        # Check for essential handlers
        assert "ReadFile" in executor._handlers
        assert "WriteFile" in executor._handlers
        assert "KnowledgeQuery" in executor._handlers

    def test_degradation_manager_initial_state(self, setup_system):
        """Test degradation manager starts in FULL state."""
        degradation_manager = setup_system["degradation_manager"]

        from hooks.degradation import DegradationLevel
        assert degradation_manager.get_level() == DegradationLevel.FULL

    def test_full_analysis_workflow(self, setup_system):
        """Test complete analysis workflow from input to output."""
        # This tests the full harness: routing → agent execution → output

        agent_registry = setup_system["agent_registry"]

        # Simulate a mobile UI analysis request
        task = "Analyze this mobile game UI for touch targets and accessibility"

        # Find best agent via router
        router = create_router()
        routing_result = router.execute({
            "task": task,
            "inputs": {
                "ui_elements": [
                    {
                        "id": "button1",
                        "position": {"x": 50, "y": 70},
                        "size": {"width": 60, "height": 50},
                    }
                ],
                "screen_size": "standard",
                "orientation": "portrait",
            },
        })

        # Verify routing succeeded
        assert routing_result["decision"]["selected_agent_id"] is not None
        assert routing_result["decision"]["confidence"] > 0

        # Get the selected agent
        selected_agent_id = routing_result["decision"]["selected_agent_id"]
        selected_agent = agent_registry.get_agent(selected_agent_id)

        assert selected_agent is not None

        # Execute the analysis
        analysis_result = selected_agent.execute({
            "analysis_type": "comprehensive",
            "ui_elements": [
                {
                    "id": "button1",
                    "position": {"x": 50, "y": 70},
                    "size": {"width": 60, "height": 50},
                }
            ],
            "touch_targets": [
                {
                    "id": "button1",
                    "size": {"width": 60, "height": 50},
                }
            ],
        })

        # Verify analysis output
        assert "overall_score" in analysis_result
        assert analysis_result["overall_score"] >= 0
        assert analysis_result["overall_score"] <= 100


class TestDegradationFlow:
    """Integration tests for degradation handling."""

    def test_source_failure_triggers_degradation(self, setup_system):
        """Test that source failures trigger degradation level changes."""
        degradation_manager = setup_system["degradation_manager"]
        from hooks.degradation import DegradationLevel

        # Record multiple failures
        for i in range(3):
            degradation_manager.record_failure(f"source_{i}")

        # Should have escalated to KNOWLEDGE_BASE_ONLY
        assert degradation_manager.get_level() == DegradationLevel.KNOWLEDGE_BASE_ONLY

    def test_degradation_banner_generation(self, setup_system):
        """Test degradation banner generation."""
        degradation_manager = setup_system["degradation_manager"]
        from hooks.degradation import DegradationLevel

        # Set a degraded state
        degradation_manager.set_level(
            DegradationLevel.PARTIAL,
            "Network connectivity issues"
        )
        degradation_manager.add_flag("DATA_MAY_BE_STALE")

        # Get banner
        banner = degradation_manager.get_banner()

        assert "LIMITATION NOTICE" in banner
        assert "Level 1" in banner
        assert "DATA_MAY_BE_STALE" in banner

    def test_should_proceed_logic(self, setup_system):
        """Test should_proceed logic for different degradation levels."""
        degradation_manager = setup_system["degradation_manager"]
        from hooks.degradation import DegradationLevel

        # Should proceed at FULL level
        degradation_manager.set_level(DegradationLevel.FULL)
        assert degradation_manager.should_proceed() is True

        # Should proceed at PARTIAL level
        degradation_manager.set_level(DegradationLevel.PARTIAL)
        assert degradation_manager.should_proceed() is True

        # Should NOT proceed at COMPLETE_FAILURE
        degradation_manager.set_level(DegradationLevel.COMPLETE_FAILURE)
        assert degradation_manager.should_proceed() is False


class TestStateSynchronization:
    """Integration tests for state synchronization."""

    def test_state_snapshot_creation(self, setup_system):
        """Test creating state snapshots."""
        from hooks.degradation import get_state_synchronizer

        synchronizer = get_state_synchronizer()

        # Create a snapshot
        snapshot_id = synchronizer.create_snapshot(
            component="test_component",
            data={"test": "data"},
            metadata={"phase": "testing"}
        )

        assert snapshot_id is not None

        # Retrieve snapshot
        snapshot = synchronizer.get_snapshot(snapshot_id)
        assert snapshot is not None
        assert snapshot["data"]["test"] == "data"

    def test_state_sync_with_degradation(self, setup_system):
        """Test state synchronization with degradation awareness."""
        from hooks.degradation import get_state_synchronizer, DegradationLevel

        synchronizer = get_state_synchronizer()
        degradation_manager = setup_system["degradation_manager"]

        # Set degraded state
        degradation_manager.set_level(DegradationLevel.PARTIAL, "Test degradation")

        # Synchronize component
        sync_data = synchronizer.synchronize_with_degradation("test_component")

        assert sync_data["degradation_level"] == DegradationLevel.PARTIAL.value
        assert "failed_sources" in sync_data


class TestToolExecutorIntegration:
    """Integration tests for tool executor with real handlers."""

    def test_file_operations_integration(self, setup_system, tmp_path):
        """Test integrated file read/write operations."""
        executor = setup_system["tool_executor"]

        # Write a file
        test_file = tmp_path / "test.txt"
        write_result = executor.execute(
            "WriteFile",
            {
                "path": str(test_file),
                "content": "Integration test content",
                "encoding": "utf-8",
            }
        )

        assert write_result["success"] is True

        # Read the file back
        read_result = executor.execute(
            "ReadFile",
            {
                "path": str(test_file),
                "encoding": "utf-8",
            }
        )

        assert read_result["success"] is True
        assert read_result["content"] == "Integration test content"

    def test_execution_history_tracking(self, setup_system):
        """Test execution history is properly tracked."""
        executor = setup_system["tool_executor"]

        # Execute some tools
        for i in range(3):
            executor.execute(
                "ReadFile",
                {"path": __file__, "encoding": "utf-8"}
            )

        history = executor.get_execution_history()
        assert len(history) == 3

        # All should be ReadFile
        for record in history:
            assert record["tool_name"] == "ReadFile"


class TestSkillResolutionIntegration:
    """Integration tests for skill resolution system."""

    def test_skill_resolution_for_ui_task(self, setup_system):
        """Test resolving appropriate skill for UI analysis task."""
        skill_registry = setup_system["skill_registry"]

        # Resolve skill for UI analysis task
        result = skill_registry.resolve_skill(
            task="Analyze mobile game UI for touch targets",
            context={"domain": "mobile_ui"},
        )

        # Should find a matching skill
        assert result.skill_id is not None
        assert result.confidence > 0

    def test_skill_resolution_caching(self, setup_system):
        """Test skill resolution caching."""
        skill_registry = setup_system["skill_registry"]

        task = "Test task for caching"

        # First call (cache miss)
        result1 = skill_registry.resolve_skill(task, use_cache=True)

        # Second call (cache hit)
        result2 = skill_registry.resolve_skill(task, use_cache=True)

        # Results should be identical
        assert result1.skill_id == result2.skill_id
        assert result1.confidence == result2.confidence

        # Check cache stats
        stats = skill_registry.get_stats()
        assert stats["cache_hits"] >= 1


class TestMultiAgentCoordination:
    """Integration tests for coordinating multiple agents."""

    def test_sequential_agent_execution(self, setup_system):
        """Test executing multiple agents in sequence."""
        agent_registry = setup_system["agent_registry"]

        # Get specialized agents
        agents = agent_registry.get_specialists()

        # Execute each agent
        results = []
        for agent in agents[:3]:  # Test first 3 agents
            try:
                result = agent.execute({
                    "analysis_type": "comprehensive",
                    "ui_elements": [],
                    "touch_targets": [],
                    "gestures": [],
                    "feedback_systems": [],
                })
                results.append({
                    "agent_id": agent.agent_id,
                    "result": result,
                })
            except Exception as e:
                results.append({
                    "agent_id": agent.agent_id,
                    "error": str(e),
                })

        # At least some should succeed
        successful = [r for r in results if "error" not in r]
        assert len(successful) > 0


class TestEndToEndWorkflow:
    """End-to-end workflow tests."""

    def test_complete_analysis_workflow(self, setup_system, tmp_path):
        """Test complete workflow from task input to final report."""
        # This simulates the full skill harness workflow

        # 1. Input data
        input_data = {
            "task": "Evaluate mobile game UI for accessibility",
            "ui_data": {
                "elements": [
                    {
                        "id": "play_button",
                        "position": {"x": 50, "y": 80},
                        "size": {"width": 80, "height": 50},
                        "colors": ["#00FF00", "#FF0000"],
                    }
                ],
                "touch_targets": [
                    {
                        "id": "play_button",
                        "size": {"width": 80, "height": 50},
                    }
                ],
            },
            "context": {
                "screen_size": "standard",
                "orientation": "portrait",
            },
        }

        # 2. Route to appropriate agent
        router = create_router()
        routing = router.execute({
            "task": input_data["task"],
            "inputs": input_data["ui_data"],
        })

        assert routing["decision"]["selected_agent_id"] is not None

        # 3. Execute analysis
        agent_registry = setup_system["agent_registry"]
        selected_agent = agent_registry.get_agent(routing["decision"]["selected_agent_id"])

        analysis = selected_agent.execute({
            "analysis_type": "comprehensive",
            **input_data["ui_data"],
        })

        # 4. Generate report structure
        report = {
            "task": input_data["task"],
            "analysis": analysis,
            "routing": routing["decision"].to_dict(),
            "timestamp": routing["analysis"].get("timestamp"),
        }

        # 5. Verify report structure
        assert "task" in report
        assert "analysis" in report
        assert "routing" in report

        # Save report to file
        report_file = tmp_path / "analysis_report.json"
        report_file.write_text(json.dumps(report, indent=2))

        assert report_file.exists()
        assert len(report_file.read_text()) > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
