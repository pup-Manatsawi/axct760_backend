const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
const { getConnection } = require('../config/db');

router.get('/', async (req, res) => {
  let connection;

  try {
    connection = await getConnection();

    // 🔹 Bind Parameters เฉพาะค่าคงที่ของระบบ (ไม่ต้องมีวัน/เดือน/ปี)
    const binds = {
      ent: '666',
      site: 'TSIC',
      lang: 'en_US',
      pmab002: '3'
    };

    const sql = `
      SELECT
        a.pmab001,
        d.pmaal004,
        a.pmab005,
        a.pmab006,

        -- 🔹 คำนวณต้นทุน/ยอดสต็อกสะสม
        (a.pmab006 + NVL(b.xmac014, 0) + NVL(b.xmac016, 0) + NVL(b.xmac018, 0) + NVL(b.xmac020, 0))
        - NVL(b.xmac012, 0) - NVL(b.xmac015, 0) - NVL(b.xmac019, 0) AS calculated_cost,  

        -- 🔹 คำนวณยอดหลังหักยอดส่งของสะสม (นำผลรวม xmdg051 ทุกรายการที่เข้าเงื่อนไขมาลบ)
        (a.pmab006 + NVL(b.xmac014, 0) + NVL(b.xmac016, 0) + NVL(b.xmac018, 0) + NVL(b.xmac020, 0))
        - NVL(b.xmac012, 0) - NVL(b.xmac015, 0) - NVL(b.xmac019, 0) 
        - NVL(c.total_xmdg051, 0) AS CalShipping_cost

      FROM pmab_t a

      -- เชื่อมตาราง xmac_t (ยอดสต็อก/ต้นทุน)
      LEFT JOIN xmac_t b
        ON b.xmac001  = a.pmab001
       AND b.xmacent  = :ent
       AND b.xmacsite = :site

      -- เชื่อมตาราง xmdg_t แบบรวมยอดสะสมทั้งหมดที่สถานะเป็น 'N'
      LEFT JOIN (
        SELECT 
          xmdg005,
          SUM(NVL(xmdg051, 0)) AS total_xmdg051
        FROM xmdg_t
        WHERE xmdgstus = 'N'
          AND xmdgent  = :ent
          AND xmdgsite = :site
        GROUP BY xmdg005
      ) c
        ON c.xmdg005 = a.pmab001
          
      -- เชื่อมตาราง pmaal_t (ชื่อ/รายละเอียดสินค้า)
      LEFT JOIN pmaal_t d
        ON d.pmaal001 = a.pmab001
       AND d.pmaalent = :ent
       AND d.pmaal002 = :lang

      WHERE a.pmabsite = :site
        AND a.pmabent  = :ent
        AND a.pmab002  = :pmab002

      ORDER BY a.pmab001 ASC
    `;

    const result = await connection.execute(
      sql,
      binds,
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
