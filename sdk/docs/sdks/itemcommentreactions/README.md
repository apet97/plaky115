# ItemCommentReactions

## Overview

This is a set of endpoints to manage item comment reaction(s). As a user,
you can set multiple reactions on some comment, override/remove them at
the same time.


### Available Operations

* [replaceCommentReactions](#replacecommentreactions) - Replace comment reactions

## replaceCommentReactions

Replace the current user's reactions on one Plaky item comment.

### Example Usage

<!-- UsageSnippet language="typescript" operationID="replaceCommentReactions" method="put" path="/v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/comments/{itemCommentId}/reactions" -->
```typescript
import { Plaky115 } from "plaky115";

const plaky115 = new Plaky115({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  const result = await plaky115.itemCommentReactions.replaceCommentReactions({
    spaceId: 1,
    boardId: 1,
    itemId: 1,
    itemCommentId: 1,
    body: {
      reactions: [
        {
          value: "1f44d",
        },
      ],
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
import { itemCommentReactionsReplaceCommentReactions } from "plaky115/funcs/item-comment-reactions-replace-comment-reactions.js";

// Use `Plaky115Core` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const plaky115 = new Plaky115Core({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  const res = await itemCommentReactionsReplaceCommentReactions(plaky115, {
    spaceId: 1,
    boardId: 1,
    itemId: 1,
    itemCommentId: 1,
    body: {
      reactions: [
        {
          value: "1f44d",
        },
      ],
    },
  });
  if (res.ok) {
    const { value: result } = res;
    console.log(result);
  } else {
    console.log("itemCommentReactionsReplaceCommentReactions failed:", res.error);
  }
}

run();
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `request`                                                                                                                                                                      | [operations.ReplaceCommentReactionsRequest](../../models/operations/replace-comment-reactions-request.md)                                                                      | :heavy_check_mark:                                                                                                                                                             | The request object to use for the request.                                                                                                                                     |
| `options`                                                                                                                                                                      | RequestOptions                                                                                                                                                                 | :heavy_minus_sign:                                                                                                                                                             | Used to set various options for making HTTP requests.                                                                                                                          |
| `options.fetchOptions`                                                                                                                                                         | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options)                                                                                        | :heavy_minus_sign:                                                                                                                                                             | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed. |
| `options.retries`                                                                                                                                                              | [RetryConfig](../../lib/utils/retryconfig.md)                                                                                                                                  | :heavy_minus_sign:                                                                                                                                                             | Enables retrying HTTP requests under certain failure conditions.                                                                                                               |

### Response

**Promise\<[models.ReactionPutResponse](../../models/reaction-put-response.md)\>**

### Errors

| Error Type             | Status Code            | Content Type           |
| ---------------------- | ---------------------- | ---------------------- |
| errors.SDKDefaultError | 4XX, 5XX               | \*/\*                  |