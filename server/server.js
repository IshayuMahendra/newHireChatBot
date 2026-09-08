import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import flagRoutes from './routes/flagRoutes.js';

const app = express();
app.use(express.json());
app.use(cors());

app.use(authRoutes);
app.use(userRoutes);
app.use(taskRoutes);
app.use(flagRoutes);

app.listen(3001, () => {
    console.log("Server running on port 3001");
})