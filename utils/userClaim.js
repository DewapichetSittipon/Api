require('dotenv').config();

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.SECRET_KEY;

const userClaim = (token) => {
  const verifyOptions = { algorithms: ['HS256'] };
  const decoded = jwt.verify(token.split(' ')[1], JWT_SECRET, verifyOptions);

  const { id, username, role } = decoded;

  return ({
    id,
    username,
    role,
  })
};

module.exports = userClaim;