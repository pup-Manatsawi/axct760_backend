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
    a.xceb001,
    a.xceb002,
    a.xceb004,
    MAX(b.IMAAL003) AS IMAAL003,
    MAX(b.IMAAL004) AS IMAAL004,
    a.xceb110,
    MAX(name110.oocql004) AS xceb110_name,
    a.xceb108,
    MAX(c.OOEFL004) AS OOEFL004,
    a.xceb201,
    a.xceb202,
    MAX(d.INBA008) AS INBA008,
    MAX(e.inbb020) AS INBB020,
    MAX(f.ooff013) AS OOFF013
    
  FROM xcea_t m
  LEFT JOIN xceb_t a
    ON a.XCEBDOCNO = m.XCEADOCNO
  LEFT JOIN imaal_t b
    ON a.XCEB004 = b.IMAAL001
  LEFT JOIN ooefl_t c
    ON a.xceb108 = c.OOEFL001
  LEFT JOIN inba_t d
    ON a.XCEB001 = d.INBADOCNO
  LEFT JOIN glacl_t name101
    ON a.xceb101 = name101.glacl002 AND name101.glacl003 = 'en_US'
  LEFT JOIN oocql_t name110
    ON a.xceb110 = name110.oocql002 AND name110.OOCQL003 = 'en_US'
  LEFT JOIN inbb_t e
    ON a.XCEB001 = e.INBBDOCNO
  LEFT JOIN ooff_t f
     ON ooff002 = 'aint301'
    AND a.XCEB001 = f.ooff003
    AND a.XCEB002 = f.ooff004
    
  WHERE m.XCEA005 = :month
    AND m.XCEA004 = :year
    AND (a.XCEB001 LIKE 'TS-IN010%' OR a.XCEB001 LIKE 'TS-IN999%' OR a.XCEB001 LIKE 'TS-IN020%')
  GROUP BY
    a.xceb001,
    a.xceb002,
    a.xceb004,
    a.xceb110,
    a.xceb108,
    a.xceb201,
    a.xceb202`,
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