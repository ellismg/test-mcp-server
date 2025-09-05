#!/usr/bin/env node

/**
 * A simple MCP server exposing a single long-running tool used to test
 * client timeout reset behavior (e.g. `resetTimeoutOnProgress`).
 *
 * Tool: `test_long_running`
 *   - Required numeric parameter `seconds` (integer >= 0)
 *   - The tool waits the specified number of seconds before returning.
 *   - While waiting it emits an MCP `notifications/progress` notification every
 *     second (if the client provided a progress token) so a client using
 *     `resetTimeoutOnProgress` can observe progress and keep the request alive.
 *
 * Usage: npx tsx test-mcp-server.ts
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
    {
        name: "test-mcp-server",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
            // logging capability not required for progress notifications
        },
    },
);

// Utility sleep
function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
    const { name, arguments: args } = request.params;

    if (name === "test_long_running") {
        const seconds = args?.seconds;
        if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 0) {
            throw new Error("'seconds' must be a non-negative number");
        }
        const wholeSeconds = Math.floor(seconds);

        const progressToken = request.params._meta?.progressToken; // Provided by client when requesting progress

        // If client requested progress notifications, emit initial 0% update
        if (progressToken !== undefined) {
            await extra.sendNotification({
                method: "notifications/progress",
                params: {
                    progress: 0,
                    total: wholeSeconds,
                    message: `Starting long running tool: ${wholeSeconds} second(s)` ,
                    progressToken,
                },
            });
        }

        for (let i = 1; i <= wholeSeconds; i++) {
            await delay(1000);
            if (progressToken !== undefined) {
                await extra.sendNotification({
                    method: "notifications/progress",
                    params: {
                        progress: i,
                        total: wholeSeconds,
                        message: `Progress: ${i}/${wholeSeconds} second(s) elapsed`,
                        progressToken,
                    },
                });
            }
        }

        return {
            content: [
                {
                    type: "text",
                    text: `Completed after ${wholeSeconds} second(s).`,
                },
            ],
        };
    }

    throw new Error(`Unknown tool: ${name}`);
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "test_long_running",
                description: "Waits N seconds, sending a progress notification each second.",
                inputSchema: {
                    type: "object",
                    required: ["seconds"],
                    properties: {
                        seconds: {
                            type: "number",
                            description: "Number of seconds to wait (integer, >= 0)",
                            default: 5,
                        },
                    },
                },
            },
        ],
    };
});

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    // Log to stderr so we don't pollute stdout MCP channel
    console.error("Test long-running MCP server started");
}

main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});
