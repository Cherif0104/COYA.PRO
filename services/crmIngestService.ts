import * as programmeService from './programmeService';

/** Ingestion stable des soumissions Collecte vers le CRM (délègue à `upsertParticipantPayloadToCrm`). */
export async function ingestCollecteSubmission(
  payload: Record<string, string>,
  ids: { collectionId: string; submissionId: string },
): Promise<{ contactId: string; created: boolean } | null> {
  return programmeService.upsertParticipantPayloadToCrm(payload, {
    collectionId: ids.collectionId,
    submissionId: ids.submissionId,
  });
}
