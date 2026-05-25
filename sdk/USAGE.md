<!-- Start SDK Example Usage [usage] -->
### List spaces

Discover spaces before resolving boards or items.

```typescript
import { Plaky115 } from "plaky115";

const plaky115 = new Plaky115({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  const result = await plaky115.spaces.listSpaces({
    expand: [],
  });

  for await (const page of result) {
    console.log(page);
  }
}

run();

```

### Get a space

Fetch one space after choosing its ID from listSpaces.

```typescript
import { Plaky115 } from "plaky115";

const plaky115 = new Plaky115({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  const result = await plaky115.spaces.getSpace({
    spaceId: 1,
    expand: [],
  });

  console.log(result);
}

run();

```

### List boards

Discover boards in a space before reading or mutating items.

```typescript
import { Plaky115 } from "plaky115";

const plaky115 = new Plaky115({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  const result = await plaky115.boards.listBoards({
    spaceId: 1,
  });

  for await (const page of result) {
    console.log(page);
  }
}

run();

```

### Get a board

Fetch board schema and groups before building item field values.

```typescript
import { Plaky115 } from "plaky115";

const plaky115 = new Plaky115({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  const result = await plaky115.boards.getBoard({
    spaceId: 1,
    boardId: 1,
  });

  console.log(result);
}

run();

```

### List board items

Read board items with fields when preparing searches or exports.

```typescript
import { Plaky115 } from "plaky115";

const plaky115 = new Plaky115({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  const result = await plaky115.items.listItems({
    spaceId: 597793,
    boardId: 218717,
    expand: [],
  });

  for await (const page of result) {
    console.log(page);
  }
}

run();

```

### Create an item

Create one item after resolving the target space, board, and group.

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

### Get an item

Fetch a specific item before reading details or planning a mutation.

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
    expand: [],
  });

  console.log(result);
}

run();

```

### Delete an item

Remove one known item after explicit user confirmation.

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

### List subitems

Read child items under a parent item.

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
    expand: [],
  });

  for await (const page of result) {
    console.log(page);
  }
}

run();

```

### Update one item field

Change one field by field key after resolving the item.

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

### Update item fields

Apply a compact field-value object keyed by field title or field key.

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
    body:
      "{\"Status\":\"To do\",\"number-1\":50,\"Description\":\"Updated description\"}",
  });

  console.log(result);
}

run();

```

### List users

Resolve users before assigning people fields.

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

### Get current user

Check which Plaky user owns the current API key.

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

### List teams

Resolve teams before assigning person/team fields.

```typescript
import { Plaky115 } from "plaky115";

const plaky115 = new Plaky115({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  const result = await plaky115.teams.listTeams({});

  for await (const page of result) {
    console.log(page);
  }
}

run();

```

### Get a team

Fetch one team after choosing its ID from listTeams.

```typescript
import { Plaky115 } from "plaky115";

const plaky115 = new Plaky115({
  apiKeyAuth: "<YOUR_API_KEY_HERE>",
});

async function run() {
  const result = await plaky115.teams.getTeam({
    teamId: 1,
  });

  console.log(result);
}

run();

```

### List item comments

Read comment history for one item.

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

### Create item comment

Add a comment to a known item or reply to an existing comment.

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

### Update item comment

Replace a known comment's text.

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

### Delete item comment

Remove one known comment after explicit user confirmation.

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

### Replace comment reactions

Set or clear the current user's reactions on one comment.

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
<!-- End SDK Example Usage [usage] -->