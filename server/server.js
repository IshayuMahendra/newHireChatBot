import express from 'express';
import cors from 'cors';
import chatbotRepositoryFunctions from './chatbotRepositoryFunctions.js';
const app = express();
app.use(express.json());
app.use(cors());

app.get('/', (req, res) => {
    res.send('Welcome to our app!')
})

app.post('/register', async (req, res) => {
    const newUser = req.body;
    const exists = await chatbotRepositoryFunctions.getUserByUsername(newUser.username);
    if (exists) {
        return res.status(400).json({ error: 'Username already exists' });
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

app.get('/users/:id/tasks', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ error: 'Invalid user ID' });
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

app.post('/users/:id/tasks', async (req, res) => {
    const userId = Number(req.params.id);
    const newTask = req.body;

    if (!Number.isInteger(userId) || userId < 1) {
        return res.status(400).json({ error: 'Invalid user ID' });
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

//need to write PATCH /tasks/:id/complete



app.listen(3001, () => {
    console.log("Server running on port 3001");
})