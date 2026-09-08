import { Router } from 'express';
import flagRepository from '../repositories/flagRepository.js';
import eventRepository from '../repositories/eventRepository.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireManager } from '../middleware/requireManager.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.post('/flags', authenticateToken, asyncHandler('POST /flags', async (req, res) => {
    const newFlag = req.body;
    const flagAdded = await flagRepository.addFlag(newFlag);
    await eventRepository.addEvent({
        userId: newFlag.userId,
        type: 'flag_raised',
        detail: `Assistant flagged new hire: ${newFlag.reason}`,
    });
    return res.status(201).json(flagAdded);
}));

router.get('/flags', authenticateToken, requireManager, asyncHandler('GET /flags', async (req, res) => {
    const flags = await flagRepository.getAllFlags();
    return res.status(200).json(flags);
}));

router.patch('/flags/:id', authenticateToken, requireManager, asyncHandler('PATCH /flags/:id', async (req, res) => {
    const flagId = Number(req.params.id);
    if (!Number.isInteger(flagId) || flagId < 1) {
        return res.status(400).json({ error: 'Invalid flag ID' });
    }
    const { resolved } = req.body;
    if (typeof resolved !== 'boolean') {
        return res.status(400).json({ error: 'Body must contain boolean' });
    }
    const flag = await flagRepository.getFlagById(flagId);
    if (!flag) {
        return res.status(404).json({ error: 'Flag not found' });
    }
    const updatedFlag = await flagRepository.updateFlagResolution(flagId, resolved);
    if (resolved) {
        await eventRepository.addEvent({
            userId: flag.userId,
            type: 'flag_resolved',
            detail: `Manager marked flag "${flag.reason}" as resolved`,
        });
    }
    return res.status(200).json(updatedFlag);
}));

export default router;
