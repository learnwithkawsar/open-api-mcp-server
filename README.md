# Open API MCP Server

This project is a Model Context Protocol (MCP) server that dynamically loads and exposes tools based on an OpenAPI (Swagger) specification. It is designed to help you interact with, inspect, and test any OpenAPI-compatible API via a standard interface.

## Features

- **Dynamic Swagger/OpenAPI loading:** Pass a Swagger JSON URL as a command-line argument to load and interact with any API.
- **API Inspection Tools:**
  - `list_apis`: List all available API paths.
  - `get_api_info`: Get detailed information about a specific API endpoint, including parameters and request/response schemas.
  - `list_endpoints`: List endpoints with optional filtering by method or path substring.
  - `load_swagger_spec`: Fetch and return the full Swagger spec.
  - `readSwaggerSpec`: Fetch and pretty-print the loaded Swagger spec.
- **Request Body Example Generation:** For endpoints with a request body, the server generates a sample JSON payload based on the schema.
- **Standard I/O Transport:** The server communicates over stdin/stdout, making it easy to integrate with other tools or automation.

## Usage

### 1. Install dependencies

```sh
npm install
```

### 2. Build the project

```sh
npm run build
```

### 3. Run the server with a Swagger JSON URL

```sh
node dist/index.js <swagger-json-url>
```

Example:

```sh
node dist/index.js http://your-server.com/swagger/v1/swagger.json
```

## Example Tools

- **list_apis**: Returns all API paths from the loaded spec.
- **get_api_info**: Returns details (parameters, request/response, sample body) for a given endpoint.
- **list_endpoints**: Returns endpoints, optionally filtered by HTTP method or path substring.
- **readSwaggerSpec**: Returns the full Swagger spec as formatted JSON.

## Development

- Written in TypeScript
- Uses `node-fetch` for HTTP requests
- Uses `zod` for schema validation

## Project Structure

- `src/index.ts`: Main server and tool logic
- `dist/`: Compiled JavaScript output
- `.gitignore`: Standard Node/TypeScript ignores
- `tsconfig.json`: TypeScript configuration

## License

ISC

## Configuration & CLI Usage

You can use this project as a CLI tool to load and interact with any OpenAPI/Swagger spec. You can run it directly with `npx` or as a local/global package.

### Example: Using with npx

```sh
npx @kawsar-ahmed/open-api-mcp-server http://your-server.com/swagger/v1/swagger.json
```

### Example: Using in a config file (e.g., mcp.json)

You can configure your tool runner (such as Cursor or any MCP-compatible orchestrator) to use this server with a config like:

```json
{
  "mcpServers": {
    "swagger2": {
      "command": "npx",
      "args": ["@kawsar-ahmed/open-api-mcp-server", "http://your-server.com/swagger/v1/swagger.json"]
    }
  }
}
```

Replace the URL with your actual Swagger/OpenAPI endpoint.

---

**Author:** Kawsar Ahmed
