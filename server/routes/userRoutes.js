import { Router } from 'express';
import userRepository from '../repositories/userRepository.js';
import taskRepository from '../repositories/taskRepository.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireManager } from '../middleware/requireManager.js';
import { isOwnerOrManager } from '../utils/authorization.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/users', authenticateToken, requireManager, asyncHandler('GET /users', async (req, res) => {
    const users = await userRepository.getAllUsers();
    return res.status(200).json(users);
}));

router.get('/users/:id/tasks', authenticateToken, asyncHandler('GET /users/:id/tasks', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ error: 'Invalid user ID' });
    }
    if (!isOwnerOrManager(req.user, id)) {
        return res.status(403).json({ error: 'Managers do not have tasks' });
    }
    const tasks = await taskRepository.getUserTasks(id);
    if (tasks === null) {
        return res.status(404).json({ error: 'User not found' });
    }
    return res.status(200).json(tasks);
}));

router.post('/users/:id/tasks', authenticateToken, asyncHandler('POST /users/:id/tasks', async (req, res) => {
    const userId = Number(req.params.id);
    const newTask = req.body;

    if (!Number.isInteger(userId) || userId < 1) {
        return res.status(400).json({ error: 'Invalid user ID' });
    }
    if (!isOwnerOrManager(req.user, userId)) {
        return res.status(403).json({ error: 'Managers do not have tasks' });
    }

    if (!newTask || typeof newTask.text !== 'string' || !newTask.text.trim()) {
        return res.status(400).json({ error: 'Invalid user ID or task data' });
    }
    const taskAdded = await taskRepository.addTask(userId, {
        ...newTask,
        text: newTask.text.trim()
    });
    if (!taskAdded) {
        return res.status(404).json({ error: 'User not found' });
    }
    return res.status(201).json(taskAdded);
}));

export default router;
