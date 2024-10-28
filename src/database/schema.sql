-- CreateEnum
CREATE TYPE gender AS ENUM ('male', 'female', 'others');

-- CreateStatus 
CREATE TYPE status AS ENUM ('offline', 'online');

CREATE TYPE messages_type as ENUM ("text", "doc", "link", "reply", "media"
)
-- CreateTable
CREATE TABLE users (
  id UUID PRIMARY KEY NOT NULL,

  firstName VARCHAR(255),
  lastName VARCHAR(255),
  gender gender,
  status status,
  email VARCHAR(255) UNIQUE,  
  photoUrl VARCHAR(255),                
  createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, 
  lastLogin TIMESTAMP,
  uid VARCHAR(255) NOT NULL UNIQUE,
  photoUrl VARCHAR(255),
  birthDate DATE,
);


CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


CREATE TABLE conversation_participants (
  conversation_id UUID REFERENCES conversation(conversation_id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE, 
  joined_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  is_pinned BOOLEAN DEFAULT false,
  PRIMARY KEY (conversation_id, user_id)  -- Composite primary key
);

CREATE TYPE Conversation_type as ENUM ("direct", "group");

CREATE TABLE conversation (
  conversation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_type Conversation_type DEFAULT "direct",
  conversation_name VARCHAR(255),
  conversation_thumbnail VARCHAR(255)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);



CREATE TABLE messages (
  messages_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversation(conversation_id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  is_read BOOLEAN DEFAULT FALSE 
);
