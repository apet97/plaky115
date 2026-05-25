# Items

## Overview

This is a set of endpoints to manage board items. Items could form individual,
highly customizable tasks which could be managed. So, you can create items,
edit/remove also or you can change your custom item field values.


### Available Operations

* [listItems](#listitems) - List board items
* [createItem](#createitem) - Create an item
* [listSubitems](#listsubitems) - List subitems
* [getItem](#getitem) - Retrieve an item
* [deleteItem](#deleteitem) - Delete an item
* [updateItemField](#updateitemfield) - Update one item field
* [updateItemFields](#updateitemfields) - Update item fields

## listItems

List items on a Plaky board with optional view, parent, and expansion filters.

### Example Usage

<!-- UsageSnippet language="typescript" operationID="listItems" method="get" path="/v1/public/spaces/{spaceId}/boards/{boardId}/items" -->
```typescript
import { Plaky115 } from "plaky115";

const plaky115 = new Plaky115({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  const result = await plaky115.items.listItems({
    spaceId: 597793,
    boardId: 218717,
    expand: [

    ],
  });

  for await (const page of result) {
    console.log(page);
  }
}

run();
```

### Standalone function

The standalone function version of this method:

```typescript
import { Plaky115Core } from "plaky115/core.js";
import { itemsListItems } from "plaky115/funcs/items-list-items.js";

// Use `Plaky115Core` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const plaky115 = new Plaky115Core({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  const res = await itemsListItems(plaky115, {
    spaceId: 597793,
    boardId: 218717,
    expand: [
  
    ],
  });
  if (res.ok) {
    const { value: result } = res;
    for await (const page of result) {
    console.log(page);
  }
  } else {
    console.log("itemsListItems failed:", res.error);
  }
}

run();
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `request`                                                                                                                                                                      | [operations.ListItemsRequest](../../models/operations/list-items-request.md)                                                                                                   | :heavy_check_mark:                                                                                                                                                             | The request object to use for the request.                                                                                                                                     |
| `options`                                                                                                                                                                      | RequestOptions                                                                                                                                                                 | :heavy_minus_sign:                                                                                                                                                             | Used to set various options for making HTTP requests.                                                                                                                          |
| `options.fetchOptions`                                                                                                                                                         | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options)                                                                                        | :heavy_minus_sign:                                                                                                                                                             | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed. |
| `options.retries`                                                                                                                                                              | [RetryConfig](../../lib/utils/retryconfig.md)                                                                                                                                  | :heavy_minus_sign:                                                                                                                                                             | Enables retrying HTTP requests under certain failure conditions.                                                                                                               |

### Response

**Promise\<[operations.ListItemsResponse](../../models/operations/list-items-response.md)\>**

### Errors

| Error Type             | Status Code            | Content Type           |
| ---------------------- | ---------------------- | ---------------------- |
| errors.SDKDefaultError | 4XX, 5XX               | \*/\*                  |

## createItem

Create a Plaky item using a title, group, parent, and optional field values.

### Example Usage

<!-- UsageSnippet language="typescript" operationID="createItem" method="post" path="/v1/public/spaces/{spaceId}/boards/{boardId}/items" -->
```typescript
import { Plaky115 } from "plaky115";

const plaky115 = new Plaky115({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  const result = await plaky115.items.createItem({
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
import { Plaky115Core } from "plaky115/core.js";
import { itemsCreateItem } from "plaky115/funcs/items-create-item.js";

// Use `Plaky115Core` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const plaky115 = new Plaky115Core({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  const res = await itemsCreateItem(plaky115, {
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

## listSubitems

List subitems under one Plaky item.

### Example Usage

<!-- UsageSnippet language="typescript" operationID="listSubitems" method="get" path="/v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/sub-items" -->
```typescript
import { Plaky115 } from "plaky115";

const plaky115 = new Plaky115({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  const result = await plaky115.items.listSubitems({
    spaceId: 1,
    boardId: 1,
    itemId: 1,
    expand: [

    ],
  });

  for await (const page of result) {
    console.log(page);
  }
}

run();
```

### Standalone function

The standalone function version of this method:

```typescript
import { Plaky115Core } from "plaky115/core.js";
import { itemsListSubitems } from "plaky115/funcs/items-list-subitems.js";

// Use `Plaky115Core` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const plaky115 = new Plaky115Core({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  const res = await itemsListSubitems(plaky115, {
    spaceId: 1,
    boardId: 1,
    itemId: 1,
    expand: [
  
    ],
  });
  if (res.ok) {
    const { value: result } = res;
    for await (const page of result) {
    console.log(page);
  }
  } else {
    console.log("itemsListSubitems failed:", res.error);
  }
}

run();
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `request`                                                                                                                                                                      | [operations.ListSubitemsRequest](../../models/operations/list-subitems-request.md)                                                                                             | :heavy_check_mark:                                                                                                                                                             | The request object to use for the request.                                                                                                                                     |
| `options`                                                                                                                                                                      | RequestOptions                                                                                                                                                                 | :heavy_minus_sign:                                                                                                                                                             | Used to set various options for making HTTP requests.                                                                                                                          |
| `options.fetchOptions`                                                                                                                                                         | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options)                                                                                        | :heavy_minus_sign:                                                                                                                                                             | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed. |
| `options.retries`                                                                                                                                                              | [RetryConfig](../../lib/utils/retryconfig.md)                                                                                                                                  | :heavy_minus_sign:                                                                                                                                                             | Enables retrying HTTP requests under certain failure conditions.                                                                                                               |

### Response

**Promise\<[operations.ListSubitemsResponse](../../models/operations/list-subitems-response.md)\>**

### Errors

| Error Type             | Status Code            | Content Type           |
| ---------------------- | ---------------------- | ---------------------- |
| errors.SDKDefaultError | 4XX, 5XX               | \*/\*                  |

## getItem

Retrieve one Plaky item by ID.

### Example Usage

<!-- UsageSnippet language="typescript" operationID="getItem" method="get" path="/v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}" -->
```typescript
import { Plaky115 } from "plaky115";

const plaky115 = new Plaky115({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  const result = await plaky115.items.getItem({
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
import { Plaky115Core } from "plaky115/core.js";
import { itemsGetItem } from "plaky115/funcs/items-get-item.js";

// Use `Plaky115Core` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const plaky115 = new Plaky115Core({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  const res = await itemsGetItem(plaky115, {
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
    console.log("itemsGetItem failed:", res.error);
  }
}

run();
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `request`                                                                                                                                                                      | [operations.GetItemRequest](../../models/operations/get-item-request.md)                                                                                                       | :heavy_check_mark:                                                                                                                                                             | The request object to use for the request.                                                                                                                                     |
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

Delete one Plaky item by ID.

### Example Usage

<!-- UsageSnippet language="typescript" operationID="deleteItem" method="delete" path="/v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}" -->
```typescript
import { Plaky115 } from "plaky115";

const plaky115 = new Plaky115({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  await plaky115.items.deleteItem({
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
import { Plaky115Core } from "plaky115/core.js";
import { itemsDeleteItem } from "plaky115/funcs/items-delete-item.js";

// Use `Plaky115Core` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const plaky115 = new Plaky115Core({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  const res = await itemsDeleteItem(plaky115, {
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

## updateItemField

Update a single field value on one Plaky item.

### Example Usage

<!-- UsageSnippet language="typescript" operationID="updateItemField" method="patch" path="/v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/fields/{itemFieldKey}" -->
```typescript
import { Plaky115 } from "plaky115";

const plaky115 = new Plaky115({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  const result = await plaky115.items.updateItemField({
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
import { Plaky115Core } from "plaky115/core.js";
import { itemsUpdateItemField } from "plaky115/funcs/items-update-item-field.js";

// Use `Plaky115Core` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const plaky115 = new Plaky115Core({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  const res = await itemsUpdateItemField(plaky115, {
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
    console.log("itemsUpdateItemField failed:", res.error);
  }
}

run();
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `request`                                                                                                                                                                      | [operations.UpdateItemFieldRequest](../../models/operations/update-item-field-request.md)                                                                                      | :heavy_check_mark:                                                                                                                                                             | The request object to use for the request.                                                                                                                                     |
| `options`                                                                                                                                                                      | RequestOptions                                                                                                                                                                 | :heavy_minus_sign:                                                                                                                                                             | Used to set various options for making HTTP requests.                                                                                                                          |
| `options.fetchOptions`                                                                                                                                                         | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options)                                                                                        | :heavy_minus_sign:                                                                                                                                                             | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed. |
| `options.retries`                                                                                                                                                              | [RetryConfig](../../lib/utils/retryconfig.md)                                                                                                                                  | :heavy_minus_sign:                                                                                                                                                             | Enables retrying HTTP requests under certain failure conditions.                                                                                                               |

### Response

**Promise\<[models.ItemResponse](../../models/item-response.md)\>**

### Errors

| Error Type             | Status Code            | Content Type           |
| ---------------------- | ---------------------- | ---------------------- |
| errors.SDKDefaultError | 4XX, 5XX               | \*/\*                  |

## updateItemFields

Update multiple field values on one Plaky item.

### Example Usage

<!-- UsageSnippet language="typescript" operationID="updateItemFields" method="patch" path="/v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/fields" -->
```typescript
import { Plaky115 } from "plaky115";

const plaky115 = new Plaky115({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  const result = await plaky115.items.updateItemFields({
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
import { Plaky115Core } from "plaky115/core.js";
import { itemsUpdateItemFields } from "plaky115/funcs/items-update-item-fields.js";

// Use `Plaky115Core` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const plaky115 = new Plaky115Core({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  const res = await itemsUpdateItemFields(plaky115, {
    spaceId: 1,
    boardId: 1,
    itemId: 1,
    body: "{\"Status\":\"To do\",\"number-1\":50,\"Description\":\"Updated description\"}",
  });
  if (res.ok) {
    const { value: result } = res;
    console.log(result);
  } else {
    console.log("itemsUpdateItemFields failed:", res.error);
  }
}

run();
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `request`                                                                                                                                                                      | [operations.UpdateItemFieldsRequest](../../models/operations/update-item-fields-request.md)                                                                                    | :heavy_check_mark:                                                                                                                                                             | The request object to use for the request.                                                                                                                                     |
| `options`                                                                                                                                                                      | RequestOptions                                                                                                                                                                 | :heavy_minus_sign:                                                                                                                                                             | Used to set various options for making HTTP requests.                                                                                                                          |
| `options.fetchOptions`                                                                                                                                                         | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options)                                                                                        | :heavy_minus_sign:                                                                                                                                                             | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed. |
| `options.retries`                                                                                                                                                              | [RetryConfig](../../lib/utils/retryconfig.md)                                                                                                                                  | :heavy_minus_sign:                                                                                                                                                             | Enables retrying HTTP requests under certain failure conditions.                                                                                                               |

### Response

**Promise\<[models.ItemResponse](../../models/item-response.md)\>**

### Errors

| Error Type             | Status Code            | Content Type           |
| ---------------------- | ---------------------- | ---------------------- |
| errors.SDKDefaultError | 4XX, 5XX               | \*/\*                  |