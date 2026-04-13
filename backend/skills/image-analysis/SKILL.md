---
name: image-analysis
description: Use this skill when analyzing an image for an English learning session. Defines the structured output format to write to /session/image_context.md.
---

# Image Analysis for English Learning Sessions

## Purpose

Analyze the image described to you and write a structured context file that the main teaching agent will use to plan vocabulary, grammar, and sentence construction activities for students grade 9 and below.

## Output Format

Use the `write_file` tool to save your analysis to `/session/image_context.md` using this exact structure:

```
## Scene
[2-3 sentences describing what is happening in the image: who, what, where, mood]

## Key Vocabulary
- [word]: [simple English definition] | [Vietnamese: bản dịch]
- [word]: [simple English definition] | [Vietnamese: bản dịch]
[5–8 words total — mix of nouns, verbs, and adjectives clearly visible or implied by the scene]

## Suggested Grammar Topics
- [grammar topic]: [one sentence explaining why it fits this image]
- [grammar topic]: [one sentence explaining why it fits this image]
```

## Vocabulary Selection Guidelines

Choose words that:
- Are clearly present or strongly implied in the image
- Are useful and relevant for everyday communication
- Cover a mix of word types: at least 2 nouns, 1 verb, 1 adjective
- Are at B1–B2 CEFR level (avoid very basic words like "cat" or "car" unless central to the image)

**Good vocabulary choices for a park scene:**
- "stroll": to walk slowly and relaxedly | Vietnamese: đi dạo
- "lush": (of plants) healthy and growing thickly | Vietnamese: xanh tươi
- "gather": to come together in a group | Vietnamese: tụ tập

## Grammar Topic Selection Guidelines

Choose 2 grammar topics that:
- Are naturally demonstrated by the image content
- Are appropriate for grade 9 and below (no subjunctive, complex passives, etc.)
- Allow the student to practice using the vocabulary selected above

**Suitable grammar topics (examples):**
- Present continuous (for actions happening in the image)
- There is / There are (for describing what exists in the scene)
- Adjective + noun order (for describing objects and people)
- Comparative / superlative (if the image has multiple items to compare)
- Past simple (if the image suggests a completed action)
- Can / could (for speculating about abilities shown)

## After Writing

Once you have written `/session/image_context.md`, return the message: `"Image analysis complete."`
