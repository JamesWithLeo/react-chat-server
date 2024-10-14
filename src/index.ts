
import * as dotenv from "dotenv";
dotenv.configDotenv({ debug: true });
dotenv.config();

const port = process.env.PORT ?? 5000
import express, {json,Request, Response } from "express"
import cors from "cors"
import initiatePool from "./database";
import { isValidForSignin, IsValidForSignup } from "./validation";
const app = express()

app.use(json())
app.use(cors())
const pool = initiatePool()

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err)
  process.exit(-1)
})


app.route("/chats").get(async(req:Request, res:Response)=> {
  res.status(200).json({greet:"Hello, World!"})
})

app.post("/signin", async (req:Request, res:Response)=> {
  let client;
  try {
    const {email, uid} = req.body;
    const isValid = isValidForSignin({email,uid})

    if (!isValid) {
      res.status(400).send("contains invalid data.");
      return;
    }
    client = await pool.connect()
    const queryResponse = await client.query('SELECT * FROM users WHERE email = $1 AND uid = $2', [email, uid]);
    if (!queryResponse.rowCount) {
      res.status(401).send("Account doesnt't exist.");
      return;
    } 
    const user = queryResponse.rows[0]
    res.status(200).json({ok:1, user})
  } catch (error) {
    console.error('Error during query:', error);
    res.status(500).json()
  } finally {
    if (client) {
      client.release()
    }
  }
})

app.post("/signup", async(req:Request, res:Response)=> {
  let client;
  let { email, uid, phoneNumber, photoUrl, firstName, lastName } = req.body;


  console.log({ email, uid, phoneNumber, photoUrl, firstName, lastName });

  const isValid = IsValidForSignup({email, uid, phoneNumber, photoUrl, firstName, lastName});

  try {
    client = await pool.connect();
    if (!isValid) {
      res.status(400).send("Contains invalid data.");
      return;
    }

    // double checking, 
    // check whether the email and uid already exist .
    // The email and uid in the databse has already UNIQUE constraint.
    //  also keep in mind that the firebase auth in the client side is handling whether credential exist or not.
    const existQuery = await client.query('SELECT * FROM users WHERE email = $1 AND uid = $2', [email, uid]);
    if (existQuery.rowCount) {
      res.status(409).send("data already exist.")
    }

    const insertQuery = `
    INSERT INTO users (email, uid, phoneNumber, photoUrl, firstName, lastName)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;`;

    const queryResponse = await client.query(insertQuery, [email, uid, phoneNumber, photoUrl, firstName, lastName])
    const user = queryResponse.rows[0]
    console.log(user)
    res.status(200).json({ok:1, user})

  } catch (error) {
    console.log("Error during process:", error)
    res.status(500).json()
  } finally {
    if (client) client.release()
  }
})

app.post("/setup", async(req:Request, res:Response)=> {
  let client;
  const {firstName, lastName, gender, birthDate, email,} = req.body

  try {

    client = await pool.connect()
    const updateQuery = `
    UPDATE users
    SET firstName = $1, lastName = $2, gender = $3, birthDate = $4
    WHERE email = $5
    RETURNING *;
    `;

    const queryResponse = await client.query(updateQuery, [firstName, lastName, gender, birthDate, email])
    if (!queryResponse|| 
      queryResponse.rowCount !== 1
    ) {
      res.status(401).send("Account account cannot find.");
    }
    const user = queryResponse.rows[0]
    
    console.log(user)
    res.status(200).json({ok:1, user})

  } catch (error) {
    console.error(error)
    res.status(500).json({ok:0, error})
  } finally {
    if (client) client.release()
  }
})

app.listen(port,()=>{
  console.log(`listening at http://localhost:${port}`)
})
