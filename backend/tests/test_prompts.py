from agent.prompts import EVALUATOR_PROMPT, IMAGE_ANALYZER_PROMPT, SYSTEM_PROMPT


def test_system_prompt_three_phases_and_subagents():
    s = SYSTEM_PROMPT.lower()
    assert "vocabulary" in s
    assert "grammar" in s
    assert "sentence" in s
    assert "image_analyzer" in SYSTEM_PROMPT
    assert "qa_log.md" in SYSTEM_PROMPT
    assert "phase_state.md" in SYSTEM_PROMPT


def test_system_prompt_no_fixed_five_questions():
    assert "5 questions" not in SYSTEM_PROMPT
    assert "exactly 5" not in SYSTEM_PROMPT


def test_evaluator_prompt_star_and_log():
    assert "sao" in EVALUATOR_PROMPT
    assert "qa_log.md" in EVALUATOR_PROMPT


def test_image_analyzer_prompt_writes_context_file():
    assert "image_context.md" in IMAGE_ANALYZER_PROMPT
    assert "write_file" in IMAGE_ANALYZER_PROMPT
