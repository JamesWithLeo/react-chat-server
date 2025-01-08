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
export type IConversationType = "direct" | "group";

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
      SELECT 
        u.id AS id, 
        u.first_name AS "firstName", 
        u.last_name AS "lastName", 
        u.email AS "email", 
        u.photo_url AS "photoUrl", 
        u.phone_number AS "phoneNumber" 
    FROM users u
    ${conditions || excludedIds.length > 0 ? " WHERE " : ""}
    ${conditions ? ` (${conditions})` : ""}
    ${conditions && excludedIds.length > 0 ? " AND " : ""}
    ${excludedIds.length > 0 ? `u.id NOT IN (${excludedIds.map((_, index) => `$${finalValues.length + index + 1}`).join(", ")})` : ""}
    LIMIT $${finalValues.length + excludedIds.length + 1} OFFSET $${finalValues.length + excludedIds.length + 2};

  `;

  finalValues.push(...excludedIds);
  // Add limit and offset to the end of final values
  finalValues.push(limit, offset);

  // Execute the query
  // console.log("query:", peopleSearchQuery);
  // console.log("values:", finalValues);

  const response = await db.query(peopleSearchQuery, finalValues);
  return response.rows;
};

// if conversation ID doesn't exist, it will create one
export const getConversationId = async ({
  db,
  senderId,
  recipientId,
}: {
  db: PoolClient;
  senderId: string;
  recipientId: string;
}) => {
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
    return response.rows[0].conversation_id;
  } else {
    const insertConversationQuery = `
   WITH new_conversation AS (
        INSERT INTO conversation DEFAULT VALUES 
        RETURNING conversation_id
    )
    INSERT INTO conversation_participants (conversation_id, user_id)
    SELECT new_conversation.conversation_id, unnest($1::uuid[])
    FROM new_conversation
    RETURNING conversation_id;
    
    `;
    const participantIds = [senderId, recipientId];
    const conversationQueryResponse = await db.query(insertConversationQuery, [
      participantIds,
    ]);
    console.log("new conversation:", conversationQueryResponse.rows);
    const conversation_id = conversationQueryResponse.rows[0].conversation_id;

    if (!conversation_id) {
      throw new Error("Cannot create conversation");
    } else {
      return conversation_id;
    }
  }
};

export const getUserConversationId = async ({
  db,
  userId,
}: {
  userId: string;
  db: PoolClient;
}) => {
  const query = `
  SELECT conversation_id FROM conversation_participants WHERE user_id = $1;
  `;
  const response = await db.query(query, [userId]);
  if (!response) {
    throw new Error("Failed to check conversation");
  }
  if (response.rowCount) return response.rows;
  else return [];
};

// this func will add a new message to new conversation
export const createConversationWithMessage = async ({
  db,
  userId,
  peerId,
  initialContent,
  contentType,
  conversation_type,
}: {
  db: PoolClient;
  userId: string;
  peerId: string[];
  initialContent: string;
  contentType: IMessage_type;
  conversation_type: "direct" | "group";
}) => {
  let insertConversationQuery: string;
  let conversationQueryResponse: pg.QueryResult<any>;
  if (conversation_type === "direct" && peerId.length === 1) {
    insertConversationQuery = `
    INSERT INTO conversation DEFAULT VALUES RETURNING conversation_id;
    `;
    conversationQueryResponse = await db.query(insertConversationQuery);
  } else {
    // group message
    insertConversationQuery = `
    INSERT INTO conversation (conversation_type) VALUES ($1) RETURNING conversation_id;
    `;
    conversationQueryResponse = await db.query(insertConversationQuery, [
      conversation_type,
    ]);
  }

  const conversation_id = conversationQueryResponse.rows[0].conversation_id;
  if (!conversation_id) {
    throw new Error("Cannot create conversation");
  }
  const participantIds = [userId, ...peerId];

  const insertParticipantsQuery = `
    INSERT INTO conversation_participants (conversation_id, user_id)
    SELECT $1, unnest($2::uuid[])
  `;

  const participantsParams = [conversation_id, participantIds];

  const participantsQueryResponse = await db.query(
    insertParticipantsQuery,
    participantsParams,
  );

  const insertMessageQuery = `
  INSERT INTO messages (conversation_id, sender_id, content, message_type)
  VALUES ($1, $2, $3, $4)
  RETURNING *;
  `;

  const messageQueryResponse = await db.query(insertMessageQuery, [
    conversation_id,
    userId,
    initialContent,
    contentType,
  ]);

  return messageQueryResponse.rows[0];
};

// this function will add a new message to existing conversation
export const InsertMessage = async (
  db: PoolClient,
  conversation_id: string,
  userId: string,
  content: string,
  contentType: IMessage_type,
) => {
  const insertMessageQuery = `
  INSERT INTO messages (conversation_id, sender_id, content, message_type)
  VALUES ($1, $2, $3, $4)
  RETURNING *;
  `;

  const messageQueryResponse = await db.query(insertMessageQuery, [
    conversation_id,
    userId,
    content,
    contentType,
  ]);
  console.log(messageQueryResponse.rows);
  return messageQueryResponse.rows[0];
};

const getGroupConversationId = async ({
  db,
  userId: user_id,
  peerId: peer_id,
}: {
  db: PoolClient;
  userId: string;
  peerId: string;
}) => {
  const searchConversationId = `
  SELECT cp.conversation_id
  FROM conversation_participants cp
  JOIN conversation c ON cp.conversation_id = c.conversation_id
  WHERE cp.user_id IN ($1, $2)
    AND c.conversation_type = 'direct'
  GROUP BY cp.conversation_id
  HAVING COUNT(DISTINCT cp.user_id) = 2;
  `;

  const searchResponse = await db.query(searchConversationId, [
    user_id,
    peer_id,
  ]);

  if (searchResponse && searchResponse.rows[0]) {
    return searchResponse.rows[0].conversation_id;
  } else {
    return null;
  }
};

export const QueryConversation = async (db: PoolClient, userId: string) => {
  // fetch the convo that user participate
  const convoParticipantQuery = `
  SELECT cp.conversation_id FROM conversation_participants cp
  WHERE user_id = $1 ;
  `;
  const convoParticipantsQueryResponse = await db.query(convoParticipantQuery, [
    userId,
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

  // fetch the conversation messages

  const conversationIdsResponse = await getUserConversationId({ db, userId });
  // console.log("available convos:", conversationIdsResponse);
  // get all conversation rows for user
  const conversationQuery = `
 SELECT 
  c.*,
  JSON_AGG(
    JSON_BUILD_OBJECT(
      'id', cp.user_id,
      'photoUrl',  u.photo_url,
      'lastName',  u.last_name,
      'firstName', u.first_name,
      'isOnline',  false,
			'isTyping',  false
    )
  ) FILTER (WHERE cp.user_id != $2) AS peers,
  (
    SELECT 
      JSON_BUILD_OBJECT(
        'content', m.content, 
        'created_at', m.created_at, 
        'message_type', m.message_type
      
      )
    FROM 
      messages m 
    WHERE 
      m.conversation_id = c.conversation_id 
    ORDER BY 
      m.created_at DESC 
    LIMIT 1
  ) AS last_message,
   cp_current.is_archived,
   cp_current.is_pinned
FROM 
  conversation c
LEFT JOIN 
  conversation_participants cp 
ON 
  c.conversation_id = cp.conversation_id
LEFT JOIN 
  users u 
ON 
  cp.user_id = u.id
LEFT JOIN 
  conversation_participants cp_current 
ON 
  c.conversation_id = cp_current.conversation_id AND cp_current.user_id = $2
WHERE 
  c.conversation_id = ANY($1::uuid[])
GROUP BY 
  c.conversation_id, cp_current.is_archived, cp_current.is_pinned;

`;

  const conversationIds = conversationIdsResponse.map(
    (convo) => convo.conversation_id,
  );
  const conversationRows = await db.query(conversationQuery, [
    conversationIds,
    userId,
  ]);

  return conversationRows.rows;
};

export const QueryMessage = async ({
  db,
  userId,
  searchTerms,
}: {
  db: PoolClient;
  userId: string;
  searchTerms: string;
}) => {
  const QueryMessage = `
  SELECT 
    c.*,
    COALESCE(
      JSON_AGG(
        JSON_BUILD_OBJECT(
          'id', cp.user_id,
          'photoUrl', u.photo_url,
          'lastName', u.last_name,
          'firstName', u.first_name,
          'isOnline', false,
          'isTyping', false
        )
      ) FILTER (WHERE cp.user_id != $1), 
      '[]'::json -- Ensure peers is an empty array if no other participants are found
    ) AS peers,
    (
      SELECT 
        JSON_BUILD_OBJECT(
          'content', m.content, 
          'created_at', m.created_at, 
          'message_type', m.message_type
        )
      FROM 
        messages m 
      WHERE 
        m.conversation_id = c.conversation_id 
        AND m.content ILIKE $2
        AND TRIM(m.content) != '' -- Exclude empty or whitespace-only messages
      ORDER BY 
        m.created_at DESC 
      LIMIT 1
    ) AS last_message
  FROM 
    conversation c
  LEFT JOIN 
    conversation_participants cp 
  ON 
    c.conversation_id = cp.conversation_id
  LEFT JOIN 
    users u 
  ON 
    cp.user_id = u.id
  WHERE 
    c.conversation_id IN (
      SELECT conversation_id 
      FROM conversation_participants 
      WHERE user_id = $1 -- Ensure the user is a participant in the conversation
    )
  GROUP BY 
    c.conversation_id;
`;

  const messageQueryResponse = await db.query(QueryMessage, [
    userId,
    `%${searchTerms}%`,
  ]);
  console.log("message query response: ", messageQueryResponse.rows);
  return messageQueryResponse.rows;
};

export const PinnedConversation = async ({
  db,
  isPinned,
  userId,
  conversationId,
}: {
  db: PoolClient;
  isPinned: boolean;
  userId: string;
  conversationId: string;
}) => {
  const pinQuery = `
  UPDATE conversation_participants 
  SET is_pinned = $1
  WHERE user_id = $2 AND conversation_id = $3
  RETURNING is_pinned;
  `;

  const pinResponse = await db.query(pinQuery, [
    isPinned,
    userId,
    conversationId,
  ]);

  if (pinResponse && pinResponse.rows[0]) {
    return !!pinResponse.rows[0].is_pinned;
  } else {
    return false;
  }
};

export const ArchiveConversation = async ({
  db,
  isArchived,
  userId,
  conversationId,
}: {
  db: PoolClient;
  isArchived: boolean;
  userId: string;
  conversationId: string;
}) => {
  const pinQuery = `
  UPDATE conversation_participants 
  SET is_archived = $1
  WHERE user_id = $2 AND conversation_id = $3
  RETURNING is_archived;
  `;

  const archivedResponse = await db.query(pinQuery, [
    isArchived,
    userId,
    conversationId,
  ]);

  if (archivedResponse && archivedResponse.rows[0]) {
    return !!archivedResponse.rows[0].is_archived;
  } else {
    return false;
  }
};

export const SeenMessage = async ({
  db,
  conversationId,
  messageId,
  userId,
  seenAt,
}: {
  db: PoolClient;
  conversationId: string;
  messageId: string;
  userId: string;
  seenAt: string;
}) => {
  const query = `
    INSERT INTO last_seen (user_id, conversation_id, message_id, seen_at)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (user_id, conversation_id) 
    DO UPDATE SET 
    message_id = EXCLUDED.message_id,
    seen_at = EXCLUDED.seen_at
    RETURNING *;
  `;
  const response = await db.query(query, [
    userId,
    conversationId,
    messageId,
    seenAt,
  ]);
  return response.rows;
};

export const createConversation = async ({
  db,
  userId,
  peerId,
  conversationName,
  conversationType,
}: {
  db: PoolClient;
  userId: string;
  peerId: string[];
  conversationName: string;
  conversationType: "direct" | "group";
}) => {
  if (conversationType === "direct" && peerId.length === 1) {
    // direct
  } else if (
    conversationType === "group" &&
    Array.isArray(peerId) &&
    peerId.length > 1
  ) {
    const insertConversationAndParticipants = `
      WITH inserted_conversation AS (
        INSERT INTO conversation (conversation_name, conversation_type) 
        VALUES ($1, $2) 
        RETURNING conversation_id
      )
      INSERT INTO conversation_participants (conversation_id, user_id)
      SELECT inserted_conversation.conversation_id, unnest($3::uuid[])
      FROM inserted_conversation;
        `;

    const conversationQueryResponse = await db.query(
      insertConversationAndParticipants,
      [conversationName, conversationType, [userId, ...peerId]],
    );
    console.log(conversationQueryResponse.rows);
  } else {
    // fialed
  }
};
