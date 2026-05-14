import axios from 'axios';
import { SessionContext } from '../types.js';
import { config } from '../config.js';

function flattenGroqOutput(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(flattenGroqOutput).join('');
  }
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>)
      .map(flattenGroqOutput)
      .join('');
  }
  return '';
}

function sanitizeGroqText(text: string): string {
  let cleaned = text.replace(/\r/g, '').trim();

  const markerRegex = /(?:assistantoutput_text|output_text)\s*(?:[:=]\s*)?/gi;
  let lastIndex = -1;
  let match: RegExpExecArray | null;

  while ((match = markerRegex.exec(cleaned)) !== null) {
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex >= 0) {
    cleaned = cleaned.slice(lastIndex).trim();
  } else {
    const markerIndex = cleaned.toLowerCase().lastIndexOf('assistantoutput_text');
    if (markerIndex >= 0) {
      cleaned = cleaned.slice(markerIndex + 'assistantoutput_text'.length).trim();
    }
  }

  cleaned = cleaned.replace(/^(?:reasoningresp_[^\s]+completed|messagemsg_[^\s]+completed|assistantoutput_text|output_text|reasoning_text|reasoning|analysis|thought|response|message)[\s_:=-]*/i, '').trim();

  cleaned = cleaned.split(/(?:\n|$)(?=\s*(?:Reasoning|Analysis|Thought|reasoning_text|assistantoutput_text|output_text|messagemsg_|reasoningresp_))/i)[0].trim();

  return cleaned;
}

function parseGroqResponse(data: any): string {
  if (!data) {
    return '';
  }

  let responseText = '';

  if (typeof data.output_text === 'string' && data.output_text.trim()) {
    responseText = data.output_text.trim();
  } else if (Array.isArray(data.choices) && data.choices.length > 0) {
    responseText = flattenGroqOutput(data.choices[0]).trim();
  } else if (Array.isArray(data.output) && data.output.length > 0) {
    responseText = flattenGroqOutput(data.output).trim();
  } else {
    responseText = flattenGroqOutput(data).trim();
  }

  return sanitizeGroqText(responseText);
}

async function fetchAvailableGroqModels(): Promise<string[]> {
  const response = await axios.get('https://api.groq.com/openai/v1/models', {
    headers: {
      Authorization: `Bearer ${config.groq.apiKey}`,
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  });

  if (Array.isArray(response.data?.data)) {
    return response.data.data.map((model: any) => model.id).filter(Boolean);
  }

  return [];
}

export async function generateGroqReply(context: SessionContext): Promise<string> {
  if (!config.useGroq || !config.groq.apiKey) {
    throw new Error('Groq is not enabled. Set GROQ_API_KEY in .env to enable Groq replies.');
  }

  const history = context.session?.history
    .slice(-5)
    .map((entry) => `Customer: ${entry.message}\nAgent: ${entry.reply || ''}`)
    .join('\n') || '';

  const intent = context.intent?.intent ?? 'unknown_intent';
  const proposal = context.proposal;

  const promptLines = [
    `You are an intelligent WhatsApp assistant for an Indian MSME distributor named ${config.businessName}.`,
    'Keep replies short, polite, and friendly in a mix of Hindi and English (Hinglish).',
    `Customer message: "${context.message.text || '<audio or unknown>'}"`,
    `Detected intent: ${intent}`,
  ];

  if (history) {
    promptLines.push(`Conversation history:\n${history}`);
  }

  if (proposal) {
    promptLines.push(
      'You have a proposed order with the following details:',
      `- Product: ${proposal.items[0].sku}`,
      `- Quantity: ${proposal.items[0].quantity}`,
      `- Unit price: ₹${proposal.items[0].unitPrice}`,
      `- Discount: ${proposal.discountApplied}%`,
      `- Total: ₹${proposal.total}`,
      `- Status: ${proposal.safeToConfirm ? 'Ready to confirm' : 'Needs review'}`,
      proposal.notes.length ? `- Notes: ${proposal.notes.join(', ')}` : '',
      'If this is correct, ask the customer to type confirm to place the order.'
    );
  }

  if (intent === 'support_intent') {
    promptLines.push('If the customer is asking for support, ask them to describe the issue in one sentence.');
  }

  promptLines.push(
    'Write only the reply text for WhatsApp.',
    'Do not include any internal reasoning, analysis, thought process, hidden metadata, or debug markers.',
    'Do not output any tags such as reasoningresp_, messagemsg_, assistantoutput_text, or output_text.',
    'Respond only with the final customer-facing message.'
  );

  const prompt = promptLines.filter(Boolean).join('\n\n');

  const url = 'https://api.groq.com/openai/v1/responses';
  console.log('Groq endpoint:', url, 'model:', config.groq.model);
  console.log('Sending prompt to Groq:', prompt);

  try {
    const response = await axios.post(
      url,
      {
        model: config.groq.model,
        input: prompt,
        max_output_tokens: 200,
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${config.groq.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    console.log('Received Groq response status:', response.status);
    console.log('Received Groq response data:', JSON.stringify(response.data));

    return (
      response.data?.output_text ||
      parseGroqResponse(response.data) ||
      'I am sorry, I could not understand that. Can you please rephrase?'
    );
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const apiError = error.response?.data?.error;
      const message = apiError?.message || error.message;
      const code = apiError?.code;

      if (code === 'model_not_found') {
        const availableModels = await fetchAvailableGroqModels().catch(() => []);
        throw new Error(
          `Groq model not found: ${config.groq.model}. ${message}. ` +
            `Available models: ${availableModels.slice(0, 10).join(', ') || 'unable to fetch available models'}. ` +
            'Set GROQ_MODEL to a supported model like openai/gpt-oss-20b.'
        );
      }

      throw new Error(`Groq API error: ${message} (status ${error.response?.status})`);
    }

    throw error;
  }
}
