import { taskCollection, userCollection } from '../db.js';
import { getNextId } from '../utils/idGenerator.js';

function preserveTaskPhase(taskText, replacementText) {
    const trimmed = String(replacementText ?? '').trim();
    if (!trimmed) {
        return trimmed;
    }

    const phaseMatch = String(taskText ?? '').match(/^\[(.+?)\]\s*(.*)$/);
    if (phaseMatch) {
        const [, phase] = phaseMatch;
        const replacementMatch = trimmed.match(/^\[(.+?)\]\s*(.*)$/);
        if (!replacementMatch) {
            return `[${phase}] ${trimmed}`;
        }
    }

    return trimmed;
}

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
            completedAt: completed ? new Date() : null,
            createdAt: newTask.createdAt ? new Date(newTask.createdAt) : new Date()
        };

        await taskCollection.insertOne(taskToInsert);
        return taskToInsert;
    },

    async updateTaskCompletion(taskId, completed) {
        await taskCollection.updateOne(
            { id: taskId },
            {
                $set: {
                    completed,
                    completedAt: completed ? new Date() : null
                }
            }
        );
        return await taskCollection.findOne({ id: taskId });
    },

    async getTaskOwnerId(taskId) {
        const task = await taskCollection.findOne({ id: taskId });
        if (!task) {
            return null;
        }
        if (Number.isInteger(task.userId)) {
            return task.userId;
        }
        const owner = await userCollection.findOne({ _id: task.userId });
        return owner ? owner.id : null;
    },

    async updateTaskText(taskId, newText) {
        const existingTask = await taskCollection.findOne({ id: taskId });
        if (!existingTask) {
            return null;
        }

        const normalizedText = preserveTaskPhase(existingTask.text, newText);
        await taskCollection.updateOne(
            { id: taskId },
            { $set: { text: normalizedText } }
        );
        return await taskCollection.findOne({ id: taskId });
    },

    async deleteTask(taskId) {
        const result = await taskCollection.deleteOne({ id: taskId });
        return result.deletedCount > 0;
    }
};

export default taskRepository;