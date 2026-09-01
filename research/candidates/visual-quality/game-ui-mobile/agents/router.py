"""
agents/router.py — Chain-of-Thought Router Agent
Implements sophisticated routing logic with chain-of-thought reasoning
for delegating tasks to appropriate specialist agents.
"""
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime
import json

from . import Agent, AgentType, AgentPriority, AgentCapability, get_agent_registry


@dataclass
class RoutingDecision:
    """Represents a routing decision."""
    selected_agent_id: str
    confidence: float
    reasoning: List[str]
    alternative_agents: List[Tuple[str, float]]  # (agent_id, confidence)
    execution_plan: List[Dict[str, Any]]
    estimated_confidence: float

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "selected_agent_id": self.selected_agent_id,
            "confidence": self.confidence,
            "reasoning": self.reasoning,
            "alternative_agents": self.alternative_agents,
            "execution_plan": self.execution_plan,
            "estimated_confidence": self.estimated_confidence,
        }


class ChainOfThoughtRouter(Agent):
    """
    Router agent that uses chain-of-thought reasoning to delegate tasks
    to the most appropriate specialist agents.
    """

    def __init__(self):
        super().__init__(
            agent_id="router:chain_of_thought",
            agent_type=AgentType.ROUTER,
            name="Chain-of-Thought Router",
            description="Routes tasks to specialist agents using chain-of-thought reasoning",
            priority=AgentPriority.CRITICAL,
        )
        self.routing_history: List[Dict[str, Any]] = []
        self._init_capabilities()

    def _init_capabilities(self):
        """Initialize router capabilities."""
        self.capabilities = [
            AgentCapability(
                name="route_task",
                description="Route a task to the most appropriate agent",
                input_schema={
                    "type": "object",
                    "properties": {
                        "task": {"type": "string"},
                        "inputs": {"type": "object"},
                        "context": {"type": "object"},
                    },
                },
                output_schema={
                    "type": "object",
                    "properties": {
                        "agent_id": {"type": "string"},
                        "confidence": {"type": "number"},
                        "reasoning": {"type": "array"},
                    },
                },
            )
        ]

    def execute(self, inputs: Dict[str, Any], context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Execute routing with chain-of-thought reasoning."""
        task = inputs.get("task", "")
        task_inputs = inputs.get("inputs", {})
        routing_context = context or {}

        # Step 1: Analyze the task
        analysis = self._analyze_task(task, task_inputs, routing_context)

        # Step 2: Identify candidate agents
        candidates = self._identify_candidates(analysis)

        # Step 3: Evaluate each candidate
        evaluations = self._evaluate_candidates(candidates, analysis)

        # Step 4: Make routing decision
        decision = self._make_decision(evaluations, analysis)

        # Step 5: Create execution plan
        execution_plan = self._create_execution_plan(decision, analysis)

        # Record routing history
        self._record_routing(task, decision, execution_plan)

        return {
            "decision": decision.to_dict(),
            "execution_plan": execution_plan,
            "analysis": analysis,
        }

    def _analyze_task(self, task: str, inputs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze the task to understand requirements."""
        task_lower = task.lower()

        # Extract key information
        keywords = self._extract_keywords(task)
        domains = self._identify_domains(task, keywords)
        complexity = self._assess_complexity(task, inputs)
        urgency = self._assess_urgency(task, context)

        return {
            "task": task,
            "keywords": keywords,
            "domains": domains,
            "complexity": complexity,
            "urgency": urgency,
            "input_types": self._identify_input_types(inputs),
            "expected_output": self._infer_expected_output(task),
        }

    def _extract_keywords(self, task: str) -> List[str]:
        """Extract relevant keywords from task description."""
        # Domain-specific keywords for mobile game UI
        domain_keywords = [
            "ui", "ux", "interface", "design", "layout",
            "touch", "gesture", "tap", "swipe", "pinch",
            "mobile", "responsive", "screen", "size",
            "accessibility", "a11y", "colorblind", "contrast",
            "thumb", "zone", "reach", "ergonomics",
            "game", "play", "player", "interaction",
            "analyze", "evaluate", "assess", "review",
            "recommend", "suggest", "improve", "optimize",
        ]

        task_lower = task.lower()
        return [kw for kw in domain_keywords if kw in task_lower]

    def _identify_domains(self, task: str, keywords: List[str]) -> List[str]:
        """Identify relevant domains for the task."""
        domain_mapping = {
            "ui": ["ui", "interface", "layout", "design"],
            "ux": ["ux", "usability", "experience"],
            "touch": ["touch", "gesture", "tap", "swipe", "pinch"],
            "accessibility": ["accessibility", "a11y", "colorblind", "contrast"],
            "ergonomics": ["thumb", "zone", "reach", "ergonomics"],
            "analysis": ["analyze", "evaluate", "assess", "review"],
        }

        domains = []
        for domain, terms in domain_mapping.items():
            if any(term in task.lower() for term in terms):
                domains.append(domain)

        return domains if domains else ["general"]

    def _assess_complexity(self, task: str, inputs: Dict[str, Any]) -> str:
        """Assess task complexity level."""
        complexity_indicators = {
            "high": ["comprehensive", "detailed", "full", "complete", "entire"],
            "medium": ["analyze", "evaluate", "assess", "review"],
            "low": ["quick", "simple", "basic", "check"],
        }

        task_lower = task.lower()
        for level, indicators in complexity_indicators.items():
            if any(ind in task_lower for ind in indicators):
                return level

        # Default to medium
        return "medium"

    def _assess_urgency(self, task: str, context: Dict[str, Any]) -> str:
        """Assess task urgency level."""
        urgency_indicators = {
            "critical": ["urgent", "asap", "immediately", "critical"],
            "high": ["soon", "quickly", "priority"],
            "normal": ["standard", "normal", "regular"],
        }

        task_lower = task.lower()
        for level, indicators in urgency_indicators.items():
            if any(ind in task_lower for ind in indicators):
                return level

        return "normal"

    def _identify_input_types(self, inputs: Dict[str, Any]) -> List[str]:
        """Identify types of inputs provided."""
        input_types = []

        for key, value in inputs.items():
            if isinstance(value, str):
                if value.endswith((".png", ".jpg", ".jpeg", ".gif")):
                    input_types.append("image")
                elif value.endswith((".pdf", ".doc", ".docx")):
                    input_types.append("document")
                else:
                    input_types.append("text")
            elif isinstance(value, (list, dict)):
                input_types.append("structured_data")
            elif isinstance(value, (int, float)):
                input_types.append("numeric")

        return input_types if input_types else ["text"]

    def _infer_expected_output(self, task: str) -> str:
        """Infer expected output type from task description."""
        task_lower = task.lower()

        output_indicators = {
            "report": ["report", "analysis", "evaluation", "assessment"],
            "recommendations": ["recommend", "suggest", "improve", "optimize"],
            "design": ["design", "mockup", "prototype", "layout"],
            "score": ["score", "rate", "grade", "evaluate"],
        }

        for output_type, indicators in output_indicators.items():
            if any(ind in task_lower for ind in indicators):
                return output_type

        return "analysis"

    def _identify_candidates(self, analysis: Dict[str, Any]) -> List[Agent]:
        """Identify candidate agents for the task."""
        registry = get_agent_registry()
        candidates = []

        # Get specialists by domain
        for domain in analysis["domains"]:
            specialists = registry.get_specialists(domain)
            candidates.extend(specialists)

        # If no domain-specific agents, get all specialists
        if not candidates:
            candidates = registry.get_specialists()

        # Sort by priority
        candidates.sort(key=lambda a: a.priority.value)

        return candidates

    def _evaluate_candidates(self, candidates: List[Agent], analysis: Dict[str, Any]) -> List[Tuple[Agent, float]]:
        """Evaluate each candidate's suitability."""
        evaluations = []

        for agent in candidates:
            # Calculate base confidence from keyword matching
            task = analysis["task"]
            inputs = {"task": task, "inputs": analysis.get("input_types", [])}
            base_confidence = agent.can_handle(task, inputs)

            # Adjust confidence based on factors
            adjusted_confidence = self._adjust_confidence(agent, base_confidence, analysis)

            evaluations.append((agent, adjusted_confidence))

        # Sort by confidence
        evaluations.sort(key=lambda x: x[1], reverse=True)

        return evaluations

    def _adjust_confidence(self, agent: Agent, base_confidence: float, analysis: Dict[str, Any]) -> float:
        """Adjust confidence based on various factors."""
        confidence = base_confidence

        # Factor in agent's historical success rate
        stats = agent.get_stats()
        if stats["execution_count"] > 0:
            success_rate = stats["success_rate"] / 100
            confidence = confidence * 0.7 + success_rate * 0.3

        # Factor in complexity match
        agent_complexity = self._infer_agent_complexity(agent)
        task_complexity = analysis["complexity"]

        complexity_match = self._calculate_complexity_match(agent_complexity, task_complexity)
        confidence *= (0.8 + 0.2 * complexity_match)

        # Factor in urgency vs agent priority
        urgency = analysis["urgency"]
        if urgency == "critical" and agent.priority.value <= 1:
            confidence *= 1.1

        # Clamp to valid range
        return max(0.0, min(1.0, confidence))

    def _infer_agent_complexity(self, agent: Agent) -> str:
        """Infer the complexity level an agent is designed for."""
        desc = agent.description.lower()

        if any(word in desc for word in ["comprehensive", "detailed", "complete"]):
            return "high"
        elif any(word in desc for word in ["quick", "simple", "basic"]):
            return "low"
        else:
            return "medium"

    def _calculate_complexity_match(self, agent_complexity: str, task_complexity: str) -> float:
        """Calculate how well agent complexity matches task complexity."""
        complexity_order = {"low": 0, "medium": 1, "high": 2}

        agent_level = complexity_order.get(agent_complexity, 1)
        task_level = complexity_order.get(task_complexity, 1)

        # Perfect match = 1.0, one level off = 0.7, two levels off = 0.4
        diff = abs(agent_level - task_level)
        return 1.0 - diff * 0.3

    def _make_decision(self, evaluations: List[Tuple[Agent, float]], analysis: Dict[str, Any]) -> RoutingDecision:
        """Make the final routing decision with reasoning."""
        if not evaluations:
            # No suitable agent found
            return RoutingDecision(
                selected_agent_id="none",
                confidence=0.0,
                reasoning=["No suitable agent found for this task"],
                alternative_agents=[],
                execution_plan=[],
                estimated_confidence=0.0,
            )

        # Select best agent
        best_agent, best_confidence = evaluations[0]

        # Build reasoning chain
        reasoning = self._build_reasoning_chain(evaluations, analysis)

        # Get alternative agents
        alternatives = [(a.agent_id, c) for a, c in evaluations[1:4]]

        # Estimate overall confidence
        estimated_confidence = self._estimate_overall_confidence(best_agent, best_confidence, analysis)

        return RoutingDecision(
            selected_agent_id=best_agent.agent_id,
            confidence=best_confidence,
            reasoning=reasoning,
            alternative_agents=alternatives,
            execution_plan=[],  # Will be filled separately
            estimated_confidence=estimated_confidence,
        )

    def _build_reasoning_chain(self, evaluations: List[Tuple[Agent, float]], analysis: Dict[str, Any]) -> List[str]:
        """Build chain-of-thought reasoning for the decision."""
        reasoning = []

        # Step 1: Task understanding
        reasoning.append(f"Task: {analysis['task']}")
        reasoning.append(f"Identified domains: {', '.join(analysis['domains'])}")
        reasoning.append(f"Complexity level: {analysis['complexity']}")
        reasoning.append(f"Urgency: {analysis['urgency']}")

        # Step 2: Candidate evaluation
        if evaluations:
            best = evaluations[0]
            reasoning.append(f"Best match: {best[0].name} (confidence: {best[1]:.2f})")

            if len(evaluations) > 1:
                second = evaluations[1]
                reasoning.append(f"Second choice: {second[0].name} (confidence: {second[1]:.2f})")

        # Step 3: Consideration of alternatives
        if len(evaluations) > 2:
            reasoning.append(f"Considered {len(evaluations)} candidate agents")

        return reasoning

    def _estimate_overall_confidence(self, agent: Agent, agent_confidence: float, analysis: Dict[str, Any]) -> float:
        """Estimate overall confidence in the successful execution."""
        confidence = agent_confidence

        # Reduce confidence for high complexity tasks
        if analysis["complexity"] == "high":
            confidence *= 0.85

        # Increase confidence for highly capable agents
        stats = agent.get_stats()
        if stats["execution_count"] >= 10 and stats["success_rate"] >= 90:
            confidence *= 1.1

        return max(0.0, min(1.0, confidence))

    def _create_execution_plan(self, decision: RoutingDecision, analysis: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Create execution plan for the selected agent."""
        plan = []

        # Step 1: Preparation
        plan.append({
            "step": 1,
            "action": "prepare",
            "description": "Prepare inputs and context for agent execution",
            "agent": decision.selected_agent_id,
        })

        # Step 2: Primary execution
        plan.append({
            "step": 2,
            "action": "execute",
            "description": f"Execute {decision.selected_agent_id} agent",
            "agent": decision.selected_agent_id,
        })

        # Step 3: Quality validation
        plan.append({
            "step": 3,
            "action": "validate",
            "description": "Validate output quality and completeness",
            "agent": "validator:quality",
        })

        # Step 4: Fallback if needed
        if decision.alternative_agents:
            plan.append({
                "step": 4,
                "action": "fallback",
                "description": "Fallback to alternative if primary fails",
                "agents": [aid for aid, _ in decision.alternative_agents[:2]],
            })

        return plan

    def _record_routing(self, task: str, decision: RoutingDecision, execution_plan: List[Dict[str, Any]]) -> None:
        """Record routing decision in history."""
        self.routing_history.append({
            "timestamp": datetime.now().isoformat(),
            "task": task,
            "selected_agent": decision.selected_agent_id,
            "confidence": decision.confidence,
            "estimated_confidence": decision.estimated_confidence,
            "execution_plan_steps": len(execution_plan),
        })

    def get_routing_stats(self) -> Dict[str, Any]:
        """Get routing statistics."""
        if not self.routing_history:
            return {"total_routings": 0}

        total = len(self.routing_history)
        avg_confidence = sum(r["confidence"] for r in self.routing_history) / total

        agent_counts = {}
        for routing in self.routing_history:
            agent_id = routing["selected_agent"]
            agent_counts[agent_id] = agent_counts.get(agent_id, 0) + 1

        return {
            "total_routings": total,
            "average_confidence": avg_confidence,
            "most_routed_agents": sorted(agent_counts.items(), key=lambda x: x[1], reverse=True)[:5],
        }


def create_router() -> ChainOfThoughtRouter:
    """Create and register a new router instance."""
    router = ChainOfThoughtRouter()
    register_agent(router)
    return router


__all__ = [
    "ChainOfThoughtRouter",
    "RoutingDecision",
    "create_router",
]
