# Spaces

## Overview

This is a set of endpoints to manage space. You can search spaces and
retrieve space's details.


### Available Operations

* [listSpaces](#listspaces) - List workspace spaces
* [getSpace](#getspace) - Retrieve a space

## listSpaces

List Plaky spaces visible to the API key, optionally embedding boards.

### Example Usage

<!-- UsageSnippet language="typescript" operationID="listSpaces" method="get" path="/v1/public/spaces" -->
```typescript
import { Plaky115 } from "plaky115";

const plaky115 = new Plaky115({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  const result = await plaky115.spaces.listSpaces({
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
import { spacesListSpaces } from "plaky115/funcs/spaces-list-spaces.js";

// Use `Plaky115Core` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const plaky115 = new Plaky115Core({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  const res = await spacesListSpaces(plaky115, {
    expand: [
  
    ],
  });
  if (res.ok) {
    const { value: result } = res;
    for await (const page of result) {
    console.log(page);
  }
  } else {
    console.log("spacesListSpaces failed:", res.error);
  }
}

run();
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `request`                                                                                                                                                                      | [operations.ListSpacesRequest](../../models/operations/list-spaces-request.md)                                                                                                 | :heavy_check_mark:                                                                                                                                                             | The request object to use for the request.                                                                                                                                     |
| `options`                                                                                                                                                                      | RequestOptions                                                                                                                                                                 | :heavy_minus_sign:                                                                                                                                                             | Used to set various options for making HTTP requests.                                                                                                                          |
| `options.fetchOptions`                                                                                                                                                         | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options)                                                                                        | :heavy_minus_sign:                                                                                                                                                             | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed. |
| `options.retries`                                                                                                                                                              | [RetryConfig](../../lib/utils/retryconfig.md)                                                                                                                                  | :heavy_minus_sign:                                                                                                                                                             | Enables retrying HTTP requests under certain failure conditions.                                                                                                               |

### Response

**Promise\<[operations.ListSpacesResponse](../../models/operations/list-spaces-response.md)\>**

### Errors

| Error Type             | Status Code            | Content Type           |
| ---------------------- | ---------------------- | ---------------------- |
| errors.SDKDefaultError | 4XX, 5XX               | \*/\*                  |

## getSpace

Retrieve one Plaky space by ID.

### Example Usage

<!-- UsageSnippet language="typescript" operationID="getSpace" method="get" path="/v1/public/spaces/{spaceId}" -->
```typescript
import { Plaky115 } from "plaky115";

const plaky115 = new Plaky115({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  const result = await plaky115.spaces.getSpace({
    spaceId: 1,
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
import { spacesGetSpace } from "plaky115/funcs/spaces-get-space.js";

// Use `Plaky115Core` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const plaky115 = new Plaky115Core({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  const res = await spacesGetSpace(plaky115, {
    spaceId: 1,
    expand: [
  
    ],
  });
  if (res.ok) {
    const { value: result } = res;
    console.log(result);
  } else {
    console.log("spacesGetSpace failed:", res.error);
  }
}

run();
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `request`                                                                                                                                                                      | [operations.GetSpaceRequest](../../models/operations/get-space-request.md)                                                                                                     | :heavy_check_mark:                                                                                                                                                             | The request object to use for the request.                                                                                                                                     |
| `options`                                                                                                                                                                      | RequestOptions                                                                                                                                                                 | :heavy_minus_sign:                                                                                                                                                             | Used to set various options for making HTTP requests.                                                                                                                          |
| `options.fetchOptions`                                                                                                                                                         | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options)                                                                                        | :heavy_minus_sign:                                                                                                                                                             | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed. |
| `options.retries`                                                                                                                                                              | [RetryConfig](../../lib/utils/retryconfig.md)                                                                                                                                  | :heavy_minus_sign:                                                                                                                                                             | Enables retrying HTTP requests under certain failure conditions.                                                                                                               |

### Response

**Promise\<[models.SpaceResponse](../../models/space-response.md)\>**

### Errors

| Error Type             | Status Code            | Content Type           |
| ---------------------- | ---------------------- | ---------------------- |
| errors.SDKDefaultError | 4XX, 5XX               | \*/\*                  |