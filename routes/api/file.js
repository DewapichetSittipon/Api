const express = require('express');
const router = express.Router();
const path = require('path');

//Get File
router.get('/:filename', (req, res) => {
  const filename = req.params.filename;
  const imagePath = path.join(__dirname, '../..', 'uploads', filename);

  res.sendFile(imagePath);
});

module.exports = router;