# Boards

## Overview

This is a set of endpoints to manage boards. You can search boards and
retrieve board's details.


### Available Operations

* [getBoardsForSpace](#getboardsforspace) - Get boards for space
* [getBoardById](#getboardbyid) - Get board by ID

## getBoardsForSpace

Get boards for space

### Example Usage

<!-- UsageSnippet language="typescript" operationID="getBoardsForSpace" method="get" path="/v1/public/spaces/{spaceId}/boards" -->
```typescript
import { Plaky115Mcp } from "plaky115-mcp";

const plaky115Mcp = new Plaky115Mcp({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  const result = await plaky115Mcp.boards.getBoardsForSpace({
    spaceId: 1,
  });

  console.log(result);
}

run();
```

### Standalone function

The standalone function version of this method:

```typescript
import { Plaky115McpCore } from "plaky115-mcp/core.js";
import { boardsGetBoardsForSpace } from "plaky115-mcp/funcs/boards-get-boards-for-space.js";

// Use `Plaky115McpCore` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const plaky115Mcp = new Plaky115McpCore({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  const res = await boardsGetBoardsForSpace(plaky115Mcp, {
    spaceId: 1,
  });
  if (res.ok) {
    const { value: result } = res;
    console.log(result);
  } else {
    console.log("boardsGetBoardsForSpace failed:", res.error);
  }
}

run();
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `request`                                                                                                                                                                      | [operations.GetBoardsForSpaceRequest](../../models/operations/get-boards-for-space-request.md)                                                                                 | :heavy_check_mark:                                                                                                                                                             | The request object to use for the request.                                                                                                                                     |
| `options`                                                                                                                                                                      | RequestOptions                                                                                                                                                                 | :heavy_minus_sign:                                                                                                                                                             | Used to set various options for making HTTP requests.                                                                                                                          |
| `options.fetchOptions`                                                                                                                                                         | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options)                                                                                        | :heavy_minus_sign:                                                                                                                                                             | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed. |
| `options.retries`                                                                                                                                                              | [RetryConfig](../../lib/utils/retryconfig.md)                                                                                                                                  | :heavy_minus_sign:                                                                                                                                                             | Enables retrying HTTP requests under certain failure conditions.                                                                                                               |

### Response

**Promise\<[models.PublicPagedResponseV1BoardResponse](../../models/public-paged-response-v1-board-response.md)\>**

### Errors

| Error Type             | Status Code            | Content Type           |
| ---------------------- | ---------------------- | ---------------------- |
| errors.SDKDefaultError | 4XX, 5XX               | \*/\*                  |

## getBoardById

Get board by ID

### Example Usage

<!-- UsageSnippet language="typescript" operationID="getBoardById" method="get" path="/v1/public/spaces/{spaceId}/boards/{boardId}" -->
```typescript
import { Plaky115Mcp } from "plaky115-mcp";

const plaky115Mcp = new Plaky115Mcp({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  const result = await plaky115Mcp.boards.getBoardById({
    spaceId: 1,
    boardId: 1,
  });

  console.log(result);
}

run();
```

### Standalone function

The standalone function version of this method:

```typescript
import { Plaky115McpCore } from "plaky115-mcp/core.js";
import { boardsGetBoardById } from "plaky115-mcp/funcs/boards-get-board-by-id.js";

// Use `Plaky115McpCore` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const plaky115Mcp = new Plaky115McpCore({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  const res = await boardsGetBoardById(plaky115Mcp, {
    spaceId: 1,
    boardId: 1,
  });
  if (res.ok) {
    const { value: result } = res;
    console.log(result);
  } else {
    console.log("boardsGetBoardById failed:", res.error);
  }
}

run();
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `request`                                                                                                                                                                      | [operations.GetBoardByIdRequest](../../models/operations/get-board-by-id-request.md)                                                                                           | :heavy_check_mark:                                                                                                                                                             | The request object to use for the request.                                                                                                                                     |
| `options`                                                                                                                                                                      | RequestOptions                                                                                                                                                                 | :heavy_minus_sign:                                                                                                                                                             | Used to set various options for making HTTP requests.                                                                                                                          |
| `options.fetchOptions`                                                                                                                                                         | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options)                                                                                        | :heavy_minus_sign:                                                                                                                                                             | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed. |
| `options.retries`                                                                                                                                                              | [RetryConfig](../../lib/utils/retryconfig.md)                                                                                                                                  | :heavy_minus_sign:                                                                                                                                                             | Enables retrying HTTP requests under certain failure conditions.                                                                                                               |

### Response

**Promise\<[models.BoardResponse](../../models/board-response.md)\>**

### Errors

| Error Type             | Status Code            | Content Type           |
| ---------------------- | ---------------------- | ---------------------- |
| errors.SDKDefaultError | 4XX, 5XX               | \*/\*                  |