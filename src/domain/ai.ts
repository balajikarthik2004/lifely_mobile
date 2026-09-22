/**
 * The assistant, as the screens see it (spec section 25 / section 46).
 *
 * Screens talk to `aiService`, never to a provider. The analysis itself now
 * happens on the server, which reads the record straight from the database —
 * so the client no longer has to assemble a context object, and the assistant
 * cannot be shown a stale or partial view of a day.
 *
 * Guardrails (spec section 47): every statement it makes is derived from
 * recorded data. Where data is missing it says so instead of inventing it.
 */
import { ai, type AIReply } from '@/api';

export type { AIReply };

export interface AIService {
  summarizeDay(): Promise<AIReply>;
  analyzeProductivity(): Promise<AIReply>;
  planTomorrow(): Promise<AIReply>;
  analyzeHabits(): Promise<AIReply>;
  analyzeGoals(): Promise<AIReply>;
  chat(message: string): Promise<AIReply>;
}

export const AI_QUICK_ACTIONS = [
  'Summarize my day',
  'Where did I lose time?',
  'Plan tomorrow for me',
  'How are my habits doing?',
  'Am I moving toward my goals?',
] as const;

export const AI_THINKING_LINES = [
  'Reading today’s timeline…',
  'Checking your habits…',
  'Finding patterns…',
  'Comparing with your week…',
];

export const aiService: AIService = {
  summarizeDay: () => ai.summarizeDay(),
  analyzeProductivity: () => ai.analyzeProductivity(),
  planTomorrow: () => ai.planTomorrow(),
  analyzeHabits: () => ai.analyzeHabits(),
  analyzeGoals: () => ai.analyzeGoals(),
  chat: (message) => ai.chat(message),
};
