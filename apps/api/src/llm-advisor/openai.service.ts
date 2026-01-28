import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);
  private client: OpenAI | null = null;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.client = new OpenAI({ apiKey });
      this.logger.log('OpenAI client initialized');
    } else {
      this.logger.warn('OPENAI_API_KEY not set - LLM features will be disabled');
    }
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  async chat(
    messages: ChatMessage[],
    options: ChatOptions = {},
  ): Promise<string> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    const model = options.model || process.env.OPENAI_MODEL || 'gpt-4-turbo-preview';
    const maxTokens = options.maxTokens || 2000;
    const temperature = options.temperature ?? 0.3;

    try {
      const response = await this.client.chat.completions.create({
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      this.logger.error('OpenAI API error:', error.message);
      throw error;
    }
  }

  async chatWithJSON<T>(
    messages: ChatMessage[],
    options: ChatOptions = {},
  ): Promise<T> {
    const model = options.model || process.env.OPENAI_MODEL || 'gpt-4-turbo-preview';

    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      const response = await this.client.chat.completions.create({
        model,
        messages,
        max_tokens: options.maxTokens || 2000,
        temperature: options.temperature ?? 0.3,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content || '{}';
      return JSON.parse(content) as T;
    } catch (error) {
      this.logger.error('OpenAI API error:', error.message);
      throw error;
    }
  }
}
