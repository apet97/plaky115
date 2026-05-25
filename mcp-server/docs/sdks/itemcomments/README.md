# ItemComments

## Overview

Set of endpoints for comment management. You can create specific comment
or reply to the existing one, change/remove as well.


### Available Operations

* [getCommentsForItem](#getcommentsforitem) - Get item comments
* [createItemComment](#createitemcomment) - Create item comment
* [updateItemComment](#updateitemcomment) - Update item comment
* [deleteItemComment](#deleteitemcomment) - Delete item comment

## getCommentsForItem

Get item comments

### Example Usage

<!-- UsageSnippet language="typescript" operationID="getCommentsForItem" method="get" path="/v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/comments" -->
```typescript
import { Plaky115Mcp } from "plaky115-mcp";

const plaky115Mcp = new Plaky115Mcp({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  const result = await plaky115Mcp.itemComments.getCommentsForItem({
    spaceId: 1,
    boardId: 1,
    itemId: 1,
  });

  console.log(result);
}

run();
```

### Standalone function

The standalone function version of this method:

```typescript
import { Plaky115McpCore } from "plaky115-mcp/core.js";
import { itemCommentsGetCommentsForItem } from "plaky115-mcp/funcs/item-comments-get-comments-for-item.js";

// Use `Plaky115McpCore` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const plaky115Mcp = new Plaky115McpCore({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  const res = await itemCommentsGetCommentsForItem(plaky115Mcp, {
    spaceId: 1,
    boardId: 1,
    itemId: 1,
  });
  if (res.ok) {
    const { value: result } = res;
    console.log(result);
  } else {
    console.log("itemCommentsGetCommentsForItem failed:", res.error);
  }
}

run();
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `request`                                                                                                                                                                      | [operations.GetCommentsForItemRequest](../../models/operations/get-comments-for-item-request.md)                                                                               | :heavy_check_mark:                                                                                                                                                             | The request object to use for the request.                                                                                                                                     |
| `options`                                                                                                                                                                      | RequestOptions                                                                                                                                                                 | :heavy_minus_sign:                                                                                                                                                             | Used to set various options for making HTTP requests.                                                                                                                          |
| `options.fetchOptions`                                                                                                                                                         | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options)                                                                                        | :heavy_minus_sign:                                                                                                                                                             | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed. |
| `options.retries`                                                                                                                                                              | [RetryConfig](../../lib/utils/retryconfig.md)                                                                                                                                  | :heavy_minus_sign:                                                                                                                                                             | Enables retrying HTTP requests under certain failure conditions.                                                                                                               |

### Response

**Promise\<[models.CommentResponse[]](../../models/.md)\>**

### Errors

| Error Type             | Status Code            | Content Type           |
| ---------------------- | ---------------------- | ---------------------- |
| errors.SDKDefaultError | 4XX, 5XX               | \*/\*                  |

## createItemComment

Create item comment

### Example Usage

<!-- UsageSnippet language="typescript" operationID="createItemComment" method="post" path="/v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/comments" -->
```typescript
import { Plaky115Mcp } from "plaky115-mcp";

const plaky115Mcp = new Plaky115Mcp({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  const result = await plaky115Mcp.itemComments.createItemComment({
    spaceId: 1,
    boardId: 1,
    itemId: 1,
    body: {
      text: "My comment.",
      repliesToId: 1,
    },
  });

  console.log(result);
}

run();
```

### Standalone function

The standalone function version of this method:

```typescript
import { Plaky115McpCore } from "plaky115-mcp/core.js";
import { itemCommentsCreateItemComment } from "plaky115-mcp/funcs/item-comments-create-item-comment.js";

// Use `Plaky115McpCore` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const plaky115Mcp = new Plaky115McpCore({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  const res = await itemCommentsCreateItemComment(plaky115Mcp, {
    spaceId: 1,
    boardId: 1,
    itemId: 1,
    body: {
      text: "My comment.",
      repliesToId: 1,
    },
  });
  if (res.ok) {
    const { value: result } = res;
    console.log(result);
  } else {
    console.log("itemCommentsCreateItemComment failed:", res.error);
  }
}

run();
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `request`                                                                                                                                                                      | [operations.CreateItemCommentRequest](../../models/operations/create-item-comment-request.md)                                                                                  | :heavy_check_mark:                                                                                                                                                             | The request object to use for the request.                                                                                                                                     |
| `options`                                                                                                                                                                      | RequestOptions                                                                                                                                                                 | :heavy_minus_sign:                                                                                                                                                             | Used to set various options for making HTTP requests.                                                                                                                          |
| `options.fetchOptions`                                                                                                                                                         | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options)                                                                                        | :heavy_minus_sign:                                                                                                                                                             | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed. |
| `options.retries`                                                                                                                                                              | [RetryConfig](../../lib/utils/retryconfig.md)                                                                                                                                  | :heavy_minus_sign:                                                                                                                                                             | Enables retrying HTTP requests under certain failure conditions.                                                                                                               |

### Response

**Promise\<[models.CommentResponse](../../models/comment-response.md)\>**

### Errors

| Error Type             | Status Code            | Content Type           |
| ---------------------- | ---------------------- | ---------------------- |
| errors.SDKDefaultError | 4XX, 5XX               | \*/\*                  |

## updateItemComment

Update item comment

### Example Usage

<!-- UsageSnippet language="typescript" operationID="updateItemComment" method="put" path="/v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/comments/{itemCommentId}" -->
```typescript
import { Plaky115Mcp } from "plaky115-mcp";

const plaky115Mcp = new Plaky115Mcp({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  const result = await plaky115Mcp.itemComments.updateItemComment({
    spaceId: 1,
    boardId: 1,
    itemId: 1,
    itemCommentId: 1,
    body: {
      text: "My comment.",
      repliesToId: 1,
    },
  });

  console.log(result);
}

run();
```

### Standalone function

The standalone function version of this method:

```typescript
import { Plaky115McpCore } from "plaky115-mcp/core.js";
import { itemCommentsUpdateItemComment } from "plaky115-mcp/funcs/item-comments-update-item-comment.js";

// Use `Plaky115McpCore` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const plaky115Mcp = new Plaky115McpCore({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  const res = await itemCommentsUpdateItemComment(plaky115Mcp, {
    spaceId: 1,
    boardId: 1,
    itemId: 1,
    itemCommentId: 1,
    body: {
      text: "My comment.",
      repliesToId: 1,
    },
  });
  if (res.ok) {
    const { value: result } = res;
    console.log(result);
  } else {
    console.log("itemCommentsUpdateItemComment failed:", res.error);
  }
}

run();
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `request`                                                                                                                                                                      | [operations.UpdateItemCommentRequest](../../models/operations/update-item-comment-request.md)                                                                                  | :heavy_check_mark:                                                                                                                                                             | The request object to use for the request.                                                                                                                                     |
| `options`                                                                                                                                                                      | RequestOptions                                                                                                                                                                 | :heavy_minus_sign:                                                                                                                                                             | Used to set various options for making HTTP requests.                                                                                                                          |
| `options.fetchOptions`                                                                                                                                                         | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options)                                                                                        | :heavy_minus_sign:                                                                                                                                                             | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed. |
| `options.retries`                                                                                                                                                              | [RetryConfig](../../lib/utils/retryconfig.md)                                                                                                                                  | :heavy_minus_sign:                                                                                                                                                             | Enables retrying HTTP requests under certain failure conditions.                                                                                                               |

### Response

**Promise\<[models.CommentResponse](../../models/comment-response.md)\>**

### Errors

| Error Type             | Status Code            | Content Type           |
| ---------------------- | ---------------------- | ---------------------- |
| errors.SDKDefaultError | 4XX, 5XX               | \*/\*                  |

## deleteItemComment

Delete item comment

### Example Usage

<!-- UsageSnippet language="typescript" operationID="deleteItemComment" method="delete" path="/v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/comments/{itemCommentId}" -->
```typescript
import { Plaky115Mcp } from "plaky115-mcp";

const plaky115Mcp = new Plaky115Mcp({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  await plaky115Mcp.itemComments.deleteItemComment({
    spaceId: 1,
    boardId: 1,
    itemId: 1,
    itemCommentId: 1,
  });


}

run();
```

### Standalone function

The standalone function version of this method:

```typescript
import { Plaky115McpCore } from "plaky115-mcp/core.js";
import { itemCommentsDeleteItemComment } from "plaky115-mcp/funcs/item-comments-delete-item-comment.js";

// Use `Plaky115McpCore` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const plaky115Mcp = new Plaky115McpCore({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  const res = await itemCommentsDeleteItemComment(plaky115Mcp, {
    spaceId: 1,
    boardId: 1,
    itemId: 1,
    itemCommentId: 1,
  });
  if (res.ok) {
    const { value: result } = res;
    
  } else {
    console.log("itemCommentsDeleteItemComment failed:", res.error);
  }
}

run();
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `request`                                                                                                                                                                      | [operations.DeleteItemCommentRequest](../../models/operations/delete-item-comment-request.md)                                                                                  | :heavy_check_mark:                                                                                                                                                             | The request object to use for the request.                                                                                                                                     |
| `options`                                                                                                                                                                      | RequestOptions                                                                                                                                                                 | :heavy_minus_sign:                                                                                                                                                             | Used to set various options for making HTTP requests.                                                                                                                          |
| `options.fetchOptions`                                                                                                                                                         | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options)                                                                                        | :heavy_minus_sign:                                                                                                                                                             | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed. |
| `options.retries`                                                                                                                                                              | [RetryConfig](../../lib/utils/retryconfig.md)                                                                                                                                  | :heavy_minus_sign:                                                                                                                                                             | Enables retrying HTTP requests under certain failure conditions.                                                                                                               |

### Response

**Promise\<void\>**

### Errors

| Error Type             | Status Code            | Content Type           |
| ---------------------- | ---------------------- | ---------------------- |
| errors.SDKDefaultError | 4XX, 5XX               | \*/\*                  |