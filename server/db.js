import pg from 'pg'

const { Pool } = pg

if (!process.env.DATABASE_URL) {
  console.warn(
    '[db] DATABASE_URL não definido — defina no .env antes de subir a API.'
  )
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
})

pool.on('error', (err) => {
  console.error('[db] erro inesperado em conexão ociosa:', err)
})
``