/* eslint-disable */
// @ts-nocheck
import { Fragment } from "react";

import { EmptyState } from "@/components/EmptyState";
import { MessageBubble } from "@/components/MessageBubble";
import { useMode } from "@/lib/mode-context";

type EvidenceItem = {
  evidence_id: string;
  title: string;
  summary: string;
  kind: string;
  metadata?: Record<string, any>;
};

type AssistantHistoryEntry = {
  answer_id: string;
  user_text: string;
  assistant_payload: {
    summary: string;
    causes: string[];
    actions: string[];
    evidence_refs: string[];
  };
  retrieved_evidence?: EvidenceItem[];
  created_at?: string;
  provider?: string;
};

type ChatTranscriptProps = {
  history: AssistantHistoryEntry[];
  onSelectEvidence: (entry: AssistantHistoryEntry) => void;
};

function formatAssistantMessage(entry: AssistantHistoryEntry) {
  const { assistant_payload: payload } = entry;
  const lines = [payload.summary];
  if (payload.causes?.length) {
    lines.push("");
    lines.push("Causes:");
    payload.causes.forEach((cause) => lines.push(`• ${cause}`));
  }
  if (payload.actions?.length) {
    lines.push("");
    lines.push("Actions:");
    payload.actions.forEach((action) => lines.push(`• ${action}`));
  }
  return lines.join("\n");
}

export function ChatTranscript({ history, onSelectEvidence }: ChatTranscriptProps) {
  const { isEasyMode } = useMode();

  return (
    <div className="flex flex-col gap-4">
      {history.length === 0 && (
        <EmptyState
          variant="default"
          title={isEasyMode ? "Start Chatting" : "No Messages"}
          description={
            isEasyMode
              ? "Send a message to start a conversation with the assistant. Ask questions about trading, get recommendations, or learn how the platform works."
              : "Send a query to begin the conversation with your assistant."
          }
        />
      )}
      {history.map((entry) => (
        <Fragment key={entry.answer_id}>
          <MessageBubble
            role="user"
            content={entry.user_text}
            timestamp={entry.created_at}
          />
          <MessageBubble
            role="assistant"
            content={formatAssistantMessage(entry)}
            timestamp={entry.created_at}
            evidenceCount={entry.assistant_payload?.evidence_refs?.length ?? 0}
            onShowEvidence={() => onSelectEvidence(entry)}
          />
        </Fragment>
      ))}
    </div>
  );
}

