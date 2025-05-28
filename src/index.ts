#!/usr/bin/env node

import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fetch from "node-fetch";

// Parse Swagger JSON URL from command-line arguments
const swaggerUrl = process.argv[2];
if (!swaggerUrl) {
  console.error("Usage: node dist/index.js <swagger-json-url>");
  process.exit(1);
}
console.log("Swagger JSON URL:", swaggerUrl);

// Create an MCP server
const server = new McpServer({
  name: "Demo",
  version: "1.0.0",
});

// Add a tool called load_swagger_spec that fetches and returns the Swagger spec from the URL passed as a command-line argument
server.tool(
  "load_swagger_spec",
  {}, // No arguments needed
  async () => {
    try {
      const response = await fetch(swaggerUrl);
      if (!response.ok) {
        return {
          content: [{ type: "text", text: `Failed to fetch: ${response.status} ${response.statusText}` }],
        };
      }
      const spec = await response.json();
      return {
        content: [{ type: "text", text: JSON.stringify(spec, null, 2) }],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error: ${err}` }],
      };
    }
  }
);
server.tool(
  "list_apis",
  {}, // No arguments needed
  async () => {
    try {
      const response = await fetch(swaggerUrl);
      if (!response.ok) {
        return {
          content: [{ type: "text", text: `Failed to fetch: ${response.status} ${response.statusText}` }],
        };
      }
      const spec = (await response.json()) as any;
      if (!spec.paths) {
        return {
          content: [{ type: "text", text: "No API paths found in the Swagger spec." }],
        };
      }
      const apiList = Object.keys(spec.paths)
        .map((path, idx) => `${idx + 1}. ${path}`)
        .join("\n");
      return {
        content: [{ type: "text", text: `API List:\n${apiList}` }],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error: ${err}` }],
      };
    }
  }
);

// Add a tool named 'get_api_info' that takes an 'apiname' parameter and returns info about the matching API path from the Swagger spec
server.tool("get_api_info", { apiname: z.string() }, async ({ apiname }) => {
  try {
    const response = await fetch(swaggerUrl);
    if (!response.ok) {
      return {
        content: [{ type: "text", text: `Failed to fetch: ${response.status} ${response.statusText}` }],
      };
    }
    const spec = (await response.json()) as any;
    if (!spec.paths) {
      return {
        content: [{ type: "text", text: "No API paths found in the Swagger spec." }],
      };
    }
    // Find the first path that includes the apiname substring
    const match = (Object.entries(spec.paths) as [string, any][]).find(([path]) => path.includes(apiname));
    if (!match) {
      return {
        content: [{ type: "text", text: `No API found matching '${apiname}'.` }],
      };
    }
    const [path, methods] = match;
    let info = `Path: ${path}\n`;
    for (const [method, details] of Object.entries(methods as any)) {
      const d = details as any;
      info += `\nMethod: ${method.toUpperCase()}\n`;
      if (d.summary) info += `Summary: ${d.summary}\n`;
      if (d.tags) info += `Tags: ${d.tags.join(", ")}\n`;
      if (d.parameters) {
        info += `Parameters:\n`;
        for (const param of d.parameters) {
          info += `  - ${param.name} (in: ${param.in})${param.required ? " [required]" : ""}\n`;
        }
      }
      if (d.requestBody) {
        info += `Request Body:\n`;
        // Try to extract the schema for application/json
        const content = d.requestBody.content;
        if (content && content["application/json"] && content["application/json"].schema) {
          const schema = content["application/json"].schema;
          if (schema["$ref"]) {
            // Resolve the $ref
            const ref = schema["$ref"];
            const refName = ref.replace("#/components/schemas/", "");
            const def = spec.components?.schemas?.[refName];
            if (def && def.properties) {
              const sample: any = {};
              for (const [key, prop] of Object.entries(def.properties)) {
                const p = prop as any;
                if (p.type === "string") sample[key] = "string";
                else if (p.type === "number" || p.type === "integer") sample[key] = 0;
                else if (p.type === "boolean") sample[key] = false;
                else if (p.type === "array") sample[key] = [];
                else if (p.type === "object") sample[key] = {};
                else sample[key] = null;
              }
              info += JSON.stringify(sample, null, 2) + "\n";
            } else {
              info += "  (schema definition not found)\n";
            }
          } else {
            info += JSON.stringify(schema, null, 2) + "\n";
          }
        } else {
          info += "  (schema not found or not application/json)\n";
        }
      }
      if (d.responses) {
        info += `Responses:\n`;
        for (const [code, resp] of Object.entries(d.responses)) {
          info += `  - ${code}: ${(resp as any).description}\n`;
        }
      }
    }
    return {
      content: [{ type: "text", text: info }],
    };
  } catch (err) {
    return {
      content: [{ type: "text", text: `Error: ${err}` }],
    };
  }
});

// Add a tool named 'list_endpoints' that takes parameters api_name (string), method (optional string), and path_filter (optional string), and returns a filtered list of endpoints from the loaded Swagger spec, following the provided listEndpoints logic.
server.tool(
  "list_endpoints",
  {
    api_name: z.string(),
    method: z.string().optional(),
    path_filter: z.string().optional(),
  },
  async ({ api_name, method, path_filter }) => {
    try {
      // Fetch the Swagger spec from the URL (assuming api_name is not used for multi-spec, just for compatibility)
      const response = await fetch(swaggerUrl);
      if (!response.ok) {
        return {
          content: [{ type: "text", text: `Failed to fetch: ${response.status} ${response.statusText}` }],
        };
      }
      const spec = (await response.json()) as any;
      const paths = spec.paths || {};
      const result: any[] = [];
      for (const [p, ops] of Object.entries(paths)) {
        for (const [m, op] of Object.entries<any>(ops as Record<string, any>)) {
          if (method && m.toLowerCase() !== method.toLowerCase()) continue;
          if (path_filter && !p.includes(path_filter)) continue;
          result.push({ method: m.toUpperCase(), path: p, summary: op.summary || op.operationId || "" });
        }
      }
      if (result.length === 0) {
        return {
          content: [{ type: "text", text: "No endpoints found with the given filters." }],
        };
      }
      const formatted = result.map((e) => `${e.method} ${e.path} - ${e.summary}`).join("\n");
      return {
        content: [{ type: "text", text: formatted }],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error: ${err}` }],
      };
    }
  }
);

// Add a dynamic greeting resource
// server.resource("greeting", new ResourceTemplate("greeting://{name}", { list: undefined }), async (uri, { name }) => ({
//   contents: [
//     {
//       uri: uri.href,
//       text: `Hello, ${name}!`,
//     },
//   ],
// }));

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
await server.connect(transport);
