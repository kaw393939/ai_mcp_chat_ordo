export interface ConversationEventRepository {
  record(event: {
    conversationId: string;
    eventType: string;
    metadata: Record<string, unknown>;
  }): Promise<void>;
}

export class ConversationEventRecorder {
  constructor(private readonly repo: ConversationEventRepository) {}

  async record(
    conversationId: string,
    eventType: string,
    metadata: Record<string, unknown> = {},
  ): Promise<void> {
    await this.repo.record({ conversationId, eventType, metadata });
  }
}
