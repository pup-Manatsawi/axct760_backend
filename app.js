const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// นำ route ใหม่มาใช้
const aglq760Router = require('./routes/Aglq760');
app.use('/api/aglq760', aglq760Router);

const axct201Router = require('./routes/Axct201');
app.use('/api/axct201', axct201Router);

const axct707_6XXXRouter = require('./routes/Axct707_6XXX');
app.use('/api/axct707_6XXX', axct707_6XXXRouter);

const axct707_12XXRouter = require('./routes/Axct707_12XX');
app.use('/api/axct707_12XX', axct707_12XXRouter);

const aint302Router = require('./routes/Aint302');
app.use('/api/aint302', aint302Router);

// Serve React build
app.use(express.static(path.join(__dirname, 'build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(port, () => console.log(`Server running at http://localhost:${port}`));