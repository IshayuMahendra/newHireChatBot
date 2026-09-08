import {eventCollection} from '../db.js';
import { getNextId } from '../utils/idGenerator.js';

export const eventRepository = {
    async addEvent(newEvent) {
        const id = await getNextId(eventCollection);
        newEvent.id = id;
        newEvent.timestamp = newEvent.timestamp ? new Date(newEvent.timestamp) : new Date();
        await eventCollection.insertOne(newEvent);
        return newEvent;
    }
};

export default eventRepository;