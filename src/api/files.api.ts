import { api, unwrap } from './client';

export interface UploadedFile {
  fileUrl: string;
  filename: string;
  mimeType: string;
  size: number;
}

export const filesAPI = {
  upload: (fileUri: string, filename: string, mimeType: string) => {
    const form = new FormData();
    // React Native FormData file shape
    form.append('file', { uri: fileUri, name: filename, type: mimeType } as unknown as Blob);
    return api
      .post('/files/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((r) => unwrap<UploadedFile>(r.data));
  },
};
