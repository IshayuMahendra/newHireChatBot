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
    const userAdded = await chatbotRepositoryFunctions.registerUser(newUser);
    res.status(201).json(userAdded);
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }
    const authenticated = await chatbotRepositoryFunctions.loginUser(username, password);
    res.status(200).json(authenticated);
});

app.get('/users/:id/tasks', async (req, res) => {
    const id = +req.params.id;
    if (!id) {
        return res.status(400).json({ error: 'Invalid user ID' });
    }
    const tasks = await chatbotRepositoryFunctions.getUserTasks(id);
    if (!tasks) {
        return res.status(404).json({ error: 'User not found' });
    }
    return res.status(200).json(tasks);
});

app.post('/users/:id/tasks', async (req, res) => {
    const userId = +req.params.id;
    const newTask = req.body;
    if (!userId || !newTask) {
        return res.status(400).json({ error: 'Invalid user ID or task data' });
    }
    const taskAdded = await chatbotRepositoryFunctions.addTask(userId, newTask);
    if (!taskAdded) {
        return res.status(404).json({ error: 'User not found' });
    }
    return res.status(201).json(taskAdded);
});
//need to write GET /users/:id/tasks, POST /users/:id/tasks, PATCH /tasks/:id/complete



app.listen(3001, () => {
    console.log("Server running on port 3001");
})