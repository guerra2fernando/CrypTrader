/* eslint-disable */
// @ts-nocheck
import Link from "next/link";

import { EmptyState } from "@/components/EmptyState";
import { useMode } from "@/lib/mode-context";

type EvidenceItem = {
  evidence_id: string;
  title: string;
  summary: string;
  kind: string;
  score?: number;
};

type EvidenceAttachmentListProps = {
  evidence: EvidenceItem[];
};

export function EvidenceAttachmentList({ evidence }: EvidenceAttachmentListProps) {
  const { isEasyMode } = useMode();

  if (!evidence?.length) {
    return (
      <EmptyState
        variant="default"
        title={isEasyMode ? "No Evidence" : "No Evidence Attached"}
        description={
          isEasyMode
            ? "This answer doesn't have supporting evidence attached. Evidence helps explain how the assistant reached its conclusions."
            : "No evidence was attached to this answer."
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {evidence.map((item) => (
        <div key={item.evidence_id} className="rounded-md border border-border bg-card/70 p-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{item.kind}</div>
              <div className="text-sm font-medium text-foreground">{item.title}</div>
            </div>
            <span className="text-xs text-muted-foreground">{(item.score ?? 0).toFixed(2)}</span>
          </div>
          {item.summary && <p className="mt-2 text-xs text-muted-foreground">{item.summary}</p>}
          <Link
            href={`/assistant/evidence/${encodeURIComponent(item.evidence_id)}`}
            className="mt-2 inline-flex text-xs font-medium text-primary underline"
          >
            View details
          </Link>
        </div>
      ))}
    </div>
  );
}

