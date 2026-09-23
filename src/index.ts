import { McpServer } from "@modelcontextprotocol/server";
import { createMcpHandler } from "agents/mcp/server";
import { z } from "zod";

type MarketData = {
  symbol?: string;
  timeframe?: string;
  time?: string;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
  [key: string]: unknown;
};

let latestTradingView: MarketData[] = [];

function createServer() {
  const server = new McpServer({
    name: "XAUUSD TradingView MCP",
    version: "1.0.0",
  });

  server.registerTool(
    "get_latest_tradingview_data",
    {
      description:
        "Returns the latest TradingView webhook data received by this Worker.",
    },
    async () => ({
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              symbol: "XAUUSD",
              received_bars: latestTradingView,
            },
            null,
            2
          ),
        },
      ],
    })
  );

  server.registerTool(
    "analyze_xauusd_setup",
    {
      description:
        "Creates a structured XAUUSD analysis request from D1, H4 and H1 context.",
      inputSchema: {
        d1: z.string().optional(),
        h4: z.string().optional(),
        h1: z.string().optional(),
        bias: z.string().optional(),
      },
    },
    async ({ d1, h4, h1, bias }) => ({
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              symbol: "XAUUSD",
              timeframe_context: {
                D1: d1 ?? null,
                H4: h4 ?? null,
                H1: h1 ?? null,
              },
              bias: bias ?? null,
              instruction:
                "Analyze bullish, bearish and no-trade scenarios using only supplied data. Include confirmation and invalidation conditions. Do not invent prices.",
            },
            null,
            2
          ),
        },
      ],
    })
  );

  return server;
}

const mcpHandler = createMcpHandler(createServer);

export default {
  async fetch(request: Request, env: unknown, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (url.pathname === "/webhook/tradingview") {
      if (request.method !== "POST") {
        return new Response("Use POST", { status: 405 });
      }

      try {
        const body = await request.json();
        const item = Array.isArray(body) ? body : [body];

        latestTradingView = item.slice(-20);

        return Response.json({
          ok: true,
          received: item.length,
          endpoint: "/webhook/tradingview",
        });
      } catch {
        return new Response("Invalid JSON", { status: 400 });
      }
    }

    if (url.pathname === "/mcp") {
      return mcpHandler(request, env, ctx);
    }

    return new Response(
      "XAUUSD MCP Worker is running. MCP: /mcp | TradingView webhook: /webhook/tradingview",
      { status: 200 }
    );
  },
} satisfies ExportedHandler;
