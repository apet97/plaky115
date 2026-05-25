# Users

## Overview

This is a set of endpoints to manage users. You can search users and
retrieve user's details.


### Available Operations

* [listUsers](#listusers) - List workspace users
* [getCurrentUser](#getcurrentuser) - Retrieve current user

## listUsers

List Plaky users, optionally filtered by email, status, or role.

### Example Usage

<!-- UsageSnippet language="typescript" operationID="listUsers" method="get" path="/v1/public/users" -->
```typescript
import { Plaky115 } from "plaky115";

const plaky115 = new Plaky115({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  const result = await plaky115.users.listUsers({});

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
import { usersListUsers } from "plaky115/funcs/users-list-users.js";

// Use `Plaky115Core` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const plaky115 = new Plaky115Core({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  const res = await usersListUsers(plaky115, {});
  if (res.ok) {
    const { value: result } = res;
    for await (const page of result) {
    console.log(page);
  }
  } else {
    console.log("usersListUsers failed:", res.error);
  }
}

run();
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `request`                                                                                                                                                                      | [operations.ListUsersRequest](../../models/operations/list-users-request.md)                                                                                                   | :heavy_check_mark:                                                                                                                                                             | The request object to use for the request.                                                                                                                                     |
| `options`                                                                                                                                                                      | RequestOptions                                                                                                                                                                 | :heavy_minus_sign:                                                                                                                                                             | Used to set various options for making HTTP requests.                                                                                                                          |
| `options.fetchOptions`                                                                                                                                                         | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options)                                                                                        | :heavy_minus_sign:                                                                                                                                                             | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed. |
| `options.retries`                                                                                                                                                              | [RetryConfig](../../lib/utils/retryconfig.md)                                                                                                                                  | :heavy_minus_sign:                                                                                                                                                             | Enables retrying HTTP requests under certain failure conditions.                                                                                                               |

### Response

**Promise\<[operations.ListUsersResponse](../../models/operations/list-users-response.md)\>**

### Errors

| Error Type             | Status Code            | Content Type           |
| ---------------------- | ---------------------- | ---------------------- |
| errors.SDKDefaultError | 4XX, 5XX               | \*/\*                  |

## getCurrentUser

Retrieve the user associated with the provided API key.

### Example Usage

<!-- UsageSnippet language="typescript" operationID="getCurrentUser" method="get" path="/v1/public/users/me" -->
```typescript
import { Plaky115 } from "plaky115";

const plaky115 = new Plaky115({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  const result = await plaky115.users.getCurrentUser();

  console.log(result);
}

run();
```

### Standalone function

The standalone function version of this method:

```typescript
import { Plaky115Core } from "plaky115/core.js";
import { usersGetCurrentUser } from "plaky115/funcs/users-get-current-user.js";

// Use `Plaky115Core` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const plaky115 = new Plaky115Core({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  const res = await usersGetCurrentUser(plaky115);
  if (res.ok) {
    const { value: result } = res;
    console.log(result);
  } else {
    console.log("usersGetCurrentUser failed:", res.error);
  }
}

run();
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `options`                                                                                                                                                                      | RequestOptions                                                                                                                                                                 | :heavy_minus_sign:                                                                                                                                                             | Used to set various options for making HTTP requests.                                                                                                                          |
| `options.fetchOptions`                                                                                                                                                         | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options)                                                                                        | :heavy_minus_sign:                                                                                                                                                             | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed. |
| `options.retries`                                                                                                                                                              | [RetryConfig](../../lib/utils/retryconfig.md)                                                                                                                                  | :heavy_minus_sign:                                                                                                                                                             | Enables retrying HTTP requests under certain failure conditions.                                                                                                               |

### Response

**Promise\<[models.UserResponse](../../models/user-response.md)\>**

### Errors

| Error Type             | Status Code            | Content Type           |
| ---------------------- | ---------------------- | ---------------------- |
| errors.SDKDefaultError | 4XX, 5XX               | \*/\*                  |