export async function getNextId(collection) {
    const topItem = await collection.find().sort({ id: -1 }).limit(1).toArray();
    if (topItem.length === 0) {
        return 1;
    }
    return topItem[0].id + 1;
}
