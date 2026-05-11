const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');

router.get('/', async (req, res) => {
  let connection;

  const { startDate, endDate } = req.query;


  if (!startDate || !endDate) {
    return res.status(400).json({
      error: 'Missing startDate or endDate'
    });
  }


  const isValidDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d);

  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    return res.status(400).json({
      error: 'Invalid date format (YYYY-MM-DD only)'
    });
  }


  if (startDate > endDate) {
    return res.status(400).json({
      error: 'startDate must be <= endDate'
    });
  }

  try {
    connection = await oracledb.getConnection({
      user: 'dsdata',
      password: 'dsdata',
      connectString: '192.168.21.100:1521/topprd'
    });

    const toOracleDate = (dateStr) => dateStr.replace(/-/g, '');

    const start = toOracleDate(startDate);
    const end = toOracleDate(endDate);

    console.log(`📅 Range: ${startDate} → ${endDate}`);

    const sql = `
    SELECT
    TO_CHAR(a.isaf014, 'DD Mon YYYY', 'NLS_DATE_LANGUAGE=ENGLISH') AS formatted_date,
    a.isaf011,

    CASE 
        WHEN a.isaf011 LIKE 'F%' THEN b.isag010
        ELSE b.isag017
    END AS isag017,

    CASE 
        WHEN a.isaf011 LIKE 'F%' THEN 'WASTE'
        ELSE d.pmao010
    END AS pmao010,

    a.isaf022,

    CASE
        WHEN c.pmaa006 IS NULL OR c.pmaa006 = 'NULL' THEN 'HEAD OFFICE'
        WHEN c.pmaa006 = 'R0001' THEN 'BRANCH NO.00001'
        WHEN c.pmaa006 = 'R0002' THEN 'BRANCH NO.00002'
        WHEN c.pmaa006 = 'R0003' THEN 'BRANCH NO.00003'
        WHEN c.pmaa006 = 'R0006' THEN 'BRANCH NO.00006'
        WHEN c.pmaa006 = 'R0007' THEN 'BRANCH NO.00007'
        ELSE 'NOT Match'
    END AS BRANCH_NO,

    a.isaf021,
    a.isaf002,

    b.isag101,

    SUM(b.isag103) AS isag103,
    SUM(b.isag104) AS isag104,
    SUM(b.isag105) AS isag105,

    b.isag004,

    CASE 
        WHEN a.isaf011 LIKE 'F%' THEN h.list_docno 
         WHEN a.isaf011 LIKE 'CN%' THEN b.isag014
        ELSE e.xmdl001
    END AS xmdl001,

    NVL(TO_NUMBER(REGEXP_SUBSTR(f.xmdh015, '[0-9]+', 1, 1)), 0) / 1000 AS Unit,

    g.xmda033

FROM isaf_t a

LEFT JOIN isag_t b
    ON a.isafdocno = b.isagdocno
    AND b.isagent = '666'

LEFT JOIN pmaa_t c
    ON a.isaf002 = c.pmaa001
    AND c.pmaaent = '666'

LEFT JOIN pmao_t d
    ON d.pmao002 = b.isag009
    AND d.pmao001 = a.isaf002
    AND d.pmao004 = b.isag016
    AND d.pmaoent = '666'

LEFT JOIN xmdl_t e
    ON b.isag002 = e.xmdldocno
    AND b.isag019 = e.xmdl003
    AND e.xmdlent = '666'

LEFT JOIN xmdh_t f
    ON e.xmdl001 = f.xmdhdocno
    AND e.xmdl003 = f.xmdh001
    AND f.xmdhent = '666'

LEFT JOIN (
    SELECT xrce054,
           LISTAGG(xrce003 || ',' || xrcedocno)
               WITHIN GROUP (ORDER BY xrcedocno) AS list_docno
    FROM xrce_t
    GROUP BY xrce054
) h
ON h.xrce054 = a.isaf011


LEFT JOIN (
    SELECT xmdadocno, MAX(xmda033) AS xmda033
    FROM xmda_t
    GROUP BY xmdadocno
) g
    ON f.xmdh001 = g.xmdadocno
    

WHERE a.isaf014 >= TO_DATE(:startDate, 'YYYYMMDD')
  AND a.isaf014 < TO_DATE(:endDate, 'YYYYMMDD') + 1
  AND a.isafstus = 'Y'

GROUP BY
    TO_CHAR(a.isaf014, 'DD Mon YYYY', 'NLS_DATE_LANGUAGE=ENGLISH'),
    a.isaf011,

    CASE 
        WHEN a.isaf011 LIKE 'F%' THEN b.isag010
        ELSE b.isag017
    END,

    CASE 
        WHEN a.isaf011 LIKE 'F%' THEN 'WASTE'
        ELSE d.pmao010
    END,

    a.isaf022,

    CASE
        WHEN c.pmaa006 IS NULL OR c.pmaa006 = 'NULL' THEN 'HEAD OFFICE'
        WHEN c.pmaa006 = 'R0001' THEN 'BRANCH NO.00001'
        WHEN c.pmaa006 = 'R0002' THEN 'BRANCH NO.00002'
        WHEN c.pmaa006 = 'R0003' THEN 'BRANCH NO.00003'
        WHEN c.pmaa006 = 'R0006' THEN 'BRANCH NO.00006'
        WHEN c.pmaa006 = 'R0007' THEN 'BRANCH NO.00007'
        ELSE 'NOT Match'
    END,

    a.isaf021,
    a.isaf002,
    b.isag101,
    b.isag004,

    CASE 
    WHEN a.isaf011 LIKE 'F%' THEN h.list_docno
    WHEN a.isaf011 LIKE 'CN%' THEN b.isag014
    ELSE e.xmdl001
END,

    NVL(TO_NUMBER(REGEXP_SUBSTR(f.xmdh015, '[0-9]+', 1, 1)), 0) / 1000,
    g.xmda033

ORDER BY 
CASE
    WHEN a.isaf011 LIKE 'DN%' THEN 2
    WHEN a.isaf011 LIKE 'D%' THEN 1
    WHEN a.isaf011 LIKE 'CN%' THEN 3
    WHEN a.isaf011 LIKE 'S%' THEN 4
    WHEN a.isaf011 LIKE 'F%' THEN 5
    ELSE 6
END,
saf011
    `;

    const result = await connection.execute(
      sql,
      { startDate: start, endDate: end },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    console.log(`🔢 Rows: ${result.rows.length}`);

    return res.json(result.rows);

  } catch (err) {
    console.error('❌ DB ERROR:', err);

    return res.status(500).json({
      error: 'Database error',
      detail: err.message
    });

  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('❌ Close error:', err);
      }
    }
  }
});

module.exports = router;