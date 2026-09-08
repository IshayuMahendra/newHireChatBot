import { Router } from 'express';
import taskRepository from '../repositories/taskRepository.js';
import { authenticateToken } from '../middleware/auth.js';
import { isOwnerOrManager } from '../utils/authorization.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.patch('/tasks/:id/complete', authenticateToken, asyncHandler('PATCH /tasks/:id/complete', async (req, res) => {
    const taskId = Number(req.params.id);
    if (!Number.isInteger(taskId) || taskId < 1) {
        return res.status(400).json({ error: 'Invalid task ID' });
    }
    const { completed } = req.body;
    if (typeof completed !== 'boolean') {
        return res.status(400).json({ error: 'body must contain boolean' });
    }
    const ownerId = await taskRepository.getTaskOwnerId(taskId);
    if (ownerId === null) {
        return res.status(404).json({ error: 'Task not found' });
    }
    if (!isOwnerOrManager(req.user, ownerId)) {
        return res.status(403).json({ error: 'Managers do not have tasks' });
    }
    const updatedTask = await taskRepository.updateTaskCompletion(taskId, completed);
    if (!updatedTask) {
        return res.status(404).json({ error: 'Task not found' });
    }
    return res.status(200).json(updatedTask);
}));

export default router;
