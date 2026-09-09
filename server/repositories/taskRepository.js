import { taskCollection, userCollection } from '../db.js';
import { getNextId } from '../utils/idGenerator.js';

export const taskRepository = {
    async getUserTasks(userId) {
        const user = await userCollection.findOne({ id: userId });
        if (!user) {
            return null;
        }

        return await taskCollection
            .find({
                $or: [
                    { userId },
                    { userId: user._id }
                ]
            })
            .sort({ id: 1, _id: 1 })
            .toArray();
    },

    async addTask(userId, newTask) {
        const user = await userCollection.findOne({ id: userId });
        if (!user) {
            return null;
        }
        const taskId = await getNextId(taskCollection);
        const completed = typeof newTask.completed === 'boolean' ? newTask.completed : false;
        const taskToInsert = {
            ...newTask,
            id: taskId,
            userId: user._id,
            completed,
            createdAt: newTask.createdAt ? new Date(newTask.createdAt) : new Date()
        };

        await taskCollection.insertOne(taskToInsert);
        return taskToInsert;
    },

    async updateTaskCompletion(taskId, completed) {
        await taskCollection.updateOne(
            { id: taskId },
            { $set: { completed } }
        );
        return await taskCollection.findOne({ id: taskId });
    },

    async getTaskOwnerId(taskId) {
        const task = await taskCollection.findOne({ id: taskId });
        if (!task) {
            return null;
        }
        const owner = await userCollection.findOne({ _id: task.userId });
        return owner ? owner.id : null;
    },

    async updateTaskText(taskId, newText) {
        await taskCollection.updateOne(
            { id: taskId },
            { $set: { text: newText } }
        );
        return await taskCollection.findOne({ id: taskId });
    },

    async deleteTask(taskId) {
        const result = await taskCollection.deleteOne({ id: taskId });
        return result.deletedCount > 0;
    }
};

export default taskRepository;
