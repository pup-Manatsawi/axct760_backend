const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// เชื่อมต่อ SQLite (จะสร้างไฟล์ database.sqlite ไว้ที่ root ของโปรเจกต์อัตโนมัติ)
const dbPath = path.resolve(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('Error opening QR database', err.message);
  else console.log('Connected to SQLite database for QR Code.');
});

// สร้างตารางเก็บประวัติ
db.run(`CREATE TABLE IF NOT EXISTS box_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  boxName TEXT,
  category TEXT,
  description TEXT,
  creator TEXT,
  date TEXT,
  expireDate TEXT
)`);

// 1. GET: ดึงข้อมูลทั้งหมด
router.get('/', (req, res) => {
  db.all(`SELECT * FROM box_history ORDER BY id DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 2. POST: เพิ่มข้อมูลใหม่
router.post('/', (req, res) => {
  const { boxName, category, description, creator, date, expireDate } = req.body;
  const sql = `INSERT INTO box_history (boxName, category, description, creator, date, expireDate) VALUES (?, ?, ?, ?, ?, ?)`;
  db.run(sql, [boxName, category, description, creator, date, expireDate], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, ...req.body });
  });
});

// 3. PUT: แก้ไขข้อมูล
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { boxName, category, description, creator, date, expireDate } = req.body;
  const sql = `UPDATE box_history SET boxName = ?, category = ?, description = ?, creator = ?, date = ?, expireDate = ? WHERE id = ?`;
  db.run(sql, [boxName, category, description, creator, date, expireDate, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: Number(id), ...req.body });
  });
});

// 4. DELETE: ลบข้อมูล
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM box_history WHERE id = ?`, id, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Deleted successfully', id });
  });
});

module.exports = router;