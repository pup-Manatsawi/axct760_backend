const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');

// 👉 pad function
const pad = (n) => n.toString().padStart(2, '0');

router.get('/', async (req, res) => {
  let connection;

  const { day, month, year } = req.query;

  // ✅ validate input
  if (!day || !month || !year) {
    return res.status(400).json({
      error: 'Missing day, month or year parameter'
    });
  }

  try {
    connection = await oracledb.getConnection({
      user: 'dsdata',
      password: 'dsdata',
      connectString: '192.168.21.100:1521/topprd'
    });

    // 👉 format date
    const fDay = pad(day);
    const fMonth = pad(month);
    const fYear = year.toString();

    const bindDate = `${fYear}${fMonth}${fDay}`;

    console.log('📅 Query Date:', bindDate);

    const sql = `
SELECT
    a.xmdgdocno,

    -- ✅ FORMAT วันที่ตรงนี้
    TO_CHAR(a.XMDGDOCDT, 'DD/MM/YYYY') AS XMDGDOCDT,
    TO_CHAR(a.XMDG028, 'DD/MM/YYYY') AS XMDG028,

    a.xmdg005,
    k.pmaal004,
    b.xmdh001,

    (
        NVL(TO_NUMBER(REGEXP_SUBSTR(b.xmdh015, '[0-9]+')), 0) / 1000
    ) * NVL(b.xmdh016, 0) AS calc_qty,
    
    ( 
        NVL(TO_NUMBER(REGEXP_SUBSTR(b.xmdh015, '[0-9]+')), 0) / 1000
    ) AS Unit,

    b.xmdh023,
    a.xmdg017,
    SUBSTR(b.xmdh006, -6) AS xmdh006_last6,
    
    h.xmdkdocno,

    CASE 
        WHEN a.xmdgstus = 'X' THEN 'Voided'
        WHEN a.xmdgstus = 'Y' THEN 'Confirmed'
        WHEN a.xmdgstus = 'H' THEN 'Holding'
        ELSE a.xmdgstus
    END AS status_desc,

    a.xmdg002,
    d.oofa011,
    e.ooefl003,
    b.xmdh006,
    f.imaal003,
    l.pmao009,
    l.pmao010,
    b.xmdh016,
    b.xmdh017,
    c.xmda033,
    g.oofb011,

    i_agg.isag002_list,

    (
        SELECT LISTAGG(DISTINCT j.isaf011, ', ')
        WITHIN GROUP (ORDER BY j.isaf011)
        FROM xmdk_t h2
        JOIN isag_t i2
            ON h2.xmdkdocno = i2.isag002
           AND h2.xmdk006  = i2.isag019
        JOIN isaf_t j
            ON i2.isagdocno = j.isafdocno
        WHERE h2.xmdk005 = a.xmdgdocno
          AND h2.xmdk006 = b.xmdh001
          AND h2.xmdkent = '666'
          AND j.isafent = '666'
    ) AS isaf011_list

FROM xmdg_t a

LEFT JOIN xmdh_t b
ON a.xmdgdocno = b.xmdhdocno
AND b.xmdhent = '666'

LEFT JOIN (
    SELECT xmdadocno, MAX(xmda033) AS xmda033
    FROM xmda_t
    GROUP BY xmdadocno
) c
ON b.xmdh001 = c.xmdadocno

LEFT JOIN oofa_t d
ON a.xmdg002 = d.oofa003
AND d.oofaent = '666'

LEFT JOIN ooefl_t e
ON a.xmdg003 = e.ooefl001
AND e.ooeflent = '666'
AND e.ooefl002 = 'en_US'

LEFT JOIN imaal_t f
ON b.xmdh006 = f.imaal001
AND f.imaalent = '666'
AND f.imaal002 = 'en_US'

LEFT JOIN (
    SELECT oofb019, MAX(oofb011) AS oofb011
    FROM oofb_t
    WHERE oofbent = '666'
    GROUP BY oofb019
) g
ON a.xmdg017 = g.oofb019

LEFT JOIN (
    SELECT *
    FROM (
        SELECT h.*,
               ROW_NUMBER() OVER (
                   PARTITION BY h.XMDK005, h.XMDK006
                   ORDER BY h.XMDK005
               ) rn
        FROM XMDK_T h
        WHERE h.xmdkent = '666'
    )
    WHERE rn = 1
) h
ON a.xmdgdocno = h.XMDK005
AND b.xmdh001 = h.XMDK006

LEFT JOIN (
    SELECT 
        h.xmdk005 AS docno,
        h.xmdk006 AS item,
        LISTAGG(DISTINCT i.isag002, ', ') 
        WITHIN GROUP (ORDER BY i.isag002) AS isag002_list
    FROM xmdk_t h
    JOIN isag_t i
        ON h.xmdkdocno = i.isag002
       AND h.xmdk006 = i.isag019
    WHERE h.xmdkent = '666'
    GROUP BY h.xmdk005, h.xmdk006
) i_agg
ON a.xmdgdocno = i_agg.docno
AND b.xmdh001 = i_agg.item

LEFT JOIN pmaal_t k
ON a.xmdg005 = k.pmaal001
AND k.pmaalent = '666'
AND k.pmaal002 = 'en_US'

LEFT JOIN pmao_t l
ON b.xmdh006 = l.pmao002
AND a.xmdg005 = l.pmao001
AND b.xmdh034 = l.pmao004
AND l.pmaoent = '666'

-- ✅ filter date (เร็ว)
WHERE a.xmdg028 >= TO_DATE(:dateStr, 'YYYYMMDD')
AND a.xmdg028 < TO_DATE(:dateStr, 'YYYYMMDD') + 1
AND a.xmdgent = '666'

ORDER BY a.xmdgdocdt ASC
`;

    const result = await connection.execute(
      sql,
      { dateStr: bindDate },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    console.log('✅ Rows:', result.rows.length);

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