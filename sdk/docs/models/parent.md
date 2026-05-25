# Parent

Represents ID of the parent for subitem, it can be expanded to include full item details. It is non-null only for subitems.


## Supported Types

### `models.ItemResponse`

```typescript
const value: models.ItemResponse = {
  board: 569087,
  space: {
    boards: [
      {
        defaultValues: {
          defaultAttributes: {
            "status-1": "1",
            "tag-1": [
              "1",
              "2",
            ],
          },
        },
      },
    ],
  },
  parent: 237542,
  fields: [
    {
      key: "status-1",
    },
  ],
  subitems: [
    {
      board: {
        defaultValues: {
          defaultAttributes: {
            "status-1": "1",
            "tag-1": [
              "1",
              "2",
            ],
          },
        },
      },
      space: {
        boards: [
          {
            defaultValues: {
              defaultAttributes: {
                "status-1": "1",
                "tag-1": [
                  "1",
                  "2",
                ],
              },
            },
          },
        ],
      },
      parent: 979932,
      fields: [
        {
          key: "status-1",
        },
      ],
    },
  ],
};
```

### `number`

```typescript
const value: number = 128403;
```

