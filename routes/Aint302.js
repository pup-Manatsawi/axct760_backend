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

    const startDate = new Date(year, month - 1, 1);
const endDate = new Date(year, month, 0);

const result = await connection.execute(
  `SELECT DISTINCT
      t2.ooefl003,
      t0.inba004,
      nvl(t0.inba008,' ') as inba008,
      nvl(bt.inbb020,' ') as inbb020,
      bt.inbb016,
      b2.oocql004,
      t0.inba002,
      t0.inba003,
      t0.inbadocno,
      t0.inbastus,
      t1.ooag011,
      t1.ooag003,
      bt.inbb001,
      imaal003,
      imaal004,
      bt.inbb010,
      bt.inbb012
   FROM inba_t t0
   LEFT JOIN ooag_t t1 ON t1.ooagent=666 AND t1.ooag001=t0.inba003
   LEFT JOIN ooefl_t t2 ON t2.ooeflent=666 AND t2.ooefl001=t0.inba004 AND t2.ooefl002='en_US'
   LEFT OUTER JOIN inbb_t bt ON t0.inbaent = bt.inbbent AND t0.inbadocno = bt.inbbdocno
   LEFT OUTER JOIN imaal_t ON imaal_t.imaal001 = bt.inbb001 AND imaal_t.imaalent = bt.inbbent AND imaal_t.imaal002 = 'en_US'
   LEFT OUTER JOIN oocql_t b2 ON b2.oocql001 = '216' and b2.oocqlent= bt.inbbent AND b2.oocql002 = bt.inbb016 AND b2.oocql003 = 'en_US'
   WHERE t0.inbaent = 666
     AND t0.inba002 BETWEEN :startDate AND :endDate
     AND t0.inbastus NOT IN ('X')
     AND t0.inba001 ='1'
   ORDER BY t0.inba004, t0.inba003`,
  { startDate, endDate }
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