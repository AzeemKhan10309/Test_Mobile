import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { submissionsAPI } from '../api/submissions.api';
import { QUERY_KEYS } from '../constants/config';
import { Answer } from '../types';

export function useSubmission(submissionId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.submission(submissionId),
    queryFn: () => submissionsAPI.getById(submissionId),
    enabled: !!submissionId,
  });
}

/** Server-authoritative timer. Poll this — never trust a purely local countdown. */
export function useSubmissionTimer(submissionId: string, enabled: boolean) {
  return useQuery({
    queryKey: QUERY_KEYS.timer(submissionId),
    queryFn: () => submissionsAPI.getTimer(submissionId),
    enabled: enabled && !!submissionId,
    refetchInterval: 15_000, // resync with server periodically; UI still ticks locally between polls
  });
}

export function useSaveAnswers(submissionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (answers: Answer[]) => submissionsAPI.saveAnswers(submissionId, answers),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.submission(submissionId) }),
  });
}

export function useSubmitExam(submissionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (idempotencyKey: string) => submissionsAPI.submit(submissionId, idempotencyKey),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.submission(submissionId) }),
  });
}
