export function requireManager(req, res, next) {
    if (req.user.userType !== 'manager') {
        return res.status(403).json({ error: 'Only managers can access this resource' });
    }
    next();
}
