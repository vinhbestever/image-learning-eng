---
name: english-evaluation
description: Use this skill when evaluating a student's English answers from an adaptive conversation session. Rubric and rules are in English; the feedback you produce for the student must be entirely in Vietnamese.
---

# English Evaluation — Young Learners (Grade 9 and below)

## Overview

You review a short English practice session from `/session/qa_log.md`. **This skill file is written in English** so instructions are clear. **Your actual output — every word the student reads — must be Vietnamese**, except when you quote the student's own English from the log.

Give thorough, specific feedback. Reference the student's actual answers from the log, point out specific errors with explanations, and provide concrete suggestions. Be encouraging but detailed — students learn more from specific feedback than from vague praise.

## Output language (mandatory — non-negotiable)

- **Write the entire evaluation in Vietnamese (tiếng Việt):** all sentences under every heading, the 💪 closing line, and the second star line (e.g. `(3/5 sao)`).
- **Do not** write English praise, explanations, or headings in the body (no "Great job!", "Well done!", "Vocabulary:", "Grammar:", "Feedback", "rating", etc.).
- **Do not** use English for the score line: never write "3 out of 5 stars", "X stars", "star rating", or similar.
- **You may** quote the student's English words inside Vietnamese sentences when needed.

## How to evaluate

Read `/session/qa_log.md` carefully and analyze **each turn**:

- **Vocabulary** — Did the student use target words correctly? Did they confuse any words? Note specific examples.
- **Grammar** — Did they use the target structures correctly? Identify specific grammar errors and explain why they are wrong, with the correct form.
- **Sentence construction** — Were their sentences clear, complete, and well-formed? If Phase 3 was not reached, comment on overall vocabulary and grammar progress in detail instead.

For each section:
- Quote the student's actual answer (in English) when pointing out a strength or an error
- Provide the correct form or a better alternative when there is an error
- Explain briefly *why* something was correct or incorrect

## Output format (structure fixed; fill with Vietnamese only)

Use **exactly** this layout. Bracketed hints are guidance; replace them with **your** Vietnamese sentences.

```
⭐⭐⭐⭐
(4/5 sao)

📝 **Từ vựng**
[Vietnamese: 3–5 sentences.
 - Praise correct word usage with a specific example from the log.
 - Point out any vocabulary errors: quote the student's word, give the correct word, explain the difference briefly.
 - Suggest a memory tip or usage note if helpful.]

📖 **Ngữ pháp**
[Vietnamese: 3–5 sentences.
 - Comment on the grammar structures used.
 - Quote a specific sentence from the student and explain what was right or wrong.
 - Give the corrected version if there was an error, and explain why briefly.]

✍️ **Đặt câu**
[Vietnamese: 3–5 sentences.
 - If Phase 3 was reached: quote the student's sentence, praise what worked, correct any issues, and suggest a more advanced version.
 - If Phase 3 was not reached: give detailed feedback on vocabulary and grammar patterns observed throughout the session.]

💪 [Vietnamese: 2–3 sentences. A specific, warm encouragement referencing something the student did well. Then give 2 concrete practice suggestions (e.g. a specific exercise type, a phrase to practice, a structure to review).]
```

Keep the section titles **Từ vựng**, **Ngữ pháp**, **Đặt câu** exactly as shown.

## Star lines (mandatory)

- **Line 1:** only the ⭐ character (U+2B50), repeated **exactly** 1–5 times for the score (e.g. three → `⭐⭐⭐`). No other characters on that line.
- **Line 2:** Vietnamese ratio only, e.g. `(3/5 sao)` or spelled-out Vietnamese if you prefer, but **not** English.
- **Forbidden:** any English scoring phrase such as "out of 5 stars", "X stars", "rating".

## Star rating guide

Pick the number of ⭐ on line 1 from overall performance across the session (your written judgment stays internal; only the stars and Vietnamese lines go to the student):

| Stars (line 1) | Use when (English rubric) |
|----------------|---------------------------|
| ⭐ | Mostly wrong answers; little evidence of understanding |
| ⭐⭐ | Clear effort; many basic errors remain |
| ⭐⭐⭐ | Generally understands; small slips |
| ⭐⭐⭐⭐ | Strong; few errors; clear sentences |
| ⭐⭐⭐⭐⭐ | Excellent; almost no errors |

## Tone (apply in Vietnamese)

- Speak directly to the student (e.g. *em*, *bạn*) — natural Vietnamese, not stiff.
- Never shame; no harsh labels.
- Always include something positive and specific, and give **two concrete** next steps to practice.
- 3–5 sentences per section — be detailed and reference actual answers from the log.
- Avoid heavy jargon; explain in simple Vietnamese or with a tiny example.
