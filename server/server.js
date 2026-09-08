import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import chatbotRepositoryFunctions from './chatbotRepositoryFunctions.js';
import { authenticateToken } from './middleware/auth.js';
const app = express();
app.use(express.json());
app.use(cors());

app.post('/register', async (req, res) => {
    const newUser = req.body;
    const exists = await chatbotRepositoryFunctions.getUserByUsername(newUser.username);
    if (exists) {
        return res.status(400).json({ error: 'Username already exists' });
    }
    if (newUser.userType === 'manager') {
        return res.status(400).json({ error: 'Cannot register as manager' });
    }
    const userAdded = await chatbotRepositoryFunctions.registerUser(newUser);
    res.status(201).json(userAdded);
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }
    const authenticated = await chatbotRepositoryFunctions.loginUser(username, password);
    if (!authenticated.authenticated) {
        return res.status(401).json(authenticated);
    }
    return res.status(200).json(authenticated);
});

app.get('/users', authenticateToken, async (req, res) => {
    if (req.user.userType !== 'manager') {
        return res.status(403).json({ error: 'Only managers can access this resource' });
    }
    const users = await chatbotRepositoryFunctions.getAllUsers();
    return res.status(200).json(users);
});

app.get('/users/:id/tasks', authenticateToken, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ error: 'Invalid user ID' });
    }
    if (req.user.id !== id && req.user.userType !== 'manager') {
        return res.status(403).json({ error: 'Managers do not have tasks' });
    }

    try {
        const tasks = await chatbotRepositoryFunctions.getUserTasks(id);
        if (tasks === null) {
            return res.status(404).json({ error: 'User not found' });
        }
        return res.status(200).json(tasks);
    } catch (error) {
        console.error('GET /users/:id/tasks failed:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/users/:id/tasks', authenticateToken, async (req, res) => {
    const userId = Number(req.params.id);
    const newTask = req.body;

    if (!Number.isInteger(userId) || userId < 1) {
        return res.status(400).json({ error: 'Invalid user ID' });
    }
    if (req.user.id !== userId && req.user.userType !== 'manager') {
        return res.status(403).json({ error: 'Managers do not have tasks' });
    }

    if (!newTask || typeof newTask.text !== 'string' || !newTask.text.trim()) {
        return res.status(400).json({ error: 'Invalid user ID or task data' });
    }
        const taskAdded = await chatbotRepositoryFunctions.addTask(userId, {
            ...newTask,
            text: newTask.text.trim()
        });
        if (!taskAdded) {
            return res.status(404).json({ error: 'User not found' });
        }
        return res.status(201).json(taskAdded);
});

app.patch('/tasks/:id/complete', authenticateToken, async (req, res) => {
    const taskId = Number(req.params.id);
    if (!Number.isInteger(taskId) || taskId < 1) {
        return res.status(400).json({ error: 'Invalid task ID' });
    }
    const {completed} = req.body;
    if (typeof completed !== 'boolean') {
        return res.status(400).json({error:"body must contain boolean"})
    };
    try {
        const ownerId = await chatbotRepositoryFunctions.getTaskOwnerId(taskId);
        if (ownerId === null) {
            return res.status(404).json({ error: 'Task not found' });
        }
        if (req.user.id !== ownerId && req.user.userType !== 'manager') {
            return res.status(403).json({ error: 'Managers do not have tasks' });
        }
        const updatedTask = await chatbotRepositoryFunctions.updateTaskCompletion(taskId, completed);
        if (!updatedTask) {
            return res.status(404).json({ error: 'Task not found' });
        }
        return res.status(200).json(updatedTask);
    } catch (error) {
        console.error('PATCH /tasks/:id/complete failed:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/flags', authenticateToken, async (req, res) => {
    const newFlag = req.body;
    try {
        const flagAdded = await chatbotRepositoryFunctions.addFlag(newFlag);
        return res.status(201).json(flagAdded);
    } catch (error) {
        console.error('POST /flags failed:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/flags', authenticateToken, async (req, res) => {
    if (req.user.userType !== 'manager') {
        return res.status(403).json({ error: 'Only managers can access this resource' });
    }
    try {
        const flags = await chatbotRepositoryFunctions.getAllFlags();
        return res.status(200).json(flags);
    } catch (error) {
        console.error('GET /flags failed:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});


app.listen(3001, () => {
    console.log("Server running on port 3001");
})