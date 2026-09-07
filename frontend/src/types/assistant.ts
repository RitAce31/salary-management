export interface AssistantRequest {
  question: string;
  reporting_currency?: string;
}

export interface AssistantResponse {
  answer: string;
  operation: string;
  data: Record<string, unknown>;
  metadata: Record<string, unknown>;
}
