const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');

router.get('/', async (req, res) => {
  let connection;
  const month = req.query.month;
  const year = req.query.year;

  if (!month || !year) {
    return res.status(400).send('Missing month or year parameter');
  }

  try {
    connection = await oracledb.getConnection({
      user: 'dsdata',
      password: 'dsdata',
      connectString: '192.168.21.100:1521/topprd'
    });

    const result = await connection.execute(
  `SELECT 
    a.xcblcomp,
    a.xcblld,
    a.xcbl002,
    a.xcbl003,
    a.xcbl004,
    a.xcbl001,
    a.xcbl005,
    a.xcbl010,
    c.oocql004,
    a.xcbl012,
    b.ooefl003,
    a.xcbl100
  FROM xcbl_t a
  LEFT JOIN (
    SELECT ooefl001, ooefl003
    FROM (
      SELECT ooefl001, ooefl003,
             ROW_NUMBER() OVER (PARTITION BY ooefl001 ORDER BY ooefl001) rn
      FROM ooefl_t
    ) 
    WHERE rn = 1
  ) b ON b.ooefl001 = a.xcbl012
  LEFT JOIN (
    SELECT oocql002, oocql004
    FROM (
      SELECT oocql002, oocql004,
             ROW_NUMBER() OVER (PARTITION BY oocql002 ORDER BY oocql002) rn
      FROM oocql_t
    )
    WHERE rn = 1
  ) c ON c.oocql002 = a.xcbl010
  WHERE a.xcbl002 = :year
    AND a.xcbl003 = :month`,
  { month: parseInt(month), year: parseInt(year) }
);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Database error');
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) { console.error(err); }
    }
  }
});

module.exports = router;