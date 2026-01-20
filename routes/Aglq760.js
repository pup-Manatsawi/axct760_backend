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
  `SELECT DISTINCT
      a.glaq002,
      d.glacl004,
      a.glaqdocno,
      TO_CHAR(b.glapdocdt, 'DD/MM/YYYY') AS glapdocdt,
      a.glaq018,
      c.ooefl004,
      COALESCE(e.apcadocno, f.XCEADOCNO) AS docno,
      a.glaq001,
      a.glaq003,
      a.glaq004
    FROM glaq_t a
    LEFT JOIN glap_t b ON a.glaqdocno = b.glapdocno
    LEFT JOIN ooefl_t c ON a.glaq018 = c.ooefl001
    LEFT JOIN (
      SELECT glacl002, glacl004
      FROM (
          SELECT glacl002, glacl004,
                 ROW_NUMBER() OVER (PARTITION BY glacl002 ORDER BY CASE WHEN glacl004 IS NOT NULL THEN 0 ELSE 1 END) AS rn
          FROM glacl_t
      ) WHERE rn = 1
    ) d ON TRIM(TO_CHAR(a.glaq002)) = TRIM(TO_CHAR(d.glacl002))
    LEFT JOIN (
      SELECT apca038, apcadocno
      FROM (
          SELECT apca038, apcadocno,
                 ROW_NUMBER() OVER (PARTITION BY apca038 ORDER BY apcadocno) AS rn
          FROM apca_t
      ) WHERE rn = 1
    ) e ON a.glaqdocno = e.apca038
    LEFT JOIN (
      SELECT XCEA101, XCEADOCNO
      FROM (
          SELECT XCEA101, XCEADOCNO,
                 ROW_NUMBER() OVER (PARTITION BY XCEA101 ORDER BY XCEADOCNO) AS rn
          FROM XCEA_t
      ) WHERE rn = 1
    ) f ON a.glaqdocno = f.XCEA101
    WHERE (a.glaq002 LIKE '6%' OR a.glaq002 LIKE '7%')
      AND TO_CHAR(b.glapdocdt, 'MM') = :month
      AND TO_CHAR(b.glapdocdt, 'YYYY') = :year
      AND (COALESCE(e.apcadocno, f.XCEADOCNO) NOT LIKE '%XC090%' OR COALESCE(e.apcadocno, f.XCEADOCNO) IS NULL)
      AND c.ooefl002 = 'en_US'
      AND b.glapstus = 'S'

    ORDER BY a.glaq002 ASC, TO_CHAR(b.glapdocdt, 'DD/MM/YYYY') ASC`,
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