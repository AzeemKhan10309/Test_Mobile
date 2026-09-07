import { api, unwrap } from './client';
import { PaginatedResponse, Review } from '../types';

export const reviewsAPI = {
  create: (data: { courseId: string; teacherId?: string; rating: number; content: string }) =>
    api.post('/reviews', data).then((r) => unwrap<Review>(r.data)),

  update: (id: string, data: Partial<Pick<Review, 'rating' | 'content'>>) =>
    api.put(`/reviews/${id}`, data).then((r) => unwrap<Review>(r.data)),

  getMy: () => api.get('/reviews/my').then((r) => unwrap<Review[]>(r.data)),

  // Superadmin surface, exposed only behind the admin navigator.
  adminGetAll: (params?: {
    page?: number; limit?: number; courseId?: string; teacherId?: string;
    rating?: number; status?: string; search?: string; fromDate?: string; toDate?: string;
  }) => api.get('/admin/reviews', { params }).then((r) => unwrap<PaginatedResponse<Review>>(r.data)),

  adminGetById: (id: string) => api.get(`/admin/reviews/${id}`).then((r) => unwrap<Review>(r.data)),

  adminDelete: (id: string) => api.delete(`/reviews/${id}`).then((r) => r.data),

  adminUpdateStatus: (id: string, status: string) =>
    api.patch(`/admin/reviews/${id}/status`, { status }).then((r) => unwrap<Review>(r.data)),
};
