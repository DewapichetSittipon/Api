require('dotenv').config();

const express = require('express');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const router = express.Router();

const JWT_SECRET = process.env.SECRET_KEY;

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_DATABASE,
});

//Login
router.post('/login', async (req, res) => {
  const body = req.body;

  const selectUser = "SELECT * FROM `storeuser`";
  const whereUser = "WHERE username = ?";
  const params = [body.userName];
  const queryUser = `${selectUser} ${whereUser}`;

  db.query(
    queryUser,
    params,
    async (_, result) => {
      if (result[0]) {
        const userData = result[0];
        const passwordMatch = await bcrypt.compare(body.password, userData.password);

        if (passwordMatch) {
          const expiresIn = (60 * 60 * 24) * 365 //expires in 1 year 
          const token = jwt.sign({ id: userData.id, username: userData.username, password: userData.password, role: userData.role }, JWT_SECRET, { expiresIn });

          return res.json({
            access_token: token,
            expires_token: expiresIn,
          });
        } else {
          return res.status(400).send();
        }
      } else {
        return res.status(404).send();
      }
    }
  );
});

module.exports = router;