"""Load skill files from disk and prepare them for the StateBackend virtual filesystem."""

import os
from pathlib import Path
from deepagents.backends.utils import create_file_data

_SKILLS_DIR = Path(__file__).resolve().parent.parent / "skills"

MAIN_SKILLS_PATH = "/skills/main/"
EVALUATOR_SKILLS_PATH = "/skills/evaluator/"


def _load_skill(skill_dir: str, virtual_prefix: str) -> dict[str, dict]:
    """Load a skill directory's SKILL.md into a files dict for StateBackend."""
    skill_path = _SKILLS_DIR / skill_dir / "SKILL.md"
    if not skill_path.exists():
        raise FileNotFoundError(f"Skill not found: {skill_path}")
    content = skill_path.read_text()
    virtual_path = f"{virtual_prefix}{skill_dir}/SKILL.md"
    return {virtual_path: create_file_data(content)}


def load_all_skill_files() -> dict[str, dict]:
    """Load all skill files and return a combined files dict for invoke()."""
    files = {}
    files.update(_load_skill("image-question-generation", MAIN_SKILLS_PATH))
    files.update(_load_skill("english-evaluation", EVALUATOR_SKILLS_PATH))
    return files
