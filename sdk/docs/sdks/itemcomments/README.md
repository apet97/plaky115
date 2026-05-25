# ItemComments

## Overview

Set of endpoints for comment management. You can create specific comment
or reply to the existing one, change/remove as well.


### Available Operations

* [listItemComments](#listitemcomments) - List item comments
* [createItemComment](#createitemcomment) - Create item comment
* [updateItemComment](#updateitemcomment) - Update item comment
* [deleteItemComment](#deleteitemcomment) - Delete item comment

## listItemComments

List comments on one Plaky item.

### Example Usage

<!-- UsageSnippet language="typescript" operationID="listItemComments" method="get" path="/v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/comments" -->
```typescript
import { Plaky115 } from "plaky115";

const plaky115 = new Plaky115({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  const result = await plaky115.itemComments.listItemComments({
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
import { Plaky115Core } from "plaky115/core.js";
import { itemCommentsListItemComments } from "plaky115/funcs/item-comments-list-item-comments.js";

// Use `Plaky115Core` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const plaky115 = new Plaky115Core({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  const res = await itemCommentsListItemComments(plaky115, {
    spaceId: 1,
    boardId: 1,
    itemId: 1,
  });
  if (res.ok) {
    const { value: result } = res;
    console.log(result);
  } else {
    console.log("itemCommentsListItemComments failed:", res.error);
  }
}

run();
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `request`                                                                                                                                                                      | [operations.ListItemCommentsRequest](../../models/operations/list-item-comments-request.md)                                                                                    | :heavy_check_mark:                                                                                                                                                             | The request object to use for the request.                                                                                                                                     |
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

Add a comment or reply to one Plaky item.

### Example Usage

<!-- UsageSnippet language="typescript" operationID="createItemComment" method="post" path="/v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/comments" -->
```typescript
import { Plaky115 } from "plaky115";

const plaky115 = new Plaky115({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  const result = await plaky115.itemComments.createItemComment({
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
import { Plaky115Core } from "plaky115/core.js";
import { itemCommentsCreateItemComment } from "plaky115/funcs/item-comments-create-item-comment.js";

// Use `Plaky115Core` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const plaky115 = new Plaky115Core({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  const res = await itemCommentsCreateItemComment(plaky115, {
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

Replace the text of one Plaky item comment.

### Example Usage

<!-- UsageSnippet language="typescript" operationID="updateItemComment" method="put" path="/v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/comments/{itemCommentId}" -->
```typescript
import { Plaky115 } from "plaky115";

const plaky115 = new Plaky115({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  const result = await plaky115.itemComments.updateItemComment({
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
import { Plaky115Core } from "plaky115/core.js";
import { itemCommentsUpdateItemComment } from "plaky115/funcs/item-comments-update-item-comment.js";

// Use `Plaky115Core` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const plaky115 = new Plaky115Core({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  const res = await itemCommentsUpdateItemComment(plaky115, {
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

Delete one Plaky item comment by ID.

### Example Usage

<!-- UsageSnippet language="typescript" operationID="deleteItemComment" method="delete" path="/v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/comments/{itemCommentId}" -->
```typescript
import { Plaky115 } from "plaky115";

const plaky115 = new Plaky115({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  await plaky115.itemComments.deleteItemComment({
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
import { Plaky115Core } from "plaky115/core.js";
import { itemCommentsDeleteItemComment } from "plaky115/funcs/item-comments-delete-item-comment.js";

// Use `Plaky115Core` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const plaky115 = new Plaky115Core({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  const res = await itemCommentsDeleteItemComment(plaky115, {
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