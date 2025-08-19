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
    a.xcec001,
    a.xcec002,
    a.xcec004,
    MAX(b.IMAAL003) AS IMAAL003,
    MAX(b.IMAAL004) AS IMAAL004,
    a.xcec101,
    MAX(name101.GLACL004) AS xcec101_name,
    a.xcec110,
    MAX(name110.oocql004) AS xcec110_name,
    a.xcec201,
    a.xcec202,
    MAX(d.INBA008) AS INBA008
  FROM xcea_t m
  LEFT JOIN xcec_t a
      ON a.XCECDOCNO = m.XCEADOCNO
  LEFT JOIN imaal_t b
      ON a.XCEC004 = b.IMAAL001
  LEFT JOIN ooefl_t c
      ON a.xcec108 = c.OOEFL001
  LEFT JOIN inba_t d
      ON a.XCEC001 = d.INBADOCNO
  LEFT JOIN glacl_t name101
      ON a.xcec101 = name101.glacl002 AND name101.glacl003 = 'en_US'
  LEFT JOIN oocql_t name110
      ON a.xcec110 = name110.oocql002 AND name110.OOCQL003 = 'en_US'
  WHERE m.XCEA005 = :month
    AND m.XCEA004 = :year
    AND (a.XCEC001 LIKE 'TS-IN010%' OR a.XCEC001 LIKE 'TS-IN020%')
  GROUP BY
      a.xcec001,
      a.xcec002,
      a.xcec004,
      a.xcec101,
      a.xcec110,
      a.xcec201,
      a.xcec202`,
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