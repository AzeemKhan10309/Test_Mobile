import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getStudentResults,
  createResult,
  updateResult,
  deleteResult,
} from '../controllers/resultController.js';

const router = express.Router();

router.use(authenticate);

router.get('/student/:id', getStudentResults);
router.post('/', createResult);
router.put('/:id', updateResult);
router.delete('/:id', deleteResult);

export default router;