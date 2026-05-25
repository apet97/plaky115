# DateTimeConfiguration

Represents configuration for date-time attribute.

## Example Usage

```typescript
import { DateTimeConfiguration } from "plaky115/models";

let value: DateTimeConfiguration = {};
```

## Fields

| Field                                                        | Type                                                         | Required                                                     | Description                                                  |
| ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| `showCurrentYear`                                            | *boolean*                                                    | :heavy_minus_sign:                                           | Represents whether the year in the date format is displayed. |
| `showDayOfTheWeek`                                           | *boolean*                                                    | :heavy_minus_sign:                                           | Represents whether the name of the day is displayed.         |
| `showWeekNumbers`                                            | *boolean*                                                    | :heavy_minus_sign:                                           | Represents whether week number is displayed.                 |
| `alwaysKeepAddTimeOn`                                        | *boolean*                                                    | :heavy_minus_sign:                                           | Represents whether the time component is displayed.          |