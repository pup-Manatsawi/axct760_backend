const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');

router.get('/', async (req, res) => {
  let connection;

  const { startDate, endDate } = req.query;

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
    SELECT DISTINCT
    TO_CHAR(c.isaf014, 'DD Mon YYYY', 'NLS_DATE_LANGUAGE=ENGLISH') AS formatted_date,
    c.isaf011,

    CASE 
        WHEN c.isaf011 LIKE 'F%' THEN b.isag010
        ELSE b.isag017
    END AS isag017,

    CASE 
        WHEN c.isaf011 LIKE 'F%' THEN 'WASTE'
        ELSE f.pmao010
    END AS pmao010,

    c.isaf022,

    CASE
        WHEN e.pmaa006 IS NULL THEN 'HEAD OFFICE'
        WHEN e.pmaa006 = 'NULL' THEN 'HEAD OFFICE'               
        WHEN e.pmaa006 = 'R0001' THEN 'BRANCH NO.00001'
        WHEN e.pmaa006 = 'R0002' THEN 'BRANCH NO.00002'
        WHEN e.pmaa006 = 'R0003' THEN 'BRANCH NO.00003'
        WHEN e.pmaa006 = 'R0006' THEN 'BRANCH NO.00006'
        WHEN e.pmaa006 = 'R0007' THEN 'BRANCH NO.00007'
        ELSE 'ไม่พบสาขา'
    END AS BRANCH_NO,

    c.isaf021,
    c.isaf002,
    CASE 
    WHEN c.isaf011 LIKE 'CN%' OR c.isaf011 LIKE 'F%' THEN b.isag101
    ELSE d.xmdh023
END AS xmdh023,

CASE 
    WHEN c.isaf011 LIKE 'CN%' OR c.isaf011 LIKE 'F%' THEN b.isag103
    ELSE d.xmdh026
END AS xmdh026,

CASE 
    WHEN c.isaf011 LIKE 'CN%' OR c.isaf011 LIKE 'F%' THEN b.isag104
    ELSE d.xmdh028
END AS xmdh028,

CASE 
    WHEN c.isaf011 LIKE 'CN%' OR c.isaf011 LIKE 'F%' THEN b.isag105
    ELSE d.xmdh027
END AS xmdh027,

CASE 
    WHEN c.isaf011 LIKE 'CN%' OR c.isaf011 LIKE 'F%' THEN b.isag004
    ELSE d.xmdh021
END AS xmdh021,

    CASE 
        WHEN c.isaf011 LIKE 'F%' THEN xr.xrce_data
        WHEN c.isaf011 LIKE 'CN%' THEN a_cn.xmdl001
        ELSE a.xmdl001
    END AS xmdl001,
     ( 
   NVL(TO_NUMBER(REGEXP_SUBSTR(d.xmdh015, '[0-9]+')), 0) / 1000
   ) AS Unit,
   c.xmda033
   

FROM isaf_t c

LEFT JOIN isag_t b
    ON c.isafdocno = b.isagdocno

-- ????
LEFT JOIN xmdl_t a
    ON b.isag002 = a.xmdldocno

-- ? ?????? CN
LEFT JOIN xmdl_t a_cn
    ON a.xmdl001 = a_cn.xmdldocno

LEFT JOIN xmdh_t d
    ON a.xmdl001 = d.xmdhdocno

LEFT JOIN pmaa_t e
    ON e.pmaa001 = c.isaf002

LEFT JOIN pmao_t f
    ON f.pmao002 = b.isag009 
   AND f.pmao001 = c.isaf002 
   AND f.pmao004 = b.isag016

LEFT JOIN (
    SELECT 
        xrce054,
        LISTAGG(xrce003 || ',' || xrcedocno, ' | ') 
            WITHIN GROUP (ORDER BY xrce003) AS xrce_data
    FROM xrce_t
    GROUP BY xrce054
) xr
    ON xr.xrce054 = c.isaf011
    
-- xmda
LEFT JOIN (
    SELECT 
        xmdadocno,
        MAX(xmda033) AS xmda033
    FROM xmda_t
    GROUP BY xmdadocno
) c
ON d.xmdh001 = c.xmdadocno

WHERE c.isaf014 >= TO_DATE(:startDate, 'YYYYMMDD')
  AND c.isaf014 < TO_DATE(:endDate, 'YYYYMMDD') + 1
  AND c.isafstus = 'Y'


  ORDER BY 
    CASE 
        WHEN c.isaf011 LIKE 'D%' THEN 1
        WHEN c.isaf011 LIKE 'CN%' THEN 2
        WHEN c.isaf011 LIKE 'S%' THEN 3
        WHEN c.isaf011 LIKE 'F%' THEN 4
        ELSE 5
    END,
    c.isaf011;
    
    
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