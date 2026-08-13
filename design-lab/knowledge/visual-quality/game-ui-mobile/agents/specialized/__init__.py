"""
agents/specialized/__init__.py — Specialized Domain-Specific Agents
Implements specialized agents for mobile game UI/UX and touch interaction design.
"""
from .. import Agent, AgentType, AgentPriority
from typing import Dict, Any, List


class MobileUIAnalysisAgent(Agent):
    """Specialized agent for mobile UI analysis."""

    def __init__(self):
        super().__init__(
            agent_id="mobile_ui:analysis",
            agent_type=AgentType.SPECIALIST,
            name="Mobile UI Analysis Specialist",
            description="Analyzes mobile game interfaces for usability, touch-friendliness, and design best practices",
            priority=AgentPriority.HIGH,
        )
        self._init_capabilities()

    def _init_capabilities(self):
        """Initialize agent capabilities."""
        from .. import AgentCapability

        self.capabilities = [
            AgentCapability(
                name="analyze_ui_layout",
                description="Analyze UI layout for touch optimization",
                input_schema={
                    "type": "object",
                    "properties": {
                        "ui_elements": {"type": "array"},
                        "screen_size": {"type": "string"},
                        "orientation": {"type": "string"},
                    },
                },
                output_schema={
                    "type": "object",
                    "properties": {
                        "layout_score": {"type": "number"},
                        "recommendations": {"type": "array"},
                    },
                },
            ),
            AgentCapability(
                name="analyze_touch_targets",
                description="Analyze touch target sizes and placements",
                input_schema={
                    "type": "object",
                    "properties": {
                        "touch_targets": {"type": "array"},
                        "target_size_min": {"type": "number"},
                    },
                },
                output_schema={
                    "type": "object",
                    "properties": {
                        "touch_score": {"type": "number"},
                        "violations": {"type": "array"},
                    },
                },
            ),
        ]

    def execute(self, inputs: Dict[str, Any], context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Execute mobile UI analysis."""
        analysis_type = inputs.get("analysis_type", "comprehensive")

        if analysis_type == "layout":
            return self._analyze_layout(inputs, context)
        elif analysis_type == "touch_targets":
            return self._analyze_touch_targets(inputs, context)
        else:
            return self._comprehensive_analysis(inputs, context)

    def _analyze_layout(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze UI layout."""
        ui_elements = inputs.get("ui_elements", [])
        screen_size = inputs.get("screen_size", "standard")
        orientation = inputs.get("orientation", "portrait")

        # Apply Fitts's Law and thumb zone analysis
        recommendations = []
        score = 100.0

        for element in ui_elements:
            position = element.get("position", {})
            size = element.get("size", {})

            # Check thumb zone accessibility
            if not self._in_thumb_zone(position, orientation):
                recommendations.append({
                    "element": element.get("id", ""),
                    "issue": "Outside thumb zone",
                    "severity": "medium",
                    "suggestion": "Move to bottom half of screen for better reach",
                })
                score -= 10

            # Check element size
            width = size.get("width", 0)
            height = size.get("height", 0)
            if width < 44 or height < 44:
                recommendations.append({
                    "element": element.get("id", ""),
                    "issue": "Touch target too small",
                    "severity": "high",
                    "suggestion": "Increase to minimum 44x44 points",
                })
                score -= 15

        return {
            "layout_score": max(0, score),
            "recommendations": recommendations,
            "orientation": orientation,
            "screen_size": screen_size,
        }

    def _analyze_touch_targets(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze touch target compliance."""
        touch_targets = inputs.get("touch_targets", [])
        min_size = inputs.get("target_size_min", 44)

        violations = []
        score = 100.0

        for target in touch_targets:
            size = target.get("size", {})
            width = size.get("width", 0)
            height = size.get("height", 0)

            if width < min_size or height < min_size:
                violations.append({
                    "target_id": target.get("id", ""),
                    "current_size": f"{width}x{height}",
                    "required_size": f"{min_size}x{min_size}",
                    "severity": "high" if width < min_size * 0.75 else "medium",
                })
                score -= 20 / len(touch_targets)

        return {
            "touch_score": max(0, score),
            "violations": violations,
            "total_targets": len(touch_targets),
            "compliant_targets": len(touch_targets) - len(violations),
        }

    def _comprehensive_analysis(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Perform comprehensive UI analysis."""
        layout_result = self._analyze_layout(inputs, context)
        touch_result = self._analyze_touch_targets(inputs, context)

        # Combine results
        overall_score = (layout_result["layout_score"] + touch_result["touch_score"]) / 2

        return {
            "overall_score": overall_score,
            "layout_analysis": layout_result,
            "touch_analysis": touch_result,
            "recommendations": self._prioritize_recommendations(
                layout_result.get("recommendations", []) +
                touch_result.get("violations", [])
            ),
        }

    def _in_thumb_zone(self, position: Dict[str, Any], orientation: str) -> bool:
        """Check if position is in thumb zone."""
        if orientation == "portrait":
            # Thumb zone is bottom 2/3 of screen
            y = position.get("y", 0)
            return y > 33  # Assuming screen height percentage
        else:
            # Thumb zone is left/right edges in landscape
            x = position.get("x", 50)
            return x < 25 or x > 75

    def _prioritize_recommendations(self, recommendations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Prioritize recommendations by severity and impact."""
        severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}

        return sorted(
            recommendations,
            key=lambda r: (severity_order.get(r.get("severity", "low"), 4), -len(r.get("suggestion", "")))
        )

    def can_handle(self, task: str, inputs: Dict[str, Any]) -> float:
        """Check if this agent can handle the task."""
        task_lower = task.lower()
        keywords = ["ui", "interface", "layout", "design", "mobile", "touch", "screen"]

        matches = sum(1 for kw in keywords if kw in task_lower)
        base_score = matches / max(len(task_lower.split()), 1)

        # Boost if UI-specific terms present
        if any(term in task_lower for term in ["ui analysis", "interface design", "layout review"]):
            base_score = min(base_score + 0.3, 1.0)

        return base_score


class TouchInteractionAgent(Agent):
    """Specialized agent for touch interaction analysis."""

    def __init__(self):
        super().__init__(
            agent_id="touch_interaction:analysis",
            agent_type=AgentType.SPECIALIST,
            name="Touch Interaction Specialist",
            description="Analyzes touch interactions, gestures, and input patterns for mobile games",
            priority=AgentPriority.HIGH,
        )
        self._init_capabilities()

    def _init_capabilities(self):
        """Initialize agent capabilities."""
        from .. import AgentCapability

        self.capabilities = [
            AgentCapability(
                name="analyze_gestures",
                description="Analyze gesture patterns and discoverability",
                input_schema={
                    "type": "object",
                    "properties": {
                        "gestures": {"type": "array"},
                    },
                },
                output_schema={
                    "type": "object",
                    "properties": {
                        "gesture_score": {"type": "number"},
                        "discoverability_issues": {"type": "array"},
                    },
                },
            ),
            AgentCapability(
                name="analyze_touch_feedback",
                description="Analyze touch feedback mechanisms",
                input_schema={
                    "type": "object",
                    "properties": {
                        "feedback_systems": {"type": "array"},
                    },
                },
                output_schema={
                    "type": "object",
                    "properties": {
                        "feedback_score": {"type": "number"},
                        "recommendations": {"type": "array"},
                    },
                },
            ),
        ]

    def execute(self, inputs: Dict[str, Any], context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Execute touch interaction analysis."""
        analysis_type = inputs.get("analysis_type", "comprehensive")

        if analysis_type == "gestures":
            return self._analyze_gestures(inputs, context)
        elif analysis_type == "feedback":
            return self._analyze_feedback(inputs, context)
        else:
            return self._comprehensive_analysis(inputs, context)

    def _analyze_gestures(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze gesture patterns."""
        gestures = inputs.get("gestures", [])

        issues = []
        score = 100.0

        for gesture in gestures:
            gesture_type = gesture.get("type", "")
            discoverability = gesture.get("discoverability", "unknown")

            # Check for discoverability
            if discoverability == "unknown" or discoverability == "poor":
                issues.append({
                    "gesture": gesture_type,
                    "issue": "Poor discoverability",
                    "severity": "high",
                    "suggestion": "Add visual hint or tutorial for this gesture",
                })
                score -= 15

            # Check gesture conflicts
            if self._has_gesture_conflict(gesture, gestures):
                issues.append({
                    "gesture": gesture_type,
                    "issue": "Potential gesture conflict",
                    "severity": "medium",
                    "suggestion": "Review gesture mapping for conflicts",
                })
                score -= 10

        return {
            "gesture_score": max(0, score),
            "discoverability_issues": issues,
            "total_gestures": len(gestures),
        }

    def _analyze_feedback(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze touch feedback systems."""
        feedback_systems = inputs.get("feedback_systems", [])

        recommendations = []
        score = 100.0

        has_visual = any(fs.get("type") == "visual" for fs in feedback_systems)
        has_haptic = any(fs.get("type") == "haptic" for fs in feedback_systems)
        has_audio = any(fs.get("type") == "audio" for fs in feedback_systems)

        if not has_visual:
            recommendations.append({
                "type": "visual",
                "issue": "Missing visual feedback",
                "severity": "high",
                "suggestion": "Add visual indicators for touch responses",
            })
            score -= 30

        if not has_haptic:
            recommendations.append({
                "type": "haptic",
                "issue": "Missing haptic feedback",
                "severity": "medium",
                "suggestion": "Consider adding haptic feedback for better tactile response",
            })
            score -= 15

        return {
            "feedback_score": max(0, score),
            "recommendations": recommendations,
            "feedback_types": {
                "visual": has_visual,
                "haptic": has_haptic,
                "audio": has_audio,
            },
        }

    def _comprehensive_analysis(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Perform comprehensive touch interaction analysis."""
        gesture_result = self._analyze_gestures(inputs, context)
        feedback_result = self._analyze_feedback(inputs, context)

        overall_score = (gesture_result["gesture_score"] + feedback_result["feedback_score"]) / 2

        return {
            "overall_score": overall_score,
            "gesture_analysis": gesture_result,
            "feedback_analysis": feedback_result,
            "recommendations": self._combine_recommendations(
                gesture_result.get("discoverability_issues", []),
                feedback_result.get("recommendations", [])
            ),
        }

    def _has_gesture_conflict(self, gesture: Dict[str, Any], all_gestures: List[Dict[str, Any]]) -> bool:
        """Check if gesture conflicts with others."""
        gesture_type = gesture.get("type", "")
        gesture_area = gesture.get("area", "")

        for other in all_gestures:
            if other.get("id") == gesture.get("id"):
                continue

            # Check for same gesture type in same area
            if (other.get("type") == gesture_type and
                other.get("area") == gesture_area):
                return True

        return False

    def _combine_recommendations(self, gesture_issues: List, feedback_recs: List) -> List[Dict[str, Any]]:
        """Combine and deduplicate recommendations."""
        combined = gesture_issues + feedback_recs

        # Deduplicate by issue
        seen = set()
        unique = []
        for item in combined:
            issue_key = (item.get("issue", ""), item.get("type", item.get("gesture", "")))
            if issue_key not in seen:
                seen.add(issue_key)
                unique.append(item)

        return unique

    def can_handle(self, task: str, inputs: Dict[str, Any]) -> float:
        """Check if this agent can handle the task."""
        task_lower = task.lower()
        keywords = ["gesture", "touch", "interaction", "input", "feedback", "tap", "swipe"]

        matches = sum(1 for kw in keywords if kw in task_lower)
        base_score = matches / max(len(task_lower.split()), 1)

        if any(term in task_lower for term in ["gesture analysis", "touch interaction", "input feedback"]):
            base_score = min(base_score + 0.3, 1.0)

        return base_score


class AccessibilityAgent(Agent):
    """Specialized agent for accessibility analysis."""

    def __init__(self):
        super().__init__(
            agent_id="accessibility:analysis",
            agent_type=AgentType.SPECIALIST,
            name="Accessibility Specialist",
            description="Analyzes mobile game UI for accessibility including colorblind support, contrast, and screen reader compatibility",
            priority=AgentPriority.HIGH,
        )
        self._init_capabilities()

    def _init_capabilities(self):
        """Initialize agent capabilities."""
        from .. import AgentCapability

        self.capabilities = [
            AgentCapability(
                name="analyze_color_contrast",
                description="Analyze color contrast ratios for WCAG compliance",
                input_schema={
                    "type": "object",
                    "properties": {
                        "color_pairs": {"type": "array"},
                    },
                },
                output_schema={
                    "type": "object",
                    "properties": {
                        "contrast_score": {"type": "number"},
                        "violations": {"type": "array"},
                    },
                },
            ),
            AgentCapability(
                name="analyze_colorblind_support",
                description="Analyze colorblind accessibility",
                input_schema={
                    "type": "object",
                    "properties": {
                        "ui_elements": {"type": "array"},
                    },
                },
                output_schema={
                    "type": "object",
                    "properties": {
                        "colorblind_score": {"type": "number"},
                        "issues": {"type": "array"},
                    },
                },
            ),
        ]

    def execute(self, inputs: Dict[str, Any], context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Execute accessibility analysis."""
        analysis_type = inputs.get("analysis_type", "comprehensive")

        if analysis_type == "contrast":
            return self._analyze_contrast(inputs, context)
        elif analysis_type == "colorblind":
            return self._analyze_colorblind(inputs, context)
        else:
            return self._comprehensive_analysis(inputs, context)

    def _analyze_contrast(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze color contrast for WCAG compliance."""
        color_pairs = inputs.get("color_pairs", [])

        violations = []
        score = 100.0

        for pair in color_pairs:
            foreground = pair.get("foreground", "")
            background = pair.get("background", "")
            element_type = pair.get("element_type", "text")

            contrast_ratio = self._calculate_contrast_ratio(foreground, background)
            min_ratio = 4.5 if element_type == "text" else 3.0

            if contrast_ratio < min_ratio:
                violations.append({
                    "element": pair.get("element_id", ""),
                    "foreground": foreground,
                    "background": background,
                    "contrast_ratio": contrast_ratio,
                    "required_ratio": min_ratio,
                    "severity": "high" if contrast_ratio < 3.0 else "medium",
                })
                score -= 20 / len(color_pairs)

        return {
            "contrast_score": max(0, score),
            "violations": violations,
            "total_pairs": len(color_pairs),
        }

    def _analyze_colorblind(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze colorblind accessibility."""
        ui_elements = inputs.get("ui_elements", [])

        issues = []
        score = 100.0

        for element in ui_elements:
            colors = element.get("colors", [])
            element_id = element.get("id", "")

            # Check for color-only differentiation
            if len(colors) > 1 and not self._has_non_color_differentiation(element):
                issues.append({
                    "element": element_id,
                    "issue": "Color-only differentiation",
                    "severity": "high",
                    "suggestion": "Add patterns, symbols, or text labels alongside colors",
                })
                score -= 15

            # Check problematic color combinations
            if self._has_problematic_colors(colors):
                issues.append({
                    "element": element_id,
                    "issue": "Problematic color combination for colorblind users",
                    "severity": "medium",
                    "suggestion": "Avoid red/green combinations; consider blue/orange alternative",
                })
                score -= 10

        return {
            "colorblind_score": max(0, score),
            "issues": issues,
            "total_elements": len(ui_elements),
        }

    def _comprehensive_analysis(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Perform comprehensive accessibility analysis."""
        contrast_result = self._analyze_contrast(inputs, context)
        colorblind_result = self._analyze_colorblind(inputs, context)

        overall_score = (contrast_result["contrast_score"] + colorblind_result["colorblind_score"]) / 2

        return {
            "overall_score": overall_score,
            "contrast_analysis": contrast_result,
            "colorblind_analysis": colorblind_result,
            "recommendations": self._prioritize_accessibility_issues(
                contrast_result.get("violations", []) +
                colorblind_result.get("issues", [])
            ),
        }

    def _calculate_contrast_ratio(self, foreground: str, background: str) -> float:
        """Calculate contrast ratio between two colors."""
        # Simplified implementation - in production would use proper color space conversion
        # This is a placeholder that returns a reasonable ratio
        try:
            # Extract RGB values if in hex format
            def hex_to_rgb(hex_color):
                hex_color = hex_color.lstrip('#')
                return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

            if foreground.startswith('#') and background.startswith('#'):
                fg_rgb = hex_to_rgb(foreground)
                bg_rgb = hex_to_rgb(background)

                # Calculate relative luminance (simplified)
                def luminance(rgb):
                    r, g, b = [x / 255.0 for x in rgb]
                    return 0.299 * r + 0.587 * g + 0.114 * b

                L1 = luminance(fg_rgb)
                L2 = luminance(bg_rgb)

                if L1 > L2:
                    return (L1 + 0.05) / (L2 + 0.05)
                else:
                    return (L2 + 0.05) / (L1 + 0.05)
        except:
            pass

        # Return conservative estimate if calculation fails
        return 3.0

    def _has_non_color_differentiation(self, element: Dict[str, Any]) -> bool:
        """Check if element has non-color visual differentiation."""
        return (element.get("has_icons", False) or
                element.get("has_labels", False) or
                element.get("has_patterns", False))

    def _has_problematic_colors(self, colors: List[str]) -> bool:
        """Check for colorblind-problematic combinations."""
        # Red/green combinations are problematic for most common types
        red_indicators = ["red", "#ff0000", "#f00", "rgb(255,0,0)"]
        green_indicators = ["green", "#00ff00", "#0f0", "rgb(0,255,0)"]

        has_red = any(c in colors for c in red_indicators)
        has_green = any(c in colors for c in green_indicators)

        return has_red and has_green

    def _prioritize_accessibility_issues(self, issues: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Prioritize accessibility issues."""
        severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}

        return sorted(
            issues,
            key=lambda i: severity_order.get(i.get("severity", "low"), 4)
        )

    def can_handle(self, task: str, inputs: Dict[str, Any]) -> float:
        """Check if this agent can handle the task."""
        task_lower = task.lower()
        keywords = ["accessibility", "a11y", "colorblind", "contrast", "wcag", "inclusive"]

        matches = sum(1 for kw in keywords if kw in task_lower)
        base_score = matches / max(len(task_lower.split()), 1)

        if any(term in task_lower for term in ["accessibility", "colorblind", "wcag"]):
            base_score = min(base_score + 0.3, 1.0)

        return base_score


def create_specialized_agents() -> List[Agent]:
    """Create and register all specialized agents."""
    agents = [
        MobileUIAnalysisAgent(),
        TouchInteractionAgent(),
        AccessibilityAgent(),
    ]

    from .. import register_agent
    for agent in agents:
        register_agent(agent)

    return agents


__all__ = [
    "MobileUIAnalysisAgent",
    "TouchInteractionAgent",
    "AccessibilityAgent",
    "create_specialized_agents",
]
