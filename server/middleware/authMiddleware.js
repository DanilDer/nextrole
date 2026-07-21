const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    try{

        // Step 1: Get the token from the request header
        const authHeader = req.headers['authorization'];

        // Step 2: Check if a token was provided
        if (!authHeader) {
            return res.status(401).json({ error: 'No token provided, access denied' });
        }

        // Step 3: The header looks like "Bearer eyJhbG..."
        const token = authHeader.split(' ')[1];

        if (!token){
            return res.status(401).json({ error: 'Token format invalid' });
        }

        // Step 4: Verify the token is valid and not expired
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Step 5: Attach the decoded user data to the request
        // Now any route that uses this middleware has access to req.user
        req.user = decoded;

        // Step 6: Move on to the next funcation (the actual route handler)
        next();

    } catch (error) {
        // jwt.verify throws an error if the token is invalid or expired
        return res.status(401).json({ error: 'Token is invalid or expired'});
    }
};

module.exports = authMiddleware;