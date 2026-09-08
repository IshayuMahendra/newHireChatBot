import jwt from 'jsonwebtoken';
import { flagCollection } from '../db.js';
import { getNextId } from '../utils/idGenerator.js';

export const flagRepository = {
    async addFlag(newFlag) {
        const id = await getNextId(flagCollection);
        newFlag.id = id;
        newFlag.createdAt = newFlag.createdAt ? new Date(newFlag.createdAt) : new Date();
        await flagCollection.insertOne(newFlag);
        const token = jwt.sign(
            { id: newFlag.id, userId: newFlag.userId, _id: newFlag._id, reason: newFlag.reason, resolved: newFlag.resolved, createdAt: newFlag.createdAt },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
        return { ...newFlag, jwt: token };
    },

    async getAllFlags() {
        return await flagCollection.find().toArray();
    },

    async getFlagById(flagId) {
        return await flagCollection.findOne({ id: flagId });
    },

    async updateFlagResolution(flagId, resolved) {
        await flagCollection.updateOne(
            { id: flagId },
            { $set: { resolved } }
        );
        return await flagCollection.findOne({ id: flagId });
    },
};

export default flagRepository;
