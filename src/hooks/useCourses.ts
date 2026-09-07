import { useQuery } from '@tanstack/react-query';
import { coursesAPI } from '../api/courses.api';
import { QUERY_KEYS } from '../constants/config';

export function useCourses() {
  return useQuery({ queryKey: QUERY_KEYS.courses, queryFn: coursesAPI.getAll });
}
