import express ,{Request,Response} from "express";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js"
import { z } from "zod";
import cors from 'cors'
import { TwitterApi } from 'twitter-api-v2';

// Define environment variables for Twitter API credentials
// const consumerKey =hello
// const consumerSecret = hello
// const accessToken = hello
// const accessTokenSecret =
const client = new TwitterApi({
  appKey: "01IEO3599yPeWdx6ITbZlXz1q",
  appSecret:  "gqhw56pToq3iqcZsj1EyPc1PzhIgABE0MstK9lHkgLMhnMrKQ8",
  accessToken: "1748953214387417088-U9UiIdDpxr21oUgWpY3lSRAVFzjuc5",
  accessSecret: "MlKtjtVOBlzE5k7SplAvUeOMnXmpHtPF6WzW0HmYhr2TW"
});

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: "*",
    optionsSuccessStatus: 200, // For legacy browser support
  }),
);

// Function to create OAuth 1.0a header

const getServer = () => {
    const server = new McpServer({ name: 'stateless-server', version: '1.0.0' });
    server.tool(
        "echo",
        { message: z.string() },
        async ({ message }) => ({
          content: [{ type: "text", text: `Tool echo: ${message}` }]
        })
      );


      server.tool('post_tweet', { text: z.string().min(1).max(280)}, async ({ text }) => {
        try {
          const response = await client.v2.tweet(text);
          console.log('Tweet posted successfully:', response.data);
          return {
            content: [
              {
                type: 'text',
                text: `Tweet posted successfully: https://twitter.com/user/status/${response.data.id}`,
              },
            ],
          };
        } catch (error: any) {
          console.error('Error posting tweet:', error);
          return {
            content: [
              {
                type: 'text',
                text: `Error posting tweet: ${error.message}`,
              },
            ],
          };
        }
      });


    return server;
  };



app.post('/mcp', async (req: Request, res: Response) => {
  // In stateless mode, create a new instance of transport and server for each request
  // to ensure complete isolation. A single instance would cause request ID collisions
  // when multiple clients connect concurrently.
  
  try {
    const server = getServer(); 
    const transport: StreamableHTTPServerTransport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
    res.on('close', () => {
      console.log('Request closed');
      transport.close();
      server.close();
    });
  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      });
    }
  }
});

app.get('/mcp', async (req: Request, res: Response) => {
  console.log('Received GET MCP request');
  res.writeHead(405).end(JSON.stringify({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Method not allowed."
    },
    id: null
  }));
});

app.delete('/mcp', async (req: Request, res: Response) => {
  console.log('Received DELETE MCP request');
  res.writeHead(405).end(JSON.stringify({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Method not allowed."
    },
    id: null
  }));
});


// Start the server
const PORT = 3002;
app.listen(PORT);

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
