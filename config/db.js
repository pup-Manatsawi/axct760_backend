const oracledb = require('oracledb');

let pool;

async function initPool() {
  try {
    pool = await oracledb.createPool({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectString: process.env.DB_CONNECT,
      poolMin: 2,
      poolMax: 10,
      poolIncrement: 1
    });

    console.log('✅ Oracle DB Pool created');
  } catch (err) {
    console.error('❌ Pool Error:', err);
    throw err;
  }
}

async function getConnection() {
  if (!pool) {
    throw new Error('Pool not initialized');
  }
  return await pool.getConnection();
}

module.exports = { initPool, getConnection };