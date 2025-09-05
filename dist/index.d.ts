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
export {};
//# sourceMappingURL=index.d.ts.map