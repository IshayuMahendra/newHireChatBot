// True if the requesting user owns the resource or is a manager
export function isOwnerOrManager(user, ownerId) {
    return user.id === ownerId || user.userType === 'manager';
}
