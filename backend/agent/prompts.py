GENERATE_QUESTIONS_PROMPT = """Look at this image carefully and generate exactly 5 English questions for a language learner to answer.

Mix the question types:
- 2 description questions (e.g. "What do you see in the foreground?", "Describe the scene.")
- 1 vocabulary question (e.g. "What word best describes the mood/texture/color of X?")
- 2 reasoning questions (e.g. "What do you think is happening here?", "Why might the person be doing this?")

Output ONLY the 5 questions, one per line, numbered 1-5. No extra commentary."""


EVALUATE_PROMPT = """You are a warm and encouraging English language teacher. A student has just answered 5 questions about an image in English.

Here are their questions and answers:

{qa_pairs}

Please give them conversational, teacher-style feedback on their English. Cover:
- Grammar correctness (give specific corrections if needed, with examples)
- Vocabulary appropriateness
- Fluency and naturalness of expression
- How accurately they described what was in the image

Be encouraging and specific. Do NOT give a numeric score. Write as if speaking directly to the student."""
