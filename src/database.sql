-- CreateEnum
CREATE TYPE gender AS ENUM ('male', 'female', 'others');

-- CreateStatus 
CREATE TYPE status AS ENUM ('offline', 'online');

-- CreateTable
CREATE TABLE users (
  id SERIAL PRIMARY KEY NOT NULL,
  firstName VARCHAR(255),
  lastName VARCHAR(255),
  gender gender,
  status status,
  email VARCHAR(255) NOT NULL UNIQUE,  
  photoUrl VARCHAR(255),                
  createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, 
  lastLogin TIMESTAMP,
  uid VARCHAR(255) NOT NULL UNIQUE,
  photoUrl VARCHAR(255),
  birthDate Date,
);