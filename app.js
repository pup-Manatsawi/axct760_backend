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

const axmr009Router = require('./routes/Axmr009');
app.use('/api/axmr009', axmr009Router);

const aist310Router = require('./routes/Aist310');
app.use('/api/aist310', aist310Router);

const aist310_1XRouter = require('./routes/Aist310_1X');
app.use('/api/aist310_1X', aist310_1XRouter);

const aist310_2XRouter = require('./routes/Aist310_2X');
app.use('/api/aist310_2X', aist310_2XRouter);

// Serve React build
app.use(express.static(path.join(__dirname, 'build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(port, () => console.log(`Server running at http://localhost:${port}`));