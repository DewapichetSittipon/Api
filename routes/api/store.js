const express = require('express');
const router = express.Router();
const mysql = require('mysql2');

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_DATABASE,
});

//Get Store List
router.get('/', (req, res) => {
  const page = parseInt(req.query.page);
  const size = parseInt(req.query.size);
  const keyword = (req.query.keyword);

  const startIndex = (page - 1) * size;
  const endIndex = page * size;
  const select = "SELECT id, name, banner";
  const from = "FROM `stores`";
  const where = "WHERE name LIKE ? OR description LIKE ?";
  const params = [`%${keyword}%`, `%${keyword}%`];
  const query = `${select} ${from} ${keyword ? where : ""}`;

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
router.get('/:id', (req, res) => {
  const id = req.params.id;
  const select = "SELECT id, name, description, banner, latitude, longitude, views";
  const from = "FROM `stores`";
  const where = "WHERE id = ?"
  const query = `${select} ${from} ${where}`;
  const params = [id];

  const update = "UPDATE `stores` SET  views = ?";
  const whereUpdate = "WHERE id = ?";
  const updateQuery = `${update} ${whereUpdate}`;

  const updateView = (views) => {
    const increaseViews = views + 1;

    db.query(
      updateQuery,
      [increaseViews, id],
    );
  }

  db.query(
    query,
    params,
    (_, result) => {
      if (result.length === 0) {
        res.status(404).send('Not found Store');
      }
      res.json(result[0]);

      updateView(result[0].views);
    }
  );
});
module.exports = router;