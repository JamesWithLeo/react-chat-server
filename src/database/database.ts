import pg, { PoolClient } from "pg";
import * as dotenv from "dotenv";
dotenv.configDotenv({ debug: true });
dotenv.config();

if (
  !process.env.POSTGRES_USER ||
  !process.env.POSTGRES_HOST ||
  !process.env.POSTGRES_PASSWORD ||
  !process.env.POSTGRES_PORT ||
  !process.env.DATABASE_NAME
) {
  process.exit(1);
}

const initiatePool = () => {
  return new pg.Pool({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST,
    database: process.env.DATABASE_NAME,
    password: process.env.POSTGRES_PASSWORD,
    port: JSON.parse(process.env.POSTGRES_PORT!),
  });
};

export default initiatePool;

export type IMessage_type = "text" | "reply" | "doc" | "link" | "media";

export const QueryUsers = async (
  db: PoolClient,
  searchTerms: string[],
  excludedIds: string[],
  limit = "20",
  offset = "0",
) => {
  // Construct search conditions for first and last name
  const conditions =
    searchTerms.length > 0
      ? searchTerms
          .flatMap((name, index) => [
            `first_name ILIKE $${index * 2 + 1} OR last_name ILIKE $${index * 2 + 2}`,
          ])
          .join(" OR ")
      : ""; // Allow all if no search terms

  // Prepare values for the search terms
  const finalValues = searchTerms.flatMap((name) => [`%${name}%`, `%${name}%`]);

  // Add excluded IDs to final values

  // Build the SQL query
  const peopleSearchQuery = `
    SELECT id, first_name, last_name, email, photo_url, phone_number FROM users 
    ${conditions || excludedIds.length > 0 ? " WHERE " : ""}
    ${conditions ? ` (${conditions})` : ""}
    ${conditions && excludedIds.length > 0 ? " AND " : ""}  
    ${excludedIds.length > 0 ? `id NOT IN (${excludedIds.map((_, index) => `$${finalValues.length + index + 1}`).join(", ")})` : ""}
    LIMIT $${finalValues.length + excludedIds.length + 1} OFFSET $${finalValues.length + excludedIds.length + 2};
  `;

  finalValues.push(...excludedIds);
  // Add limit and offset to the end of final values
  finalValues.push(limit, offset);

  // Execute the query
  console.log("query:", peopleSearchQuery);
  console.log("values:", finalValues);

  const response = await db.query(peopleSearchQuery, finalValues);
  return response;
};

export const CheckConversation = async (
  db: PoolClient,
  senderId: string,
  recipientId: string,
) => {
  const query = `
  SELECT c.conversation_id FROM conversation c
  JOIN conversation_participants cp1 ON c.conversation_id = cp1.conversation_id
  JOIN conversation_participants cp2 ON c.conversation_id = cp2.conversation_id
  WHERE (cp1.user_id = $1 AND cp2.user_id = $2) 
   OR (cp1.user_id = $2 AND cp2.user_id = $1);
  `;

  const response = await db.query(query, [senderId, recipientId]);
  if (!response) {
    throw new Error("Failed to check conversation");
  }

  if (response && response.rows.length) {
    return response.rows[0];
  } else {
    return null;
  }
};

export const CreateConversation = async (
  db: PoolClient,
  senderId: string,
  recipientId: string,
  otherParticipants: string[],
  initialMessage: string,
  messageType: IMessage_type,
) => {
  let insertConversationQuery: string;
  let conversation_type;
  let conversationQueryResponse: pg.QueryResult<any>;
  if (!otherParticipants || !otherParticipants.length) {
    // direct message
    insertConversationQuery = `
    INSERT INTO conversation DEFAULT VALUES RETURNING conversation_id;
    `;
    conversation_type = "direct";
    conversationQueryResponse = await db.query(insertConversationQuery);
  } else {
    // group message
    insertConversationQuery = `
    INSERT INTO conversation (conversation_type) VALUES $1 RETURNING conversation_id;
    `;
    conversation_type = "group";
    conversationQueryResponse = await db.query(insertConversationQuery, [
      conversation_type,
    ]);
  }

  const conversation_id = conversationQueryResponse.rows[0].conversation_id;

  if (!conversation_id) {
    throw new Error("Cannot create conversation");
  }
  const participantIds = [senderId, recipientId, ...otherParticipants];

  const insertParticipantsQuery = `
  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES ${participantIds.map((_, index) => `($1, $${index + 2})`).join(", ")};
  `;
  const participantsParams = [conversation_id, ...participantIds];
  const participantsQueryResponse = await db.query(
    insertParticipantsQuery,
    participantsParams,
  );

  const insertMessageQuery = `
  INSERT INTO messages (conversation_id, sender_id, content, message_type)
  VALUES ($1, $2, $3, $4);
  `;

  const messageQueryResponse = await db.query(insertMessageQuery, [
    conversation_id,
    senderId,
    initialMessage,
    messageType,
  ]);
  console.log(participantsQueryResponse);
  console.log(messageQueryResponse);

  return conversation_id as string;
};

export const InsertMessage = async (
  db: PoolClient,
  conversation_id: string,
  senderId: string,
  message: string,
  messageType: IMessage_type,
) => {
  const insertMessageQuery = `
  INSERT INTO messages (conversation_id, sender_id, content, message_type)
  VALUES ($1, $2, $3, $4)
  RETURNING *;
  `;
  const messageQueryResponse = await db.query(insertMessageQuery, [
    conversation_id,
    senderId,
    message,
    messageType,
  ]);
  console.log(messageQueryResponse.rows);
  return messageQueryResponse.rows[0];
};

export const QueryConversation = async (db: PoolClient, user_id: string) => {
  // fetch the convo that user participate
  const convoParticipantQuery = `
  SELECT cp.conversation_id FROM conversation_participants cp
  WHERE user_id = $1 ;
  `;
  const convoParticipantsQueryResponse = await db.query(convoParticipantQuery, [
    user_id,
  ]);
  if (
    !convoParticipantsQueryResponse ||
    !convoParticipantsQueryResponse.rows.length
  ) {
    throw new Error("No conversation yet.");
  }
  // fetch the conversation details
  const conversation_ids = convoParticipantsQueryResponse.rows.map(
    (cp) => cp.conversation_id,
  );
  console.log(conversation_ids);

  // fetch the conversation messages
  const convoQuery = `
 SELECT 
    c.conversation_id, 
    c.conversation_name, 
    CASE 
        WHEN c.conversation_type = 'direct' THEN u.photo_url
        ELSE c.conversation_thumbnail
    END AS conversation_thumbnail,
    c.conversation_type,
    c.created_at, 
    c.updated_at,
    m.message_id AS last_message_id, 
    m.sender_id AS last_sender_id, 
    m.content AS last_message_content, 
    m.created_at AS last_message_created_at,
    CASE 
        WHEN c.conversation_type = 'direct' THEN 
            CONCAT(u.first_name, ' ', u.last_name) 
        ELSE NULL 
    END AS recipient_name,
    CASE 
        WHEN c.conversation_type = 'direct' THEN 
            u.id  -- Get the recipient's ID from the users table
        ELSE NULL 
    END AS recipient_id
FROM 
    conversation c
LEFT JOIN messages m ON m.message_id = (
    SELECT message_id 
    FROM messages 
    WHERE conversation_id = c.conversation_id 
    ORDER BY created_at DESC 
    LIMIT 1
)
LEFT JOIN conversation_participants cp ON cp.conversation_id = c.conversation_id 
LEFT JOIN users u ON u.id = cp.user_id 
WHERE 
    c.conversation_id = ANY($1::UUID[]) 
    AND cp.user_id != $2 
ORDER BY 
    c.updated_at DESC;


    `;
  const convoQueryResponse = await db.query(convoQuery, [
    conversation_ids,
    user_id,
  ]);
  if (!convoQueryResponse || !convoParticipantsQueryResponse.rows.length) {
    throw new Error("Failed to fetch conversation");
  }
  return convoQueryResponse.rows;
};
