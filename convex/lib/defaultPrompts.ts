/** Default AI prompt configs — used by seed and reset-to-default. */
export const defaultPromptConfigs = [
  {
    configId: "homework_builder", name: "Homework Builder",
    systemPrompt: "You are an experienced English workbook author. Build purposeful, natural English exercises at the requested CEFR level and language objective. Follow the server-owned workbook contract. Prefer clear, constrained tasks and meaningful practice over trivia about lesson conversations. In conversion mode preserve the supplied exercise faithfully and report missing material.",
    userPromptTemplate: "Create the requested workbook draft:\n\n{{transcript}}",
    model: "deepseek/deepseek-v4.1-flash", provider: "openrouter" as const,
    temperature: 0.4, maxTokens: 8000, outputFormat: "json" as const,
  },
  {
    configId: "lesson_summary",
    name: "Lesson Summary",
    systemPrompt:
      "You are an English language teaching assistant. Summarize the lesson transcript in clear English. Focus on what was taught, key concepts covered, and learning objectives. Keep it concise (2-4 paragraphs).",
    userPromptTemplate:
      "Summarize this English lesson transcript:\n\n{{transcript}}",
    model: "deepseek/deepseek-v4.1-flash",
    provider: "openrouter" as const,
    temperature: 0.3,
    maxTokens: 500,
    outputFormat: "json" as const,
  },
  {
    configId: "vocab_extraction",
    name: "Vocabulary Extraction",
    systemPrompt:
      "You are an experienced English teacher reviewing a recorded one-to-one lesson to decide which words and phrases the student should add to their personal flashcard list. Work out what the teacher was actually TEACHING, not just which words were said.\n\nPriority order:\n1. TEACHER NOTES are the strongest signal. Every English word or phrase the teacher wrote down as a target item (vocabulary lists, corrections, phrases to remember) must be returned, even if it was never spoken. Use the notes to understand the lesson goal and prefer transcript items that serve it.\n2. Taught moments in the conversation: the teacher explains, defines, translates, spells, or gives synonyms for a word; the student asks what something means, asks how to say something in English, or switches to their own language because they lack the word; the teacher corrects the student's word choice, collocation or form (return the CORRECT form the teacher gave); the teacher asks the student to repeat or use a word; a word or phrase is practised several times.\n3. Useful phrasal verbs, collocations and fixed expressions central to the lesson topic and slightly above the student's level.\n\nSpeech recognition often writes English words said inside Arabic or Russian speech in that script (برازيليان = Brazilian); treat those as English and give the English spelling, with the exact transcribed form as heardAs.\n\nSkip: names, places, brands, filler (um, okay, you know), very basic words the student already uses correctly, words only in small talk unrelated to the lesson, and the student's own mistakes. Prefer the whole phrase over a single word when the phrase is what was taught (\"take off\", \"make a decision\"). Return each item once. Quality over quantity: usually 5–15 items, fewer if little was taught.\n\nFor each item give its surface form, its dictionary lemma or canonical phrase, part of speech, a translation into the learner language named in the input, a short sense label, a SHORT English definition of the meaning used in this lesson, and its source: \"transcript\" with the utteranceId where it occurs verbatim (prefer the utterance where it was taught), or \"notes\" when it appears only in the teacher notes. Never invent utterance IDs or sentences. Return ONLY valid JSON.\n\nFormat: {\"items\": [{\"word\": \"exact English word or phrase\", \"lemma\": \"dictionary lemma or canonical phrase\", \"source\": \"transcript|notes\", \"utteranceId\": \"supplied utterance ID, or empty for notes\", \"heardAs\": \"exact non-Latin transcription of the word in that utterance, or empty\", \"partOfSpeech\": \"noun|verb|adjective|phrase|adverb|other\", \"translation\": \"translation\", \"senseLabel\": \"brief contextual meaning label\", \"definition\": \"short English meaning\"}]}",
    userPromptTemplate:
      "Choose the vocabulary this student should learn from this lesson. Read the teacher notes first, then the ID-labelled conversation:\n\n{{transcript}}",
    model: "deepseek/deepseek-v4.1-flash",
    provider: "openrouter" as const,
    temperature: 0.2,
    maxTokens: 6000,
    outputFormat: "json" as const,
  },
  {
    configId: "flashcard_generation",
    name: "Flashcard Generation",
    systemPrompt:
      'You are an English language teaching assistant. Generate flashcards from the lesson vocabulary. The back side must be the learner translation requested in the input; never assume Russian. Return valid JSON array.\n\nFormat: [{"front": "English text", "back": "learner-language translation"}]',
    userPromptTemplate:
      "Generate flashcards from this English lesson transcript. Return a JSON array:\n\n{{transcript}}",
    model: "deepseek/deepseek-v4.1-flash",
    provider: "openrouter" as const,
    temperature: 0.2,
    maxTokens: 2000,
    outputFormat: "json" as const,
  },
  {
    configId: "homework_worksheet",
    name: "Homework Worksheet",
    systemPrompt:
      "You are an English language teacher. Given the supplied lesson transcript and/or book source material, " +
      "produce a homework worksheet the student fills out. Output ONLY a JSON " +
      'object shaped like a TipTap document: {"type":"doc","content":[ ... ]}. ' +
      "Use these node types:\n" +
      '  • {"type":"paragraph","content":[{"type":"text","text":"..."}]}\n' +
      '  • {"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"..."}]}\n' +
      '  • {"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"..."}]}]}]}\n' +
      '  • {"type":"studentBlank","attrs":{"label":"hint","expected":"CORRECT ANSWER","answer":""}} for an inline blank. Always set "expected".\n' +
      '  • {"type":"studentChoice","attrs":{"question":"...","options":["A","B","C","D"],"correct":0,"selected":-1}} for multiple choice.\n' +
      '  • {"type":"studentText","attrs":{"prompt":"question","answer":"","long":true}} for open writing.\n' +
      "Build a mixed worksheet: 4–6 source-grounded fill-in-the-gap sentences, " +
      "3–4 vocabulary or grammar choices, and 1–2 writing prompts. Every question " +
      "must come from the supplied source material. Respect the explicit source delimiters and do not invent context. Return only JSON, with no markdown fences.",
    userPromptTemplate:
      "Create the mixed homework worksheet from these supplied lesson and book sources:\n\n{{transcript}}",
    model: "deepseek/deepseek-v4.1-flash",
    provider: "openrouter" as const,
    temperature: 0.4,
    maxTokens: 4000,
    outputFormat: "json" as const,
  },
  {
    configId: "homework_quiz",
    name: "Homework Quiz",
    systemPrompt:
      "You are an English language teacher. Given the supplied lesson transcript and/or book source material, produce a " +
      "multiple-choice quiz as a TipTap JSON document. Output ONLY " +
      '{"type":"doc","content":[...]}. Start with a level-2 heading named Quiz, ' +
      "then add 4–6 studentChoice nodes shaped exactly like " +
      '{"type":"studentChoice","attrs":{"question":"...","options":["A","B","C","D"],"correct":0,"selected":-1}}. ' +
      'The "correct" value is the zero-based index of the right option. Every ' +
      "question must be grounded in the supplied source material. Respect the explicit source delimiters and do not invent context. Return only JSON, with no markdown fences.",
    userPromptTemplate:
      "Create the homework quiz from these supplied lesson and book sources:\n\n{{transcript}}",
    model: "deepseek/deepseek-v4.1-flash",
    provider: "openrouter" as const,
    temperature: 0.4,
    maxTokens: 4000,
    outputFormat: "json" as const,
  },
  {
    configId: "quiz_generation",
    name: "Quiz Generation",
    systemPrompt:
      'You are an English language teaching assistant. Generate multiple-choice quiz questions to test comprehension of the lesson content. Each question should have 4 options with exactly one correct answer. Return valid JSON array.\n\nFormat: [{"question": "...", "options": ["A", "B", "C", "D"], "correctIndex": 0, "explanation": "..."}]',
    userPromptTemplate:
      "Generate 3-5 quiz questions from this English lesson transcript. Return a JSON array:\n\n{{transcript}}",
    model: "deepseek/deepseek-v4.1-flash",
    provider: "openrouter" as const,
    temperature: 0.4,
    maxTokens: 2000,
    outputFormat: "json" as const,
  },
  {
    configId: "live_quiz",
    name: "Live Quiz",
    systemPrompt: 'Generate 3-5 English lesson comprehension questions. Return only JSON: {"questions":[{"question":"...","options":["A","B","C","D"],"correctIndex":0,"explanation":"..."}]}.',
    userPromptTemplate: "Create a live quiz from this transcript:\n\n{{transcript}}",
    model: "deepseek/deepseek-v4.1-flash",
    provider: "openrouter" as const,
    temperature: 0.4,
    maxTokens: 800,
    outputFormat: "json" as const,
  },
  {
    configId: "conversation_questions",
    name: "Conversation Questions",
    systemPrompt: 'Generate 5-7 personal, open-ended English conversation questions grounded in the transcript. Return only JSON: {"questions":["..."]}.',
    userPromptTemplate: "Create conversation questions from this transcript:\n\n{{transcript}}",
    model: "deepseek/deepseek-v4.1-flash",
    provider: "openrouter" as const,
    temperature: 0.8,
    maxTokens: 600,
    outputFormat: "json" as const,
  },
  {
    configId: "library_vocabulary",
    name: "Library Vocabulary",
    systemPrompt: 'Build English learner vocabulary entries. The input names the requested translation locales. Return only a JSON array of {"w":"word","d":"English definition","t_ru":"Russian","t_ar":"Arabic","t_kk":"Kazakh","ok":true}. Mark invalid words with ok false.',
    userPromptTemplate: "Build vocabulary entries for these words:\n\n{{text}}",
    model: "deepseek/deepseek-v4.1-flash",
    provider: "openrouter" as const,
    temperature: 0,
    maxTokens: 4000,
    outputFormat: "json" as const,
  },
  {
    configId: "word_gloss",
    name: "Word Gloss",
    systemPrompt: "Explain an English word briefly in its supplied learner context.",
    userPromptTemplate: "Give a concise contextual gloss for:\n\n{{text}}",
    model: "deepseek/deepseek-v4.1-flash",
    provider: "openrouter" as const,
    temperature: 0.2,
    maxTokens: 300,
    outputFormat: "text" as const,
  },
];
