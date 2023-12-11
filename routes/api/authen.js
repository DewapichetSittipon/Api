require('dotenv').config();

const express = require('express');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const hashedPassword = require('../../utils/hashPassword');
const router = express.Router();
const generatedUUID = uuidv4();

const JWT_SECRET = process.env.SECRET_KEY;

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_DATABASE,
});

//Login
router.post('/signin', async (req, res) => {
  const body = req.body;

  const selectUser = "SELECT * FROM `users`";
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
            role: userData.role,
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

//Register
router.post('/signup', async (req, res) => {
  const body = req.body;
  const select = "SELECT id";
  const from = "FROM `users`";
  const where = "WHERE username = ?";
  const query = `${select} ${from} ${where}`;
  const params = [body.userName];

  const passwordHash = await hashedPassword(body.password);

  const newBody = {
    ...body,
    id: generatedUUID,
    password: passwordHash,
    role: 'user',
  };

  const insert = "INSERT INTO `users`(`id`, `firstName`, `lastName`, `userName`, `password`, `role`, `createBy`, `createDate`) VALUES (?, ?, ?, ?, ?, ?, ? ,?)";
  const insertParams = [newBody.id, newBody.firstName, newBody.lastName, newBody.userName, newBody.password, newBody.role, newBody.id, new Date()];

  const insertUser = () => db.query(
    insert,
    insertParams,
    () => {
      res.status(201).send(newBody);
    }
  );

  db.query(
    query,
    params,
    (_, result) => {
      if (result.length > 0) {
        return res.status(400).send('Username is duplicate');
      } else {
        insertUser();
      }
    }
  );
});

module.exports = router;