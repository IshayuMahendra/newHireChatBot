import jwt from 'jsonwebtoken';

export function signAuthToken(user) {
    return jwt.sign(
        { id: user.id, username: user.username, userType: user.userType, department: user.department, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );
}
