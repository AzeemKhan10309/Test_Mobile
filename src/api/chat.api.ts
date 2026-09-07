import { api, unwrap } from './client';
import { ChatMessage, Group } from '../types';

export const chatAPI = {
  getPartners: () => api.get('/chat/partners').then((r) => unwrap(r.data)),
  getMessages: (userId: string) => api.get(`/chat/messages/${userId}`).then((r) => unwrap<ChatMessage[]>(r.data)),
  sendMessage: (userId: string, message: string) =>
    api.post(`/chat/messages/${userId}`, { message }).then((r) => unwrap<ChatMessage>(r.data)),

  createGroup: (data: { groupName: string; description?: string; createdBy?: string; joinMode?: string }) =>
    api.post('/create-group', data).then((r) => unwrap<Group>(r.data)),

  joinGroup: (data: { groupId?: string; inviteCode?: string }) =>
    api.post('/join-group', data).then((r) => unwrap<Group>(r.data)),

  getMyGroups: () => api.get('/my-groups').then((r) => unwrap<Group[]>(r.data)),

  getGroupMembers: (groupId: string) => api.get(`/groups/${groupId}/members`).then((r) => unwrap(r.data)),

  addGroupMember: (groupId: string, userId: string) =>
    api.post(`/groups/${groupId}/members`, { userId }).then((r) => unwrap(r.data)),

  removeGroupMember: (groupId: string, userId: string) =>
    api.delete(`/groups/${groupId}/members/${userId}`).then((r) => unwrap(r.data)),

  getGroupMessages: (groupId: string, params?: { cursor?: string; limit?: number }) =>
    api.get(`/group-messages/${groupId}`, { params }).then((r) => unwrap(r.data)),

  sendGroupMessage: (groupId: string, message: string) =>
    api.post('/send-message', { groupId, message }).then((r) => unwrap<ChatMessage>(r.data)),
};
