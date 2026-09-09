import { Router } from 'express';
import userRepository from '../repositories/userRepository.js';
import taskRepository from '../repositories/taskRepository.js';
import eventRepository from '../repositories/eventRepository.js';
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
    await eventRepository.addEvent({
        userId: taskAdded.userId,
        type: 'task_created',
        detail: `New task created: ${taskAdded.text}`,
    });
    return res.status(201).json(taskAdded);
}));

router.patch('/users/:id/plan30Day', authenticateToken, asyncHandler('PATCH /users/:id/plan30Day', async (req, res) => {
    const userId = Number(req.params.id);
        if (!Number.isInteger(userId) || userId < 1) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }
        const { plan30Day } = req.body;
        if (typeof plan30Day !== 'string') {
            return res.status(400).json({ error: 'Body must contain string' });
        }
        const user = await userRepository.getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const updatedUser = await userRepository.updateUserPlan30Day(userId, plan30Day);
        await eventRepository.addEvent({
            userId: user.id,
            type: 'plan30Day_updated',
            detail: `30-day plan updated: ${plan30Day}`,
        });
        return res.status(200).json(updatedUser);
    }));

export default router;
