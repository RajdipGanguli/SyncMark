export type AIAction = 'summarize' | 'actionItems' | 'polish' | 'expand';

const PROMPT_MAP: Record<AIAction, string> = {
  summarize: 'Generate a structured 2-3 sentence executive summary of the following notes with key takeaways highlighted:\n\n',
  actionItems: 'Extract all tasks and action items from this text into a clean Markdown checklist format (`- [ ] task`):\n\n',
  polish: 'Refine and polish the tone, grammar, and technical vocabulary of this text while preserving exact meaning:\n\n',
  expand: 'Expand on the technical concepts described in this document, detailing edge cases, architectural patterns, and next steps:\n\n'
};

const VALID_ACTIONS: Set<string> = new Set(['summarize', 'actionItems', 'polish', 'expand']);

interface VercelReq {
  method?: string;
  body?: any;
}

interface VercelRes {
  status: (code: number) => VercelRes;
  json: (data: any) => void;
  setHeader: (name: string, value: string) => VercelRes;
}

export default async function handler(req: VercelReq, res: VercelRes) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed. Only POST is accepted.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON payload.' });
    }
  }

  const { text, action } = (body as { text?: unknown; action?: unknown }) || {};

  if (!action || typeof action !== 'string' || !VALID_ACTIONS.has(action)) {
    return res.status(400).json({ error: 'Invalid or missing action. Must be one of: summarize, actionItems, polish, expand.' });
  }

  if (typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Text must be a non-empty string.' });
  }

  if (text.length > 20000) {
    return res.status(400).json({ error: 'Text must be under 20,000 characters.' });
  }

  const promptPrefix = PROMPT_MAP[action as AIAction];
  const fullPrompt = `${promptPrefix}${text}`;

  try {
    const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: fullPrompt }]
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = data?.error?.message || `Gemini API returned status ${response.status}`;
      return res.status(response.status >= 400 && response.status < 600 ? response.status : 502).json({
        error: errorMessage
      });
    }

    const outputText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!outputText) {
      return res.status(502).json({ error: 'No content received from Gemini model.' });
    }

    return res.status(200).json({ text: outputText });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Internal server error while contacting Gemini API.' });
  }
}
