export type AIAction = 'summarize' | 'actionItems' | 'polish' | 'expand';

export async function processNoteWithAI(text: string, action: AIAction): Promise<string> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('AI Copilot requires an active internet connection.');
  }

  if (!text || !text.trim()) {
    throw new Error('Cannot process empty content with AI.');
  }

  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text,
      action
    })
  });

  let data: { text?: string; error?: string } = {};
  try {
    data = await response.json();
  } catch {
    throw new Error(`Server returned status ${response.status} with non-JSON response.`);
  }

  if (!response.ok) {
    throw new Error(data.error || `AI proxy request failed with status ${response.status}`);
  }

  if (!data.text) {
    throw new Error('No generated text received from AI proxy.');
  }

  return data.text;
}
