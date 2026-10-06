const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getJwtSecret } = require('./security');

const verifyJWT = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, getJwtSecret());
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user || req.user.isActive === false) {
        return res.status(401).json({ message: 'User not found or inactive' });
      }
      next();
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const checkRole = (...roles) => {
  const allowedRoles = roles.flat().map(r => r.toLowerCase());
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role.toLowerCase())) {
      return res.status(403).json({ 
        message: `Role ${req.user ? req.user.role : 'Unknown'} is not authorized to access this route` 
      });
    }
    next();
  };
};

module.exports = { verifyJWT, checkRole };
