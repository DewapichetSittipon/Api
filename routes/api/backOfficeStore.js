const express = require('express');
const mysql = require('mysql2');
const { v4: uuidv4 } = require('uuid');
const verifyToken = require('../../middleware');
const userClaim = require('../../utils/userClaim');
const multer = require('multer');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_DATABASE,
});

const getUser = (token) => {
  const user = userClaim(token);

  return user;
};

const fileSize = (1024 * 1024) * 10; //limit size 10 mb

const storage = multer.diskStorage({
  destination: function (_, _, cb) {
    cb(null, path.join(__dirname, '../..', 'uploads'));
  },
  filename: function (_, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const upload = multer({ storage: storage, limits: { fileSize: fileSize } });

//Add Store
router.post('/', verifyToken, upload.single('image'), (req, res) => {
  console.log(req.file?.filename)
  const body = req.body;
  const fileName = req.file?.filename;
  const token = req.headers['authorization'];
  const user = getUser(token);
  const select = "SELECT id";
  const from = "FROM `stores`";
  const where = "WHERE name = ?";
  const query = `${select} ${from} ${where}`;
  const params = [body.name];
  const generatedUUID = uuidv4();

  if (user.role !== "admin") {
    return res.status(401).send('Unauthrorized');
  }

  if (!req.file ||
    !body.name ||
    !body.latitude ||
    !body.longitude) {
    fs.unlink(req.file?.path, (err) => {
      if (err) {
        console.error('Error deleting file:', err);
      }
    });

    return res.status(400).send();
  }

  const newBody = {
    ...body,
    id: generatedUUID,
    banner: fileName,
    views: 0,
  };

  const insert = "INSERT INTO `stores`(`id`, `name`, `description`, `views`, `banner`, `latitude`, `longitude`, `createBy`, `createDate`) VALUES (?, ?, ?, ?, ?, ?, ? ,?, ?)";
  const insertParams = [newBody.id, newBody.name, newBody.description, newBody.views, newBody.banner, newBody.latitude, newBody.longitude, user.id, new Date()];

  const insertStore = () => db.query(
    insert,
    insertParams,
    (err) => {
      res.status(201).send(newBody);
    }
  );

  db.query(
    query,
    params,
    (_, result) => {
      if (result?.length > 0) {
        fs.unlink(req.file?.path, (err) => {
          if (err) {
            console.error('Error deleting file:', err);
          }
        });
        return res.status(400).send('Name is duplicate');
      } else {
        insertStore();
      }
    }
  );
});

//Get List Store
router.get('/', verifyToken, (req, res) => {
  const page = parseInt(req.query.page);
  const size = parseInt(req.query.size);
  const keyword = (req.query.keyword);

  const startIndex = (page - 1) * size;
  const endIndex = page * size;
  const select = "SELECT *";
  const from = "FROM `stores`";
  const where = "WHERE name LIKE ? OR description LIKE ?";
  const params = [`%${keyword}%`, `%${keyword}%`];
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

//Get Store Detail
router.get('/:id', verifyToken, (req, res) => {
  const id = req.params.id;
  const select = "SELECT *";
  const from = "FROM `stores`";
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
        res.status(404).send('Not found Store');
      }

      res.json(result[0]);
    }
  );
});

//Update Store
router.put('/:id', verifyToken, upload.single('image'), (req, res) => {
  const id = req.params.id;
  const body = req.body;
  const select = "SELECT *";
  const from = "FROM `stores`";
  const where = "WHERE id = ?";
  const whereName = "WHERE name = ?";
  const query = `${select} ${from} ${where}`;
  const queryUserByName = `${select} ${from} ${whereName}`;
  const params = [body.name];
  const token = req.headers['authorization'];
  const user = getUser(token);

  if (user.role !== "admin") {
    return res.status(401).send('Unauthrorized');
  }

  if (!body.name ||
    !body.latitude ||
    !body.longitude) {
    fs.unlink(req.file.path, (err) => {
      if (err) {
        console.error('Error deleting file:', err);
      }
    });

    return res.status(400).send();
  }

  let newBody = {
    ...body
  };

  const update = "UPDATE `stores` SET  name = ?, description = ?, banner = ?, latitude = ?, longitude = ?, updateBy = ?, updateDate = ?";
  const whereUpdate = "WHERE id = ?"
  const updateQuery = `${update} ${whereUpdate}`;

  const updateStore = (imageName) => {
    if (req.file) {
      const filePath = path.join(__dirname, '../..', 'uploads', imageName);
      newBody.banner = req.file?.filename;

      fs.unlink(filePath, (err) => {
        if (err) {
          console.error('Error deleting file:', err);
        }
      });
    } else {
      newBody.banner = imageName
    }

    db.query(
      updateQuery,
      [newBody.name, newBody.description, newBody.banner, newBody.latitude, newBody.longitude, user.id, new Date(), id],
      () => {
        res.status(202).send(newBody);
      });
  };

  const checkStoreIsMatchAndUpdate = () => db.query(
    query,
    [id],
    (_, result) => {
      if (result?.length === 0) {
        return res.status(404).send("Not found store");
      }
      else {
        updateStore(result[0].banner);
      }
    }
  );

  db.query(
    queryUserByName,
    params,
    (_, result) => {
      if (result.length > 0 && result[0].id !== id) {
        return res.status(400).send("Name is duplicate");
      } else {
        checkStoreIsMatchAndUpdate();
      }
    }
  );
});

//Delete Store
router.delete('/:id', verifyToken, (req, res) => {
  const id = req.params.id;
  const select = "SELECT id, banner";
  const from = "FROM `stores`";
  const where = "WHERE id = ?";
  const query = `${select} ${from} ${where}`;
  const params = [id];
  const deleteQuery = "DELETE FROM `stores` WHERE id = ?";
  const token = req.headers['authorization'];
  const user = getUser(token);

  if (user.role !== "admin") {
    return res.status(401).send('Unauthrorized');
  }

  const deleteStore = () => db.query(
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
        return res.status(404).send("Not Found store");
      } else {
        console.log(result[0])
        const filePath = path.join(__dirname, '../..', 'uploads', result[0].banner);

        fs.unlink(filePath, (err) => {
          if (err) {
            console.error('Error deleting file:', err);
          }
        });

        deleteStore();
      }
    }
  );
});

module.exports = router;