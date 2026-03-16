import { getDb } from "../db";
import { ConversationDataMapper } from "../../adapters/ConversationDataMapper";
import { MessageDataMapper } from "../../adapters/MessageDataMapper";
import { ConversationEventDataMapper } from "../../adapters/ConversationEventDataMapper";
import { ConversationInteractor } from "../../core/use-cases/ConversationInteractor";
import { ConversationEventRecorder } from "../../core/use-cases/ConversationEventRecorder";
import { SummarizationInteractor } from "../../core/use-cases/SummarizationInteractor";
import { AnthropicSummarizer } from "../../adapters/AnthropicSummarizer";
import { getAnthropicApiKey } from "../config/env";

export function getConversationInteractor(): ConversationInteractor {
  const db = getDb();
  const conversationRepo = new ConversationDataMapper(db);
  const messageRepo = new MessageDataMapper(db);
  const eventRepo = new ConversationEventDataMapper(db);
  const eventRecorder = new ConversationEventRecorder(eventRepo);
  return new ConversationInteractor(conversationRepo, messageRepo, eventRecorder);
}

export function getSummarizationInteractor(): SummarizationInteractor {
  const db = getDb();
  const messageRepo = new MessageDataMapper(db);
  const eventRepo = new ConversationEventDataMapper(db);
  const eventRecorder = new ConversationEventRecorder(eventRepo);
  const summarizer = new AnthropicSummarizer(getAnthropicApiKey());
  return new SummarizationInteractor(messageRepo, summarizer, eventRecorder);
}
