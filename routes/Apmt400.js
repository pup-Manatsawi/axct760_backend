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
    SELECT
        b.pmdl004,
        j.pmaal004,
        a.pmda003,
        k.ooefl003,
        l.ooag011,
        a.pmdadocno,
        a.pmdadocdt,
        d.total_pmdb006,
        a.pmda022,
        b.pmdldocno,
        b.pmdldocdt,
        SUM(c.pmdo033) AS total_pmdo033,
        b.pmdl015,
        c.pmdoseq,
        c.pmdo011,
        c.pmdo012,
        f.apca018,
        f.apcadocno,
        f.apca066,
        m.isam011,
        m.isam025,
        m.isam014,
        f.apca038,
        f.apcadocdt,
        f.apca103,
        f.apca104,
        f.apca106,
        f.apca108,
        f.apca010,
        CASE
            WHEN h.apdastus = 'Y' THEN 'Confirmed'
            WHEN h.apdastus = 'X' THEN 'Voided'
            WHEN h.apdastus = 'N' THEN 'Not Confirmed'
            WHEN h.apdastus = 'A' THEN 'Approved'
            WHEN h.apdastus = 'D' THEN 'Withdraw'
            WHEN h.apdastus = 'R' THEN 'Rejected'
            WHEN h.apdastus = 'W' THEN 'Approving'
            ELSE ''
        END AS APDASTUS,
    
        h.apdadocno,
        h.apda014,
        h.apdadocdt,
        n.apce119,
    
        CASE
            WHEN i.apde006 = '10' THEN '10:Cash and On-Demand Remittance'
            WHEN i.apde006 = '20' THEN '20:Bank Remittance'
            WHEN i.apde006 = '30' THEN '30:Note Type'
            WHEN i.apde006 = '40' THEN '40:Valuable coupons (vouchers) Type'
            WHEN i.apde006 = '50' THEN '50:Bank Card/Credit Card'
            WHEN i.apde006 = '60' THEN '60:Value-Added Type'
            WHEN i.apde006 = '70' THEN '70:Bank L/C'
            WHEN i.apde006 = '90' THEN '90:Other type'
            WHEN i.apde006 = '91' THEN '91:Sell on Credit'
            WHEN i.apde006 = '92' THEN '92:Cashier Collection'
            WHEN i.apde006 = '80' THEN '80:Third party payment'
            WHEN i.apde006 = '99' THEN '99:Repayment of Pledge Note Cashing'
            WHEN i.apde006 = '94' THEN '94:Advance Collection'
            ELSE ''
        END AS APDE006,
    
        i.apde008,
        i.apde039,
        i.apde040,
        n.apce010
   
        FROM pmda_t a
     
        LEFT JOIN pmdl_t b
        ON b.pmdl008 = a.pmdadocno
        AND b.pmdlent = '666'
        AND b.PMDL019 = 'Y'

        LEFT JOIN pmdo_t c
        ON c.pmdodocno = b.pmdldocno
        AND c.pmdoent = '666'
     
        LEFT JOIN (
            SELECT 
                pmdbdocno, 
                SUM(pmdb006) AS total_pmdb006
            FROM pmdb_t
            WHERE pmdbent = '666'
            GROUP BY pmdbdocno
                ) d ON d.pmdbdocno = a.pmdadocno

        LEFT JOIN apcb_t e
         ON e.apcb008 = b.pmdldocno
        AND e.apcbent = '666'

        LEFT JOIN apca_t f
         ON f.apcadocno = e.apcbdocno
        AND f.apcaent = '666'
        AND f.APCASTUS = 'Y'

        LEFT JOIN apce_t g
         ON g.apce003 = f.apcadocno
        AND g.apceent = '666'

        LEFT JOIN apda_t h
         ON h.apdadocno = g.apcedocno
        AND h.apdaent = '666'
        AND h.APDASTUS = 'Y'

        LEFT JOIN apde_t i
         ON i.apdedocno = h.apdadocno
        AND i.apdeent = '666'
        AND i.apde009 = 'Y'

        LEFT JOIN pmaal_t j
            ON j.pmaal001 = b.pmdl004
            AND j.pmaalent = '666'
            AND j.pmaal002 = 'en_US'

        LEFT JOIN ooefl_t k
            ON k.ooefl001 = a.pmda003
            AND k.ooeflent = '666'
            AND k.ooefl002 = 'en_US'

        LEFT JOIN ooag_t l
            ON l.ooag001 = a.pmda002
            AND l.ooagent = '666'

        LEFT JOIN isam_t m
            ON m.isam010 = f.apca066
            AND m.isament = '666'
            AND m.isamstus = 'Y'

        LEFT JOIN apce_t n
            ON n.apcedocno = h.apdadocno
            AND n.apce003 = f.apcadocno
            AND n.apce024 = f.apca018
            AND n.apceent = '666'
     
  where a.pmdadocdt >= TO_DATE(:startDate, 'YYYYMMDD')
    AND a.pmdadocdt < TO_DATE(:endDate, 'YYYYMMDD') + 1
    AND a.pmdastus = 'Y'
    AND a.pmdaent = '666'

  
  GROUP BY 
    b.pmdl004,
    j.pmaal004,
    a.pmda003,
    k.ooefl003,
    l.ooag011,
    a.pmdadocno,
    a.pmdadocdt,
    d.total_pmdb006,
    a.pmda022,
    b.pmdldocno,
    b.pmdldocdt,
    b.pmdl015,
    c.pmdoseq,
    c.pmdo011,
    c.pmdo012,
    f.apca018,
    f.apcadocno,
    f.apca066,
    m.isam011,
    m.isam025,
    m.isam014,
    f.apca038,
    f.apcadocdt,
    f.apca103,
    f.apca104,
    f.apca106,
    f.apca108,
    f.apca010,
    APDASTUS,
    h.apdadocno,
    h.apda014,
    h.apdadocdt,
    n.apce119,
    APDE006,
    i.apde008,
    i.apde039,
    i.apde040,
    n.apce010
    
    
    ORDER BY 
    a.pmdadocno,
    f.apca018;


       
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