import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Render için SSL
});

client.connect()
  .then(() => console.log('Postgres DB connected!'))
  .catch(err => console.error('DB Connection Error', err));

export default client;
