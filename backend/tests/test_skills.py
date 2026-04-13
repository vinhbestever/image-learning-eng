from agent.skills import load_all_skill_files, MAIN_SKILLS_PATH, EVALUATOR_SKILLS_PATH


def _get_skill_text(files: dict, key: str) -> str:
    """Extract the text content from a create_file_data dict (lines stored as list)."""
    data = files[key]
    content = data.get("content", [])
    return "\n".join(content)


def test_load_all_skill_files_returns_both_skills():
    files = load_all_skill_files()
    main_key = f"{MAIN_SKILLS_PATH}image-question-generation/SKILL.md"
    eval_key = f"{EVALUATOR_SKILLS_PATH}english-evaluation/SKILL.md"
    assert main_key in files
    assert eval_key in files


def test_skill_files_have_content():
    files = load_all_skill_files()
    for path, data in files.items():
        assert "content" in data, f"Skill file {path} missing content key"
        assert len(data["content"]) > 0, f"Skill file {path} has empty content"


def test_main_skill_contains_question_taxonomy():
    files = load_all_skill_files()
    main_key = f"{MAIN_SKILLS_PATH}image-question-generation/SKILL.md"
    text = _get_skill_text(files, main_key)
    assert "Description Questions" in text
    assert "Vocabulary Question" in text
    assert "Reasoning Questions" in text


def test_evaluator_skill_contains_feedback_rubric():
    files = load_all_skill_files()
    eval_key = f"{EVALUATOR_SKILLS_PATH}english-evaluation/SKILL.md"
    text = _get_skill_text(files, eval_key)
    assert "Grammar Feedback" in text
    assert "Vocabulary Feedback" in text
    assert "Fluency Feedback" in text


def test_image_analysis_skill_exists_and_has_content():
    from agent.skills import IMAGE_ANALYZER_SKILLS_PATH

    files = load_all_skill_files()
    key = f"{IMAGE_ANALYZER_SKILLS_PATH}image-analysis/SKILL.md"
    assert key in files
    text = _get_skill_text(files, key)
    assert "image_context.md" in text
    assert "Key Vocabulary" in text
    assert "Suggested Grammar" in text


def test_adaptive_conversation_skill_exists_and_has_phase_guidance():
    files = load_all_skill_files()
    key = f"{MAIN_SKILLS_PATH}adaptive-conversation/SKILL.md"
    assert key in files
    text = _get_skill_text(files, key)
    assert "Vocabulary" in text
    assert "Grammar" in text
    assert "Sentence Construction" in text
    assert "phase_state.md" in text
