const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
const { getConnection } = require('../config/db');

router.get('/', async (req, res) => {
  let connection;
  const month = req.query.month;
  const year = req.query.year;

  if (!month || !year) {
    return res.status(400).send('Missing month or year parameter');
  }

  try {
    connection = await getConnection();

    const result = await connection.execute(
  `WITH filtered_b_c_d AS (
    SELECT 
        b.isagdocno,
        b.isag113,
        b.isag002,
        c.isaf011,
        c.isaf003
    FROM isag_t b
    INNER JOIN isaf_t c 
        ON c.isafdocno = b.isagdocno
        AND c.isaf001 = '1'
    WHERE b.isagent = '666'
)
SELECT
    a.xcck006,
    TO_CHAR(h.XMDK001, 'DD/MM/YYYY') AS XMDK001,
    
    CASE 
            WHEN e.xmdgstus = 'X' THEN 'Voided'
            WHEN e.xmdgstus = 'Y' THEN 'Confirmed'
            WHEN e.xmdgstus = 'H' THEN 'Holding'
            ELSE e.xmdgstus
        END AS status_desc,
        
    a.xcck201,
    a.xcck202,
    bc.isag113,
    -- 1.(Gross Profit)
    (bc.isag113 - a.xcck202) AS GrossProfit,
    -- 2.(Gross Profit Rate %)
    CASE
        WHEN bc.isag113 = 0 THEN 0
        ELSE ((bc.isag113 - a.xcck202) / bc.isag113) * 100
    END AS GrossRate,
    d.xmdl001,
    TO_CHAR(e.XMDGDOCDT, 'DD/MM/YYYY') AS XMDGDOCDT,
   -- bc.isaf003,
    f.pmaal004,
    
    CASE
            WHEN g.xmdh015 = 'KG' THEN
         NVL(g.xmdh016, 0)/1000
        
        ELSE (
            NVL(TO_NUMBER(REGEXP_SUBSTR(g.xmdh015, '[0-9]+')), 0) / 1000
        ) * NVL(g.xmdh016, 0) 
        
        END AS calc_qty,
    
    g.xmdh023,
    SUBSTR(g.xmdh006, -6) AS xmdh006_last6,
    bc.isaf011
    
FROM xcck_t a
LEFT JOIN filtered_b_c_d bc
    ON bc.isag002 = a.xcck006
    
LEFT JOIN xmdl_t d
    ON a.xcck006 = d.xmdldocno
    AND d.xmdlent = '666'
    
LEFT JOIN xmdg_t e
    ON d.xmdl001  = e.xmdgdocno
    AND e.xmdgent = '666'
    
LEFT JOIN pmaal_t f
      ON bc.isaf003 = f.pmaal001
     AND f.pmaalent = '666'
     AND f.pmaal002 = 'en_US'
     
LEFT JOIN xmdh_t g
    ON e.xmdgdocno = g.xmdhdocno
     AND g.xmdhent = '666'
     
LEFT JOIN xmdk_t h
    ON a.xcck006 = h.xmdkdocno
    AND h.xmdkent = '666'
    
WHERE a.xcck004 = :year
  AND a.xcck005 = :month
  AND (a.xcck006 LIKE 'TS-SE%' OR a.xcck006 LIKE 'TS-SS%')
  AND a.xcckent = '666'
  
  ORDER BY a.xcck006 ASC`,
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