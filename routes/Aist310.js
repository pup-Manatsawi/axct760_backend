const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
const { getConnection } = require('../config/db');

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
    connection = await getConnection();

    // ✅ convert format → YYYYMMDD
    const toOracleDate = (dateStr) => dateStr.replace(/-/g, '');

    const start = toOracleDate(startDate);
    const end = toOracleDate(endDate);

    console.log(`📅 Range: ${startDate} → ${endDate}`);

    const sql = `
         WITH b_agg AS (
    SELECT 
        isagdocno,
        isag004,
        isag010,
        isag017,
        isag014,
        isag015,
        isag009,
        isag016,
        isag002,
        isag019,
        isag101,
        SUM(isag103) AS isag103,
        SUM(isag104) AS isag104,
        SUM(isag105) AS isag105
    FROM isag_t
    WHERE isagent = '666'
    GROUP BY 
        isagdocno,
        isag004,
        isag010,
        isag017,
        isag014,
        isag015,
        isag009,
        isag016,
        isag002,
        isag019,
        isag101
),

e_agg AS (
    SELECT *
    FROM (
        SELECT 
            xmdldocno,
            xmdl003,
            xmdl017,
            xmdl001,
            ROW_NUMBER() OVER (
                PARTITION BY xmdldocno, xmdl003
                ORDER BY xmdl001 DESC
            ) rn
        FROM xmdl_t
        WHERE xmdlent = '666'
    )
    WHERE rn = 1
),
k_se AS (
    SELECT 
        xmdkdocno,
        xmdk005,
        xmdk006
    FROM xmdk_t
    WHERE xmdkent = '666'
    GROUP BY xmdkdocno, xmdk005,xmdk006
),

f_agg AS (
    SELECT *
    FROM (
        SELECT 
            xmdhdocno,
            xmdh001,
            xmdh015,
            ROW_NUMBER() OVER (
                PARTITION BY xmdhdocno, xmdh001
                ORDER BY xmdh015 DESC
            ) rn
        FROM xmdh_t
        WHERE xmdhent = '666'
    )
    WHERE rn = 1
),

g_agg AS (
    SELECT xmdadocno, xmda033
    FROM (
        SELECT 
            xmdadocno,
            xmda033,
            ROW_NUMBER() OVER (
                PARTITION BY xmdadocno 
                ORDER BY xmda033 DESC
            ) rn
        FROM xmda_t
    )
    WHERE rn = 1
),

h AS (
    SELECT xrce054,
           XMLAGG(
               XMLELEMENT(e, 
                   TO_CLOB(xrce003) || ',' || TO_CLOB(xrcedocno) || ','
               )
               ORDER BY xrcedocno
           ).getClobVal() AS list_docno
    FROM xrce_t
    GROUP BY xrce054
),
i_agg AS (
    SELECT 
        xmdkdocno,
        MAX(xmdk082) AS xmdk082
    FROM xmdk_t
    WHERE xmdkent = '666'
    GROUP BY xmdkdocno
),

 ooan_fix AS (
    SELECT 
        ooan004,
        ooan002,  
        LAST_VALUE(ooan005 IGNORE NULLS) 
        OVER (
            PARTITION BY ooan002   
            ORDER BY ooan004
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS ooan005
    FROM ooan_t
    WHERE ooanent = '666'
)

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
    
    MIN(
  CASE 
      WHEN b.isag015 = '-1' THEN -b.isag101
      ELSE b.isag101
  END
) AS isag101,
    
    SUM(
    CASE 
        WHEN b.isag015 = '-1' THEN -b.isag103
        ELSE b.isag103
    END
    )AS isag103,

 SUM(
    CASE 
        WHEN b.isag015 = '-1' THEN -b.isag104
        ELSE b.isag104
    END
    )AS isag104,
    
    SUM(
    CASE 
        WHEN b.isag015 = '-1' THEN -b.isag105
        ELSE b.isag105
    END
    )AS isag105,
    
    SUM(
    CASE
        WHEN TRIM(UPPER(a.isaf011)) LIKE 'CN%' 
             AND TRIM(i.xmdk082) IN ('1','2','3')
        THEN -NVL(b.isag004,0)
        WHEN TRIM(UPPER(a.isaf011)) LIKE 'W%' 
        AND b.isag015 = '-1' 
        THEN -NVL(b.isag004,0)
        
        ELSE NVL(b.isag004,0)
         
    END
) AS isag004,


    CASE 
        WHEN a.isaf011 LIKE 'F%' 
        THEN RTRIM(DBMS_LOB.SUBSTR(h.list_docno, 4000, 1), ',')
        WHEN e.xmdl001 LIKE 'TS-SS%' 
        THEN k.xmdk005
        ELSE e.xmdl001
    END
 AS xmdl001,
    
    CASE
        WHEN e.xmdl001 LIKE 'TS-SE%' THEN NVL(TO_NUMBER(REGEXP_SUBSTR(e.xmdl017, '[0-9]+', 1, 1)), 0) / 1000
        WHEN e.xmdl001 LIKE 'TS-SS%' THEN NVL(TO_NUMBER(REGEXP_SUBSTR(e.xmdl017, '[0-9]+', 1, 1)), 0) / 1000
        WHEN f.xmdh015 = 'KG' THEN 1
        ELSE NVL(TO_NUMBER(REGEXP_SUBSTR(f.xmdh015, '[0-9]+', 1, 1)), 0) / 1000 
        
        END AS Unit,
 CASE
        WHEN e.xmdl001 LIKE 'TS-SE%' THEN g.xmda033
        WHEN e.xmdl001 LIKE 'TS-SS%' THEN g.xmda033
        ELSE g.xmda033
    END As xmda033,
    
    CASE
        WHEN a.isaf100 = 'USD' THEN a.isaf101
        WHEN a.isaf100 = 'THB' THEN j.ooan005
        ELSE 0
    END As ooan005,
    
    

-----คำนวณเรทแบบใหม่ (ใช้ LATERAL JOIN แทน)------
    ROUND(
    CASE
    WHEN a.isaf100 = 'USD' THEN
        SUM(
            CASE 
                WHEN b.isag015 = '-1' THEN -NVL(b.isag103,0)
                ELSE NVL(b.isag103,0)
            END
        ) * NVL(NULLIF(a.isaf101,0),1)

    WHEN a.isaf100 = 'THB' THEN
        SUM(
            CASE 
                WHEN b.isag015 = '-1' THEN -NVL(b.isag103,0)
                ELSE NVL(b.isag103,0)
            END
        ) / NVL(NULLIF(j.ooan005,0),1)

    ELSE 0
END
,2) AS ratexx,
b.isag009,
n.imaa009,
m.imaf051

   

FROM isaf_t a

LEFT JOIN b_agg b
    ON a.isafdocno = b.isagdocno

LEFT JOIN pmaa_t c
    ON a.isaf002 = c.pmaa001
    AND c.pmaaent = '666'

LEFT JOIN pmao_t d
    ON d.pmao002 = b.isag009
    AND d.pmao001 = a.isaf002
    AND d.pmao004 = b.isag016
    AND d.pmaoent = '666'

LEFT JOIN e_agg e
    ON b.isag002 = e.xmdldocno
    AND b.isag019 = e.xmdl003

LEFT JOIN f_agg f
    ON e.xmdl001 = f.xmdhdocno
    AND e.xmdl003 = f.xmdh001



LEFT JOIN h
    ON h.xrce054 = a.isaf011
    
LEFT JOIN i_agg i
    ON b.isag002 = i.xmdkdocno
    
LEFT JOIN k_se k
    ON k.xmdkdocno = e.xmdl001
    
-- ✅ KEY ที่ถูก + ไม่เบิ้ล
LEFT JOIN g_agg g
    ON g.xmdadocno = f.xmdh001
    AND g.xmdadocno = k.xmdk006
    
    

------ จัดการเรื่องแสดงเรท -----
LEFT JOIN LATERAL (
     SELECT oo.ooan005, oo.ooan002
    FROM ooan_fix oo
    WHERE oo.ooan004 <= a.isaf014
      AND oo.ooan002 = 'USD'  
    ORDER BY oo.ooan004 DESC
    FETCH FIRST 1 ROW ONLY
) j ON 1=1

LEFT JOIN imaf_t m
    ON m.imaf001 = b.isag009
    AND imafent = '666'
    AND imafsite = 'TSIC'
    
LEFT JOIN imaa_t n
    ON n.imaa001 = b.isag009
    AND n.imaaent = '666'
    
WHERE a.isaf014 >= TO_DATE(:startDate, 'YYYYMMDD')
  AND a.isaf014 < TO_DATE(:endDate, 'YYYYMMDD') + 1
  AND a.isafstus = 'Y'
  AND a.isafent = '666'



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
    a.isaf101,
    a.isaf100,
    a.ISAFUA001,
    

   CASE 
        WHEN a.isaf011 LIKE 'F%' 
        THEN RTRIM(DBMS_LOB.SUBSTR(h.list_docno, 4000, 1), ',')
        WHEN e.xmdl001 LIKE 'TS-SS%' 
        THEN k.xmdk005
        ELSE e.xmdl001
    END,

     CASE
        WHEN e.xmdl001 LIKE 'TS-SE%' THEN NVL(TO_NUMBER(REGEXP_SUBSTR(e.xmdl017, '[0-9]+', 1, 1)), 0) / 1000
        WHEN e.xmdl001 LIKE 'TS-SS%' THEN NVL(TO_NUMBER(REGEXP_SUBSTR(e.xmdl017, '[0-9]+', 1, 1)), 0) / 1000
        WHEN f.xmdh015 = 'KG' THEN 1
        ELSE NVL(TO_NUMBER(REGEXP_SUBSTR(f.xmdh015, '[0-9]+', 1, 1)), 0) / 1000 
        
        END,
     j.ooan005,
     j.ooan002,
     CASE
        WHEN e.xmdl001 LIKE 'TS-SE%' THEN g.xmda033
        WHEN e.xmdl001 LIKE 'TS-SS%' THEN g.xmda033
        ELSE g.xmda033
    END,
    b.isag009,
    n.imaa009,
    m.imaf051

ORDER BY 
    a.isaf011
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