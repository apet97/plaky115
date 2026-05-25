# Items

## Overview

This is a set of endpoints to manage board items. Items could form individual,
highly customizable tasks which could be managed. So, you can create items,
edit/remove also or you can change your custom item field values.


### Available Operations

* [getItemsForBoardView](#getitemsforboardview) - Get items with filters
* [createItem](#createitem) - Create item
* [getSubitemsForItem](#getsubitemsforitem) - Get subitems for item
* [getItemById](#getitembyid) - Get item by ID
* [deleteItem](#deleteitem) - Delete item
* [changeItemAttributeValue](#changeitemattributevalue) - Change item field value
* [changeItemAttributeValues](#changeitemattributevalues) - Change multiple item field values

## getItemsForBoardView

Get items with filters

### Example Usage

<!-- UsageSnippet language="typescript" operationID="getItemsForBoardView" method="get" path="/v1/public/spaces/{spaceId}/boards/{boardId}/items" -->
```typescript
import { Plaky115Mcp } from "plaky115-mcp";

const plaky115Mcp = new Plaky115Mcp({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  const result = await plaky115Mcp.items.getItemsForBoardView({
    spaceId: 758421,
    boardId: 496001,
    expand: [

    ],
  });

  console.log(result);
}

run();
```

### Standalone function

The standalone function version of this method:

```typescript
import { Plaky115McpCore } from "plaky115-mcp/core.js";
import { itemsGetItemsForBoardView } from "plaky115-mcp/funcs/items-get-items-for-board-view.js";

// Use `Plaky115McpCore` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const plaky115Mcp = new Plaky115McpCore({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  const res = await itemsGetItemsForBoardView(plaky115Mcp, {
    spaceId: 758421,
    boardId: 496001,
    expand: [
  
    ],
  });
  if (res.ok) {
    const { value: result } = res;
    console.log(result);
  } else {
    console.log("itemsGetItemsForBoardView failed:", res.error);
  }
}

run();
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `request`                                                                                                                                                                      | [operations.GetItemsForBoardViewRequest](../../models/operations/get-items-for-board-view-request.md)                                                                          | :heavy_check_mark:                                                                                                                                                             | The request object to use for the request.                                                                                                                                     |
| `options`                                                                                                                                                                      | RequestOptions                                                                                                                                                                 | :heavy_minus_sign:                                                                                                                                                             | Used to set various options for making HTTP requests.                                                                                                                          |
| `options.fetchOptions`                                                                                                                                                         | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options)                                                                                        | :heavy_minus_sign:                                                                                                                                                             | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed. |
| `options.retries`                                                                                                                                                              | [RetryConfig](../../lib/utils/retryconfig.md)                                                                                                                                  | :heavy_minus_sign:                                                                                                                                                             | Enables retrying HTTP requests under certain failure conditions.                                                                                                               |

### Response

**Promise\<[models.PublicPagedResponseV1ItemResponse](../../models/public-paged-response-v1-item-response.md)\>**

### Errors

| Error Type             | Status Code            | Content Type           |
| ---------------------- | ---------------------- | ---------------------- |
| errors.SDKDefaultError | 4XX, 5XX               | \*/\*                  |

## createItem

Create item

### Example Usage

<!-- UsageSnippet language="typescript" operationID="createItem" method="post" path="/v1/public/spaces/{spaceId}/boards/{boardId}/items" -->
```typescript
import { Plaky115Mcp } from "plaky115-mcp";

const plaky115Mcp = new Plaky115Mcp({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  const result = await plaky115Mcp.items.createItem({
    spaceId: 1,
    boardId: 1,
    body: {
      title: "My New Item",
      parentId: 1,
      groupId: 1,
      groupTitle: "Backlog",
      fields: {
        "Status": "To do",
        "number-1": 50,
        "Description": "Test description",
      },
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
import { itemsCreateItem } from "plaky115-mcp/funcs/items-create-item.js";

// Use `Plaky115McpCore` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const plaky115Mcp = new Plaky115McpCore({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  const res = await itemsCreateItem(plaky115Mcp, {
    spaceId: 1,
    boardId: 1,
    body: {
      title: "My New Item",
      parentId: 1,
      groupId: 1,
      groupTitle: "Backlog",
      fields: {
        "Status": "To do",
        "number-1": 50,
        "Description": "Test description",
      },
    },
  });
  if (res.ok) {
    const { value: result } = res;
    console.log(result);
  } else {
    console.log("itemsCreateItem failed:", res.error);
  }
}

run();
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `request`                                                                                                                                                                      | [operations.CreateItemRequest](../../models/operations/create-item-request.md)                                                                                                 | :heavy_check_mark:                                                                                                                                                             | The request object to use for the request.                                                                                                                                     |
| `options`                                                                                                                                                                      | RequestOptions                                                                                                                                                                 | :heavy_minus_sign:                                                                                                                                                             | Used to set various options for making HTTP requests.                                                                                                                          |
| `options.fetchOptions`                                                                                                                                                         | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options)                                                                                        | :heavy_minus_sign:                                                                                                                                                             | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed. |
| `options.retries`                                                                                                                                                              | [RetryConfig](../../lib/utils/retryconfig.md)                                                                                                                                  | :heavy_minus_sign:                                                                                                                                                             | Enables retrying HTTP requests under certain failure conditions.                                                                                                               |

### Response

**Promise\<[models.ItemResponse](../../models/item-response.md)\>**

### Errors

| Error Type             | Status Code            | Content Type           |
| ---------------------- | ---------------------- | ---------------------- |
| errors.SDKDefaultError | 4XX, 5XX               | \*/\*                  |

## getSubitemsForItem

Get subitems for item

### Example Usage

<!-- UsageSnippet language="typescript" operationID="getSubitemsForItem" method="get" path="/v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/sub-items" -->
```typescript
import { Plaky115Mcp } from "plaky115-mcp";

const plaky115Mcp = new Plaky115Mcp({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  const result = await plaky115Mcp.items.getSubitemsForItem({
    spaceId: 1,
    boardId: 1,
    itemId: 1,
    expand: [

    ],
  });

  console.log(result);
}

run();
```

### Standalone function

The standalone function version of this method:

```typescript
import { Plaky115McpCore } from "plaky115-mcp/core.js";
import { itemsGetSubitemsForItem } from "plaky115-mcp/funcs/items-get-subitems-for-item.js";

// Use `Plaky115McpCore` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const plaky115Mcp = new Plaky115McpCore({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  const res = await itemsGetSubitemsForItem(plaky115Mcp, {
    spaceId: 1,
    boardId: 1,
    itemId: 1,
    expand: [
  
    ],
  });
  if (res.ok) {
    const { value: result } = res;
    console.log(result);
  } else {
    console.log("itemsGetSubitemsForItem failed:", res.error);
  }
}

run();
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `request`                                                                                                                                                                      | [operations.GetSubitemsForItemRequest](../../models/operations/get-subitems-for-item-request.md)                                                                               | :heavy_check_mark:                                                                                                                                                             | The request object to use for the request.                                                                                                                                     |
| `options`                                                                                                                                                                      | RequestOptions                                                                                                                                                                 | :heavy_minus_sign:                                                                                                                                                             | Used to set various options for making HTTP requests.                                                                                                                          |
| `options.fetchOptions`                                                                                                                                                         | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options)                                                                                        | :heavy_minus_sign:                                                                                                                                                             | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed. |
| `options.retries`                                                                                                                                                              | [RetryConfig](../../lib/utils/retryconfig.md)                                                                                                                                  | :heavy_minus_sign:                                                                                                                                                             | Enables retrying HTTP requests under certain failure conditions.                                                                                                               |

### Response

**Promise\<[models.PublicPagedResponseV1ItemResponse](../../models/public-paged-response-v1-item-response.md)\>**

### Errors

| Error Type             | Status Code            | Content Type           |
| ---------------------- | ---------------------- | ---------------------- |
| errors.SDKDefaultError | 4XX, 5XX               | \*/\*                  |

## getItemById

Get item by ID

### Example Usage

<!-- UsageSnippet language="typescript" operationID="getItemById" method="get" path="/v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}" -->
```typescript
import { Plaky115Mcp } from "plaky115-mcp";

const plaky115Mcp = new Plaky115Mcp({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  const result = await plaky115Mcp.items.getItemById({
    spaceId: 1,
    boardId: 1,
    itemId: 1,
    expand: [

    ],
  });

  console.log(result);
}

run();
```

### Standalone function

The standalone function version of this method:

```typescript
import { Plaky115McpCore } from "plaky115-mcp/core.js";
import { itemsGetItemById } from "plaky115-mcp/funcs/items-get-item-by-id.js";

// Use `Plaky115McpCore` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const plaky115Mcp = new Plaky115McpCore({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  const res = await itemsGetItemById(plaky115Mcp, {
    spaceId: 1,
    boardId: 1,
    itemId: 1,
    expand: [
  
    ],
  });
  if (res.ok) {
    const { value: result } = res;
    console.log(result);
  } else {
    console.log("itemsGetItemById failed:", res.error);
  }
}

run();
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `request`                                                                                                                                                                      | [operations.GetItemByIdRequest](../../models/operations/get-item-by-id-request.md)                                                                                             | :heavy_check_mark:                                                                                                                                                             | The request object to use for the request.                                                                                                                                     |
| `options`                                                                                                                                                                      | RequestOptions                                                                                                                                                                 | :heavy_minus_sign:                                                                                                                                                             | Used to set various options for making HTTP requests.                                                                                                                          |
| `options.fetchOptions`                                                                                                                                                         | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options)                                                                                        | :heavy_minus_sign:                                                                                                                                                             | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed. |
| `options.retries`                                                                                                                                                              | [RetryConfig](../../lib/utils/retryconfig.md)                                                                                                                                  | :heavy_minus_sign:                                                                                                                                                             | Enables retrying HTTP requests under certain failure conditions.                                                                                                               |

### Response

**Promise\<[models.ItemResponse](../../models/item-response.md)\>**

### Errors

| Error Type             | Status Code            | Content Type           |
| ---------------------- | ---------------------- | ---------------------- |
| errors.SDKDefaultError | 4XX, 5XX               | \*/\*                  |

## deleteItem

Delete item

### Example Usage

<!-- UsageSnippet language="typescript" operationID="deleteItem" method="delete" path="/v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}" -->
```typescript
import { Plaky115Mcp } from "plaky115-mcp";

const plaky115Mcp = new Plaky115Mcp({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  await plaky115Mcp.items.deleteItem({
    spaceId: 1,
    boardId: 1,
    itemId: 1,
  });


}

run();
```

### Standalone function

The standalone function version of this method:

```typescript
import { Plaky115McpCore } from "plaky115-mcp/core.js";
import { itemsDeleteItem } from "plaky115-mcp/funcs/items-delete-item.js";

// Use `Plaky115McpCore` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const plaky115Mcp = new Plaky115McpCore({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  const res = await itemsDeleteItem(plaky115Mcp, {
    spaceId: 1,
    boardId: 1,
    itemId: 1,
  });
  if (res.ok) {
    const { value: result } = res;
    
  } else {
    console.log("itemsDeleteItem failed:", res.error);
  }
}

run();
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `request`                                                                                                                                                                      | [operations.DeleteItemRequest](../../models/operations/delete-item-request.md)                                                                                                 | :heavy_check_mark:                                                                                                                                                             | The request object to use for the request.                                                                                                                                     |
| `options`                                                                                                                                                                      | RequestOptions                                                                                                                                                                 | :heavy_minus_sign:                                                                                                                                                             | Used to set various options for making HTTP requests.                                                                                                                          |
| `options.fetchOptions`                                                                                                                                                         | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options)                                                                                        | :heavy_minus_sign:                                                                                                                                                             | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed. |
| `options.retries`                                                                                                                                                              | [RetryConfig](../../lib/utils/retryconfig.md)                                                                                                                                  | :heavy_minus_sign:                                                                                                                                                             | Enables retrying HTTP requests under certain failure conditions.                                                                                                               |

### Response

**Promise\<void\>**

### Errors

| Error Type             | Status Code            | Content Type           |
| ---------------------- | ---------------------- | ---------------------- |
| errors.SDKDefaultError | 4XX, 5XX               | \*/\*                  |

## changeItemAttributeValue

Change item field value

### Example Usage

<!-- UsageSnippet language="typescript" operationID="changeItemAttributeValue" method="patch" path="/v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/fields/{itemFieldKey}" -->
```typescript
import { Plaky115Mcp } from "plaky115-mcp";

const plaky115Mcp = new Plaky115Mcp({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  const result = await plaky115Mcp.items.changeItemAttributeValue({
    spaceId: 1,
    boardId: 1,
    itemId: 1,
    itemFieldKey: "<value>",
    body: {
      value: {
        "value": "To do",
      },
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
import { itemsChangeItemAttributeValue } from "plaky115-mcp/funcs/items-change-item-attribute-value.js";

// Use `Plaky115McpCore` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const plaky115Mcp = new Plaky115McpCore({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  const res = await itemsChangeItemAttributeValue(plaky115Mcp, {
    spaceId: 1,
    boardId: 1,
    itemId: 1,
    itemFieldKey: "<value>",
    body: {
      value: {
        "value": "To do",
      },
    },
  });
  if (res.ok) {
    const { value: result } = res;
    console.log(result);
  } else {
    console.log("itemsChangeItemAttributeValue failed:", res.error);
  }
}

run();
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `request`                                                                                                                                                                      | [operations.ChangeItemAttributeValueRequest](../../models/operations/change-item-attribute-value-request.md)                                                                   | :heavy_check_mark:                                                                                                                                                             | The request object to use for the request.                                                                                                                                     |
| `options`                                                                                                                                                                      | RequestOptions                                                                                                                                                                 | :heavy_minus_sign:                                                                                                                                                             | Used to set various options for making HTTP requests.                                                                                                                          |
| `options.fetchOptions`                                                                                                                                                         | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options)                                                                                        | :heavy_minus_sign:                                                                                                                                                             | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed. |
| `options.retries`                                                                                                                                                              | [RetryConfig](../../lib/utils/retryconfig.md)                                                                                                                                  | :heavy_minus_sign:                                                                                                                                                             | Enables retrying HTTP requests under certain failure conditions.                                                                                                               |

### Response

**Promise\<[models.ItemResponse](../../models/item-response.md)\>**

### Errors

| Error Type             | Status Code            | Content Type           |
| ---------------------- | ---------------------- | ---------------------- |
| errors.SDKDefaultError | 4XX, 5XX               | \*/\*                  |

## changeItemAttributeValues

Change multiple item field values

### Example Usage

<!-- UsageSnippet language="typescript" operationID="changeItemAttributeValues" method="patch" path="/v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/fields" -->
```typescript
import { Plaky115Mcp } from "plaky115-mcp";

const plaky115Mcp = new Plaky115Mcp({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  const result = await plaky115Mcp.items.changeItemAttributeValues({
    spaceId: 1,
    boardId: 1,
    itemId: 1,
    body: "{\"Status\":\"To do\",\"number-1\":50,\"Description\":\"Updated description\"}",
  });

  console.log(result);
}

run();
```

### Standalone function

The standalone function version of this method:

```typescript
import { Plaky115McpCore } from "plaky115-mcp/core.js";
import { itemsChangeItemAttributeValues } from "plaky115-mcp/funcs/items-change-item-attribute-values.js";

// Use `Plaky115McpCore` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const plaky115Mcp = new Plaky115McpCore({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  const res = await itemsChangeItemAttributeValues(plaky115Mcp, {
    spaceId: 1,
    boardId: 1,
    itemId: 1,
    body: "{\"Status\":\"To do\",\"number-1\":50,\"Description\":\"Updated description\"}",
  });
  if (res.ok) {
    const { value: result } = res;
    console.log(result);
  } else {
    console.log("itemsChangeItemAttributeValues failed:", res.error);
  }
}

run();
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `request`                                                                                                                                                                      | [operations.ChangeItemAttributeValuesRequest](../../models/operations/change-item-attribute-values-request.md)                                                                 | :heavy_check_mark:                                                                                                                                                             | The request object to use for the request.                                                                                                                                     |
| `options`                                                                                                                                                                      | RequestOptions                                                                                                                                                                 | :heavy_minus_sign:                                                                                                                                                             | Used to set various options for making HTTP requests.                                                                                                                          |
| `options.fetchOptions`                                                                                                                                                         | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options)                                                                                        | :heavy_minus_sign:                                                                                                                                                             | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed. |
| `options.retries`                                                                                                                                                              | [RetryConfig](../../lib/utils/retryconfig.md)                                                                                                                                  | :heavy_minus_sign:                                                                                                                                                             | Enables retrying HTTP requests under certain failure conditions.                                                                                                               |

### Response

**Promise\<[models.ItemResponse](../../models/item-response.md)\>**

### Errors

| Error Type             | Status Code            | Content Type           |
| ---------------------- | ---------------------- | ---------------------- |
| errors.SDKDefaultError | 4XX, 5XX               | \*/\*                  |