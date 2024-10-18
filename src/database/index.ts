import pg from "pg";
import * as dotenv from "dotenv";
dotenv.configDotenv({ debug: true });
dotenv.config();

if (!process.env.POSTGRES_USER || !process.env.POSTGRES_HOST || !process.env.POSTGRES_PASSWORD || !process.env.POSTGRES_PORT || !process.env.DATABASE_NAME) {
  process.exit(1)
}

const initiatePool = () => {
  return new pg.Pool({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST,
    database: process.env.DATABASE_NAME,
    password: process.env.POSTGRES_PASSWORD,
    port: JSON.parse(process.env.POSTGRES_PORT!), 
  })
}
export default initiatePool
