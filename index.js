require('dotenv').config();

const express = require('express');
const cors = require('cors')
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/api/backoffice/user', require('./routes/api/backOfficeUser'));
app.use('/api/backoffice/store', require('./routes/api/backOfficeStore'));
app.use('/api/file', require('./routes/api/file'));
app.use('/api/store', require('./routes/api/store'));
app.use('/api/authen', require('./routes/api/authen'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`server is running on port ${PORT}`));