const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');

router.get('/', async (req, res) => {
  let connection;

  const { month, year } = req.query;

  if (!month || !year) {
    return res.status(400).json({
      success: false,
      message: 'Missing month or year parameter'
    });
  }
    const startDate = `${year}-${month.padStart(2, '0')}-01`;
  try {
    connection = await oracledb.getConnection({
      user: 'dsdata',
      password: 'dsdata',
      connectString: '192.168.21.100:1521/topprd'
    });

    const sql = `
    SELECT DISTINCT
    TO_CHAR(c.isaf014, 'DD/MM/YYYY') AS formatted_date,
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
        NVL(TO_NUMBER(REGEXP_SUBSTR(d.xmdh015, '[0-9]+', 1, 1)), 0) / 1000
    ) AS Unit,

    g.xmda033

FROM isaf_t c

LEFT JOIN isag_t b
    ON c.isafdocno = b.isagdocno

-- xmdl หลัก
LEFT JOIN xmdl_t a
    ON b.isag002 = a.xmdldocno

-- xmdl สำหรับ CN (แก้ join ให้ตรง key มากขึ้น)
LEFT JOIN xmdl_t a_cn
    ON b.isag002 = a_cn.xmdldocno

-- 🔥 FIX: xmdh เอาแค่ 1 row ต่อ doc
LEFT JOIN (
    SELECT *
    FROM (
        SELECT d.*,
               ROW_NUMBER() OVER (PARTITION BY d.xmdhdocno ORDER BY d.xmdh001) rn
        FROM xmdh_t d
    )
    WHERE rn = 1
) d
    ON a.xmdl001 = d.xmdhdocno

LEFT JOIN pmaa_t e
    ON e.pmaa001 = c.isaf002

LEFT JOIN pmao_t f
    ON f.pmao002 = b.isag009 
   AND f.pmao001 = c.isaf002 
   AND f.pmao004 = b.isag016

-- xrce aggregate
LEFT JOIN (
    SELECT 
        xrce054,
        LISTAGG(xrce003 || ',' || xrcedocno, ' | ') 
            WITHIN GROUP (ORDER BY xrce003) AS xrce_data
    FROM xrce_t
    GROUP BY xrce054
) xr
    ON xr.xrce054 = c.isaf011

-- xmda aggregate
LEFT JOIN (
    SELECT 
        xmdadocno,
        MAX(xmda033) AS xmda033
    FROM xmda_t
    GROUP BY xmdadocno
) g
    ON d.xmdh001 = g.xmdadocno

WHERE c.isaf014 >= TO_DATE(:startDate,'YYYY-MM-DD')
  AND c.isaf014 < ADD_MONTHS(TO_DATE(:startDate,'YYYY-MM-DD'), 1)
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
      {
        month: month.padStart(2, '0'),
        year: year.toString()
      },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    return res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Database error',
      error: err.message
    });

  } finally {
    if (connection) {
      try { await connection.close(); } catch (e) {}
    }
  }
});

module.exports = router;