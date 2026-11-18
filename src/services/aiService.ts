export type AIAction = 'summarize' | 'actionItems' | 'polish' | 'expand';

export async function processNoteWithAI(text: string, action: AIAction): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';

  if (!navigator.onLine) {
    throw new Error('AI Copilot requires an active internet connection.');
  }

  if (!apiKey) {
    throw new Error('Missing Gemini API Key in .env.local file.');
  }

  const prompts: Record<AIAction, string> = {
    summarize: 'Generate a structured 2-3 sentence executive summary of the following notes with key takeaways highlighted:\n\n',
    actionItems: 'Extract all tasks and action items from this text into a clean Markdown checklist format (`- [ ] task`):\n\n',
    polish: 'Refine and polish the tone, grammar, and technical vocabulary of this text while preserving exact meaning:\n\n',
    expand: 'Expand on the technical concepts described in this document, detailing edge cases, architectural patterns, and next steps:\n\n',
  };

  const promptText = `${prompts[action]}${text}`;

  // Try the top candidate models directly
  const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-3.8-flash'];
  let errorLog = '';

  for (const model of models) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }]
        })
      });

      const data = await res.json();
      if (res.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        return data.candidates[0].content.parts[0].text;
      }
      errorLog = data.error?.message || res.statusText;
    } catch (e: any) {
      errorLog = e.message;
    }
  }

  throw new Error(`AI Request failed: ${errorLog}`);
}