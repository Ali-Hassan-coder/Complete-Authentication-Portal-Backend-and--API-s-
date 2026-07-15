const express = require('express');
const app = express();
const cors = require('cors');
app.use(cors());
const authRoutes = require('./routes/authRoutes');
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
app.use(express.json());
app.use('/auth', authRoutes);
const roleRoutes = require('./routes/roleRoutes');
app.use('/admin', roleRoutes);


app.get('/', (req, res) => {
    res.send('Authentication API running....');
});

module.exports = app;