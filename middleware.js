require('dotenv').config();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.SECRET_KEY;

const verifyToken = (req, res, next) => {
  const token = req.headers['authorization'];

  if (!token) {
    return res.status(401).send();
  }

  jwt.verify(token.split(' ')[1], JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    req.user = user;
    next();
  });
};

module.exports = verifyToken;