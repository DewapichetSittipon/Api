const express = require('express');
const mysql = require('mysql2');
const { v4: uuidv4 } = require('uuid');
const hashedPassword = require('../../utils/hashPassword');
const verifyToken = require('../../middleware');
const userClaim = require('../../utils/userClaim');
const router = express.Router();
const generatedUUID = uuidv4();

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_DATABASE,
});

const getUser = (token) => {
  const user = userClaim(token);

  return user;
};

//Get User List
router.get('/', verifyToken, (req, res) => {
  const page = parseInt(req.query.page);
  const size = parseInt(req.query.size);
  const keyword = (req.query.keyword);

  const startIndex = (page - 1) * size;
  const endIndex = page * size;
  const select = "SELECT id, firstName , lastName, userName, role";
  const from = "FROM `storeuser`";
  const where = "WHERE firstName LIKE ? OR lastName LIKE ? OR userName LIKE ?";
  const params = [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`];
  const query = `${select} ${from} ${keyword ? where : ""}`;
  const token = req.headers['authorization'];
  const user = getUser(token);

  if (user.role !== "admin") {
    return res.status(401).send('Unauthrorized');
  }

  db.query(
    query,
    params,
    (_, result) => {
      const items = result.slice(startIndex, endIndex);

      res.json({
        totalRecords: result.length,
        data: items,
      });
    }
  );
});

//Get User By Id
router.get('/:id', verifyToken, (req, res) => {
  const id = req.params.id;
  const select = "SELECT id, firstName , lastName, userName, role";
  const from = "FROM `storeuser`";
  const where = "WHERE id = ?"
  const query = `${select} ${from} ${where}`;
  const params = [id];
  const token = req.headers['authorization'];
  const user = getUser(token);

  if (user.role !== "admin") {
    return res.status(401).send('Unauthrorized');
  }

  db.query(
    query,
    params,
    (_, result) => {
      if (result.length === 0) {
        res.status(404).send('Not found user');
      }

      res.json(result[0]);
    }
  )
});

//Add User
router.post('/', verifyToken, async (req, res) => {
  const body = req.body;
  const select = "SELECT id";
  const from = "FROM `storeuser`";
  const where = "WHERE username = ?";
  const query = `${select} ${from} ${where}`;
  const params = [body.userName];
  const token = req.headers['authorization'];
  const user = getUser(token);

  if (user.role !== "admin") {
    return res.status(401).send('Unauthrorized');
  }

  const passwordHash = await hashedPassword(body.password);

  const newBody = {
    id: generatedUUID,
    ...body,
    password: passwordHash,
  };

  const insert = "INSERT INTO `storeuser`(`id`, `firstName`, `lastName`, `userName`, `password`, `role`, `createBy`, `createDate`) VALUES (?, ?, ?, ?, ?, ?, ? ,?)";
  const insertParams = [newBody.id, newBody.firstName, newBody.lastName, newBody.userName, newBody.password, newBody.role, user.id, new Date()];

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

//Update User
router.put('/:id', verifyToken, async (req, res) => {
  const id = req.params.id;
  const body = req.body;
  const select = "SELECT id";
  const from = "FROM `storeuser`";
  const where = "WHERE username = ?";
  const whereId = "WHERE id = ?";
  const query = `${select} ${from} ${where}`;
  const queryUserById = `${select} ${from} ${whereId}`;
  const params = [body.userName];
  const token = req.headers['authorization'];
  const user = getUser(token);

  if (user.role !== "admin") {
    return res.status(401).send('Unauthrorized');
  }

  const newBody = {
    ...body,
  };

  const update = "UPDATE `storeuser` SET  firstName = ?, lastName = ?, userName = ?, role = ?, updateBy = ?, updateDate = ?";
  const whereUpdate = "WHERE id = ?"
  const updateParams = [newBody.firstName, newBody.lastName, newBody.userName, newBody.role, user.id, new Date(), id];
  const updateQuery = `${update} ${whereUpdate}`;

  const updateUser = () => db.query(
    updateQuery,
    updateParams,
    () => {
      res.status(202).send(newBody);
    }
  );

  const checkUserIsMatchAndUpdate = () => db.query(
    queryUserById,
    [id],
    (_, result) => {
      if (result.length === 0) {
        return res.status(404).send("Not found user");
      } else {
        updateUser();
      }
    }
  );

  db.query(
    query,
    params,
    (_, result) => {
      if (result.length > 0 && result[0].id !== id) {
        return res.status(400).send("Username is duplicate");
      } else {
        checkUserIsMatchAndUpdate();
      }
    }
  );
});

//Delete User
router.delete('/:id', verifyToken, (req, res) => {
  const id = req.params.id;
  const select = "SELECT id";
  const from = "FROM `storeuser`";
  const where = "WHERE id = ?";
  const query = `${select} ${from} ${where}`;
  const params = [id];
  const deleteQuery = "DELETE FROM `storeuser` WHERE id = ?";
  const token = req.headers['authorization'];
  const user = getUser(token);

  if (user.role !== "admin") {
    return res.status(401).send('Unauthrorized');
  }

  const deleteUser = () => db.query(
    deleteQuery,
    params,
    () => {
      res.status(204).send();
    }
  );

  db.query(
    query,
    params,
    (_, result) => {
      if (result.length === 0) {
        return res.status(404).send("Not Found User");
      } else {
        deleteUser();
      }
    }
  );
});

module.exports = router;