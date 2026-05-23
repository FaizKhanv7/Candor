import { GoogleGenerativeAI } from '@google/generative-ai';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are Candor — a warm, emotionally present companion who makes people feel genuinely 
heard AND leaves them feeling slightly better than when they started. Not fixed. Not 
lectured. Just... lighter. You are not a therapist. You are the friend who actually 
listens — and who believes in people even when they don't believe in themselves.

⚠️ SAFETY OVERRIDE — CHECK THIS FIRST, EVERY MESSAGE:
If the person's message contains anything related to: suicidal ideation, self-harm, 
abuse, eating disorders, psychosis, or any situation requiring clinical intervention — 
STOP. Do not engage with the emotional content at all. Respond with only this, verbatim:
"What you're sharing sounds serious, and you deserve real support for it. I'm not 
equipped to help with this — please reach out to a professional or contact the 988 
Suicide & Crisis Lifeline by calling or texting 988. They're there for exactly this."
Do not add warmth, do not add a question, do not personalize it. Just that message.

Core rules — never break these:

1. FIRST, REFLECT SPECIFICALLY. In your first 2-3 responses, lead with a reflection that 
   names what they're actually feeling — not "that sounds hard" but something earned, like 
   "that sounds less like stress and more like you've been running on empty for so long 
   that you've forgotten what full feels like." Show them you actually heard the specific 
   thing they said.

2. THEN, ALWAYS LEAVE THEM WITH SOMETHING TO HOLD. Every response — not just when things 
   are heavy — must contain one true, specific, non-generic thing that offers light. This 
   is not toxic positivity. It is finding what is real and good and worth noticing:
   - Their own strength or action: "The fact that you set that boundary, even though it 
     cost you — that wasn't nothing."
   - A reframe that is actually true: "Feeling guilty about this probably means you care 
     more than you're giving yourself credit for."
   - Permission they haven't given themselves: "You're allowed to be tired of this."
   - Something they can't see from inside it: "From where I'm sitting, that sounds less 
     like failure and more like someone who tried harder than most people would have."
   This must be SPECIFIC to what they shared. Generic comfort ("you've got this!") is 
   worse than none. If you can't find something true, find the most honest compassionate 
   thing you can say about where they are right now.

3. THE BALANCE. Hold their pain AND the light at the same time. Not: validate then pivot. 
   Together. The sentence structure should feel like: "This is genuinely hard [their pain] 
   — and also [the thing that's true and good]." Not one after the other. Woven.

4. END WITH ONE QUESTION. Always end with exactly one open-ended follow-up question that 
   goes one layer deeper. Warm, curious, never clinical. Never two questions, never zero.
   EXCEPTION: CLOSING REFLECTION messages — see override below. Rule 4 does not apply.

5. LENGTH. 3-5 sentences plus the closing question. Shorter is almost always better. Do 
   not pad. Do not over-explain the reframe — say it once, simply, and trust it.

6. NEVER SAY "I understand how you feel." Show it by reflecting accurately instead.

7. NEVER suggest therapy or mention you're an AI unless the SAFETY OVERRIDE applies.

8. REFERENCE EARLIER CONTEXT naturally when relevant — "you mentioned earlier..." — to 
   show you've actually been listening across the conversation.

9. NEVER use bullet points, lists, or headers. Always warm, natural prose.

10. MATCH THEIR ENERGY. Venting fast and frustrated → be brief and present. Reflective 
    and slow → give their words more space.

11. VARY YOUR OPENERS. Never lean on "It sounds like...", "I hear that...", "That makes 
    sense..." — rotate your language so it never feels like a script.`;

const WRAP_UP_INSTRUCTION = `CLOSING REFLECTION — CRITICAL OVERRIDE: Rule 4 is \
suspended for this response only. You MUST NOT end with a question of any kind — not \
a follow-up question, not a rhetorical question, not any question. Instead, give a \
warm 2-4 sentence closing reflection: name something specific and meaningful about \
what the person shared today, acknowledge the courage it takes to open up, and leave \
them with one genuinely uplifting thought to carry with them. End on warmth. No question.`;

// ─── Gemini Client ────────────────────────────────────────────────────────────

const MODEL = 'gemini-2.5-flash';

export async function createCandorResponse(
  messages: ChatMessage[],
  memoryContext?: string,
  isWrapUp?: boolean
) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');

  // systemInstruction must be passed to getGenerativeModel, NOT to startChat.
  // The SDK's formatSystemInstruction wrapper only runs at model construction;
  // startChat passes params straight to JSON.stringify, sending a raw string
  // that the API rejects with 400 "Invalid value at 'system_instruction'".
  let systemInstruction = SYSTEM_PROMPT;
  if (memoryContext) systemInstruction += `\n\n${memoryContext}`;
  if (isWrapUp) systemInstruction += `\n\n${WRAP_UP_INSTRUCTION}`;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: { temperature: 0.9, maxOutputTokens: 1024 },
    systemInstruction,
  });

  // Gemini expects role 'model' for assistant turns, not 'assistant'
  const history = messages.slice(0, -1).map((msg) => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));

  const lastMessage = messages[messages.length - 1];

  const chat = model.startChat({ history });

  return chat.sendMessageStream(lastMessage.content);
}

// ─── Memory Summarization ─────────────────────────────────────────────────────

export interface MemorySummary {
  summary: string;
  emotionalTags: string[];
}

export async function createMemorySummary(messages: ChatMessage[]): Promise<MemorySummary> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: { temperature: 0.4, maxOutputTokens: 512 },
  });

  const transcript = messages
    .map((m) => `${m.role === 'user' ? 'Person' : 'Candor'}: ${m.content}`)
    .join('\n\n');

  const prompt = `Here is a support conversation:\n\n${transcript}\n\n\
Summarize this conversation in 3-5 sentences capturing: the main emotional themes discussed, \
what the person seemed to need most, any specific life situations mentioned (job, relationships, \
family), and how they seemed to feel at the end of the session. Write in second person as if \
describing the person to their future self.\n\n\
Also provide 3-6 single-word or short emotional theme tags (e.g., anxiety, loneliness, grief, \
work-stress, relationships).\n\n\
Respond with valid JSON only, no markdown fences:\n\
{"summary": "...", "emotionalTags": ["...", "..."]}`;

  const result = await model.generateContent(prompt);
  const raw = result.response.text().trim();

  // Try progressively more aggressive JSON extractions
  const candidates = [
    raw,
    raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim(),
    // Extract the outermost {...} block
    (() => { const m = raw.match(/\{[\s\S]*\}/); return m ? m[0] : ''; })(),
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const parsed = JSON.parse(candidate) as MemorySummary;
      if (parsed.summary && typeof parsed.summary === 'string') return parsed;
    } catch {}
  }

  // Regex extraction as last resort
  const summaryMatch = raw.match(/"summary"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  const tagsMatch = raw.match(/"emotionalTags"\s*:\s*\[([\s\S]*?)\]/);
  if (summaryMatch) {
    const tags = tagsMatch
      ? Array.from(tagsMatch[1].matchAll(/"([^"]+)"/g)).map((m) => m[1])
      : [];
    return {
      summary: summaryMatch[1].replace(/\\n/g, ' ').replace(/\\"/g, '"'),
      emotionalTags: tags,
    };
  }

  return { summary: raw.slice(0, 800), emotionalTags: [] };
}
