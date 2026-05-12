const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');

router.get('/', async (req, res) => {
  let connection;

  const { startDate, endDate, apca004 } = req.query;

  // ✅ 1. check missing
  if (!startDate || !endDate) {
    return res.status(400).json({
      error: 'Missing startDate or endDate'
    });
  }

  // ✅ 2. check format YYYY-MM-DD
  const isValidDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d);

  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    return res.status(400).json({
      error: 'Invalid date format (YYYY-MM-DD only)'
    });
  }

  // ✅ 3. check range
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

    // ✅ convert format → YYYYMMDD
    const toOracleDate = (dateStr) => dateStr.replace(/-/g, '');

    const start = toOracleDate(startDate);
    const end = toOracleDate(endDate);

    console.log(`📅 Range: ${startDate} → ${endDate}`);

    const sql = `
    SELECT
    a.apcadocno,
     TO_CHAR(a.apcadocdt, 'DD/MM/YYYY') AS apcadocdt,
      
    CASE
        WHEN a.apca001 = '01' THEN '01:AP  Estimations'
        WHEN a.apca001 = '17' THEN '17:Invoice Payable'
        WHEN a.apca001 = '19' THEN '19:Other Payment Order'
        WHEN a.apca001 = '29' THEN '29:Other expect offset form'
        ELSE 'NOT Match'
    END AS BRANCH_NO,
    a.apca004,
    c.pmaal004,
    b.apcb002,
    b.apcb004,
    b.apcb005,
    SUM(b.apcb007*b.apcb022) AS apcb007,
    SUM(b.apcb101*b.apcb022) AS apcb101,
    SUM(b.apcb103*b.apcb022) AS apcb103,
    SUM(b.apcb104*b.apcb022) AS apcb104,
    SUM(b.apcb105*b.apcb022) AS apcb105,
    
    a.apca053,
    b.apcb028
    
    FROM apca_t a
    
    LEFT JOIN apcb_t b
    ON a.APCADOCNO = b.APCBDOCNO
    AND b.APCBENT = '666'
    
    LEFT JOIN pmaal_t c
    ON a.apca004 = c.pmaal001
    AND c.pmaalent = '666'
    AND c.pmaal002 = 'en_US'
    
    WHERE apcaent = '666'
    AND apcastus = 'Y'
   
    AND (:apca004 IS NULL OR a.apca004 = :apca004)
    AND a.apcadocdt >= TO_DATE(:startDate, 'YYYYMMDD')
    AND a.apcadocdt <  TO_DATE(:endDate, 'YYYYMMDD') + 1
   
   GROUP BY
    a.apcadocno,
    a.apcadocdt,
    CASE
        WHEN a.apca001 = '01' THEN '01:AP  Estimations'
        WHEN a.apca001 = '17' THEN '17:Invoice Payable'
        WHEN a.apca001 = '19' THEN '19:Other Payment Order'
        WHEN a.apca001 = '29' THEN '29:Other expect offset form'
        ELSE 'NOT Match'
    END,
    a.apca004,
    c.pmaal004,
    b.apcb002,
    b.apcb004,
    b.apcb005,
    b.apcb007,
    a.apca053,
    b.apcb028
    
    ORDER BY
    apcadocdt,
    apcadocno
    `;

    const result = await connection.execute(
      sql,
      { startDate: start, 
        endDate: end,
        apca004: apca004 },
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