import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  createGroup,
  joinGroup,
  getGroupMessages,
  sendGroupMessage,
  addGroupMember,
  removeGroupMember,
    getMyGroups,
  getGroupMembers,
} from '../controllers/groupController.js';

const router = express.Router();

router.use(authenticate);

router.post('/create-group', createGroup);
router.post('/join-group', joinGroup);
router.get('/my-groups', getMyGroups);
router.get('/group-messages/:groupId', getGroupMessages);
router.get('/groups/:groupId/members', getGroupMembers);
router.post('/send-message', sendGroupMessage);
router.post('/groups/:groupId/members', addGroupMember);
router.delete('/groups/:groupId/members/:userId', removeGroupMember);
export default router;