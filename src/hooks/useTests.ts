import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { testsAPI } from '../api/tests.api';
import { QUERY_KEYS } from '../constants/config';

export function useTests(params?: { status?: string; page?: number; limit?: number }) {
  return useQuery({ queryKey: QUERY_KEYS.tests(params), queryFn: () => testsAPI.getAll(params) });
}

export function useTest(id: string) {
  return useQuery({ queryKey: QUERY_KEYS.test(id), queryFn: () => testsAPI.getById(id), enabled: !!id });
}

export function useCreateTest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => testsAPI.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tests'] }),
  });
}

export function usePublishTest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => testsAPI.publish(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.test(id) });
      qc.invalidateQueries({ queryKey: ['tests'] });
    },
  });
}
