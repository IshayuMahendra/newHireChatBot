import { Router } from 'express';
import userRepository from '../repositories/userRepository.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.post('/register', asyncHandler('POST /register', async (req, res) => {
    const newUser = req.body;
    const exists = await userRepository.getUserByUsername(newUser.username);
    if (exists) {
        return res.status(400).json({ error: 'Username already exists' });
    }
    if (newUser.userType === 'manager') {
        return res.status(400).json({ error: 'Cannot register as manager' });
    }
    const userAdded = await userRepository.registerUser(newUser);
    res.status(201).json(userAdded);
}));

router.post('/login', asyncHandler('POST /login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }
    const authenticated = await userRepository.loginUser(username, password);
    if (!authenticated.authenticated) {
        return res.status(401).json(authenticated);
    }
    return res.status(200).json(authenticated);
}));

export default router;
