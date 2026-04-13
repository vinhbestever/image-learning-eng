import os
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage
from .state import SessionState
from .prompts import GENERATE_QUESTIONS_PROMPT, EVALUATE_PROMPT

llm = ChatOpenAI(model="gpt-4o", temperature=0.7)

_FALLBACK_QUESTION = "Can you describe something else you notice in this image?"


def analyze_image(state: SessionState) -> dict:
    """Call GPT-4o vision to generate 5 mixed English questions from the image."""
    message = HumanMessage(content=[
        {
            "type": "image_url",
            "image_url": {"url": f"data:image/jpeg;base64,{state['image_b64']}"},
        },
        {"type": "text", "text": GENERATE_QUESTIONS_PROMPT},
    ])
    response = llm.invoke([message])
    raw_lines = [line.strip() for line in response.content.strip().split("\n") if line.strip()]
    questions = []
    for line in raw_lines[:5]:
        if len(line) > 2 and line[0].isdigit() and line[1] in ".):":
            line = line[2:].strip()
        questions.append(line)
    while len(questions) < 5:
        questions.append(_FALLBACK_QUESTION)
    return {"questions": questions, "current_step": 0, "answers": []}


def evaluate(state: SessionState) -> dict:
    """Call GPT-4o to generate conversational teacher-style feedback on all 5 answers."""
    qa_pairs = "\n".join(
        f"Q{i + 1}: {q}\nA{i + 1}: {a}"
        for i, (q, a) in enumerate(zip(state["questions"], state["answers"]))
    )
    message = HumanMessage(content=[
        {
            "type": "image_url",
            "image_url": {"url": f"data:image/jpeg;base64,{state['image_b64']}"},
        },
        {"type": "text", "text": EVALUATE_PROMPT.format(qa_pairs=qa_pairs)},
    ])
    response = llm.invoke([message])
    return {"evaluation": response.content}
