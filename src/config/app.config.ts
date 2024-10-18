export const allowedOrigins: string[] = [
  'https://react-chat-app-seven-murex.vercel.app',
  'https://react-chat-2j7vzifrp-jameswithleos-projects.vercel.app',
  'http://localhost:3000'
];

export const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allowed?: boolean) => void) {
    // Allow requests with no origin (like mobile apps, curl requests)
    if (!origin) return callback(null, true);

    // Check if the incoming origin is in the allowed origins
    if (allowedOrigins.includes(origin)) {
        callback(null, true); // Allow the request
    } else {
        callback(new Error(`Not allowed by CORS: ${origin}`)); // Reject the request
    }
  }, // Replace with your allowed origin
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Allowed HTTP methods
  credentials: true, // Allow credentials (cookies, authorization headers, etc.)
};