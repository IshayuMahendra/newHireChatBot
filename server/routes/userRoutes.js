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

router.get('/users/:id', authenticateToken, asyncHandler('GET /users/:id', async (req, res) => {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId) || userId < 1) {
        return res.status(400).json({ error: 'Invalid user ID' });
    }
    if (!isOwnerOrManager(req.user, userId)) {
        return res.status(403).json({ error: 'Not authorized to view this user' });
    }
    const user = await userRepository.getUserById(userId);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    const { password, ...safeUser } = user;
    return res.status(200).json(safeUser);
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

    router.patch('/users/:id/plan60Day', authenticateToken, asyncHandler('PATCH /users/:id/plan60Day', async (req, res) => {
    const userId = Number(req.params.id);
        if (!Number.isInteger(userId) || userId < 1) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }
        const { plan60Day } = req.body;
        if (typeof plan60Day !== 'string') {
            return res.status(400).json({ error: 'Body must contain string' });
        }
        const user = await userRepository.getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const updatedUser = await userRepository.updateUserPlan60Day(userId, plan60Day);
        await eventRepository.addEvent({
            userId: user.id,
            type: 'plan60Day_updated',
            detail: `60-day plan updated: ${plan60Day}`,
        });
        return res.status(200).json(updatedUser);
    }));

    router.patch('/users/:id/plan90Day', authenticateToken, asyncHandler('PATCH /users/:id/plan90Day', async (req, res) => {
    const userId = Number(req.params.id);
        if (!Number.isInteger(userId) || userId < 1) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }
        const { plan90Day } = req.body;
        if (typeof plan90Day !== 'string') {
            return res.status(400).json({ error: 'Body must contain string for plan90Day' });
        }
        const user = await userRepository.getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const updatedUser = await userRepository.updateUserPlan90Day(userId, plan90Day);
        await eventRepository.addEvent({
            userId: user.id,
            type: 'plan90Day_updated',
            detail: `90-day plan updated: ${plan90Day}`,
        });
        return res.status(200).json(updatedUser);
    }));
    
    router.patch('/users/:id/week1Outcome', authenticateToken, asyncHandler('PATCH /users/:id/week1Outcome', async (req, res) => {
    const userId = Number(req.params.id);
        if (!Number.isInteger(userId) || userId < 1) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }
        const { week1Outcome } = req.body;
        if (typeof week1Outcome !== 'string') {
            return res.status(400).json({ error: 'Body must contain string for week1Outcome' });
        }
        const user = await userRepository.getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const updatedUser = await userRepository.updateUserWeek1Outcome(userId, week1Outcome);
        await eventRepository.addEvent({
            userId: user.id,
            type: 'week1Outcome_updated',
            detail: `Week 1 Outcome updated: ${week1Outcome}`,
        });
        return res.status(200).json(updatedUser);
    }));

    router.patch('/users/:id/week2_4Outcome', authenticateToken, asyncHandler('PATCH /users/:id/week2_4Outcome', async (req, res) => {
    const userId = Number(req.params.id);
        if (!Number.isInteger(userId) || userId < 1) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }
        const { week2_4Outcome } = req.body;
        if (typeof week2_4Outcome !== 'string') {
            return res.status(400).json({ error: 'Body must contain string for week2_4Outcome' });
        }
        const user = await userRepository.getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const updatedUser = await userRepository.updateUserWeek2_4Outcome(userId, week2_4Outcome);
        await eventRepository.addEvent({
            userId: user.id,
            type: 'week2_4Outcome_updated',
            detail: `Week 2-4 Outcome updated: ${week2_4Outcome}`,
        });
        return res.status(200).json(updatedUser);
    }));

    router.get('/users/:id/activity', authenticateToken, asyncHandler('GET /users/:id/activity', async (req, res) => {
        const userId = Number(req.params.id);
        if (!Number.isInteger(userId) || userId < 1) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }
        const user = await userRepository.getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const activity = await eventRepository.getUserActivity(userId);
        return res.status(200).json(activity);
    }));

export default router;
