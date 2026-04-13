"""Heuristics for recovering when the model skips ask_user."""

from api.sessions import (
    _looks_like_english_tutor_followup,
    _looks_like_final_evaluation,
    _looks_like_mid_session_leak,
    _should_retry_missing_ask_user,
)


def test_looks_like_final_evaluation_stars():
    assert _looks_like_final_evaluation("⭐⭐⭐\n(3/5 sao)\n\n📝 **Từ vựng**\nEm làm tốt.")


def test_looks_like_final_evaluation_sections():
    text = "📝 **Từ vựng**\nHay.\n📖 **Ngữ pháp**\nỔn.\n✍️ **Đặt câu**\nTốt.\n⭐⭐"
    assert _looks_like_final_evaluation(text)


def test_looks_like_mid_session_leak_turn_marker():
    assert _looks_like_mid_session_leak("**Turn 1** | Phase: vocabulary\nQ: Hi?")


def test_should_retry_when_leak_and_not_eval():
    blob = "Good try!\n\n**Turn 1** | Phase: vocabulary\nQ: x\nA: y\n\nNext?"
    assert _should_retry_missing_ask_user(blob)


def test_should_not_retry_real_evaluation():
    blob = "⭐⭐⭐⭐\n(4/5 sao)\n\n📝 **Từ vựng**\nEm tiến bộ tốt."
    assert not _should_retry_missing_ask_user(blob)


def test_should_retry_empty_blob():
    assert _should_retry_missing_ask_user("")


def test_should_retry_long_plain_without_eval_markers():
    blob = "x" * 250
    assert _should_retry_missing_ask_user(blob)


def test_english_tutor_typo_and_would_you_like_triggers_retry_heuristic():
    blob = (
        "Good try! Just a small typo: 'pupup' should be 'puppy'. \n\n"
        'Here\'s the corrected sentence: "The puppy is running."\n\n'
        "Would you like to try another sentence?"
    )
    assert _looks_like_english_tutor_followup(blob)
    assert _should_retry_missing_ask_user(blob)


def test_english_tutor_followup_false_when_vietnamese_evaluation():
    blob = "Em làm tốt! Bạn có muốn thử thêm một câu không?"
    assert not _looks_like_english_tutor_followup(blob)
