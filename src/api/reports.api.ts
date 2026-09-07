import { api } from './client';

export const reportsAPI = {
  // PDF binary response — never JSON.parse this.
  downloadResult: (submissionId: string) =>
    api.get(`/reports/result/${submissionId}`, { responseType: 'arraybuffer' }),
};
