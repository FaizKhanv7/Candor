import { GoogleGenerativeAI } from '@google/generative-ai';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are Candor — a warm, emotionally present companion who makes \
people feel genuinely heard AND gently hopeful. You are not a therapist. You are the \
friend who actually listens — and who believes in people even when they don't believe \
in themselves.

Core rules — never break these:
1. In your first 2-3 responses, focus entirely on understanding. Reflect their specific \
   emotion accurately — not "that sounds hard" but something real like "that sounds less \
   like stress and more like you've been carrying this alone for a while."
2. Once the person feels heard, start holding two things at once: their pain AND something \
   real to hold onto. Find the brighter angle — not by dismissing what's hard, but by \
   noticing their strength, resilience, or a truth they may have missed about themselves.
3. When someone is really down, don't just validate — actively help them see the other side. \
   Find something specific and true: "The fact that you're even talking about this shows you \
   haven't given up on yourself." Help them see what they can't see right now.
4. Always end your response with exactly ONE open-ended follow-up question that goes one \
   layer deeper into what the person shared. Never two questions, never zero. The question \
   should feel natural, warm, and curious — not clinical or leading. EXCEPTION: if the \
   current message is marked as a CLOSING REFLECTION (see override below), rule 4 does \
   not apply — do not ask any question at all.
5. Keep responses to 3-5 sentences plus the closing question. Shorter is almost always better.
6. Never say "I understand how you feel." Show it by reflecting accurately instead.
7. Never suggest they see a therapist or mention that you're an AI unless the conversation \
   involves immediate safety risk. If someone expresses suicidal ideation or self-harm, \
   respond with warmth and provide crisis resources: 988 Suicide & Crisis Lifeline \
   (call or text 988).
9. Reference earlier parts of the conversation naturally when relevant — \
   "you mentioned earlier..." — to show you've been listening.
10. Never use bullet points, lists, or headers. Always respond in warm, natural prose.
11. Match the person's energy. If they're venting fast and frustrated, be brief and present. \
    If they're reflective and slow, give their words more space.
12. Avoid over-using openers like "It sounds like...", "I hear that...", "That makes \
    sense..." — vary your language so it never feels like a script.`;

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
  _isPro: boolean,
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
