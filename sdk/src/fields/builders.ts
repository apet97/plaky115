import { omitUndefined } from "./values.js";

/**
 * Build a text field value.
 *
 * @param value - The text to set.
 * @returns The value, ready to pass to `fieldValues`.
 */
export function stringField(value: string): string {
  return value;
}

/**
 * Build a status field value (label or id).
 *
 * @param value - The status label or numeric id.
 * @returns The value, ready to pass to `fieldValues`.
 */
export function statusField(value: string | number): string | number {
  return value;
}

/**
 * Build a tag field value from one or more labels/ids.
 *
 * @param values - Tag labels or ids.
 * @returns The values, ready to pass to `fieldValues`.
 */
export function tagField(values: Array<string | number>): Array<string | number> {
  return values;
}

export type PersonRef = number | { id?: number | undefined; email?: string | undefined };
export type TeamRef = number | { id?: number | undefined; title?: string | undefined };

export type PersonFieldInput = {
  users?: PersonRef[] | undefined;
  teams?: TeamRef[] | undefined;
};

export type PersonFieldOutput = {
  users?: Array<{ id?: number | undefined; email?: string | undefined }> | undefined;
  teams?: Array<{ id?: number | undefined; title?: string | undefined }> | undefined;
};

/**
 * Build a person field value. Bare numbers are treated as user/team ids and
 * normalized to `{ id }` objects.
 *
 * @param input - `users` and/or `teams` as ids or `{ id, email|title }` refs.
 * @returns The normalized person field value.
 */
export function personField(input: PersonFieldInput): PersonFieldOutput {
  return omitUndefined({
    users: input.users?.map((user) => (typeof user === "number" ? { id: user } : user)),
    teams: input.teams?.map((team) => (typeof team === "number" ? { id: team } : team)),
  }) as PersonFieldOutput;
}

export type TimelineFieldInput = { start: string; end: string };
/**
 * Build a timeline (date range) field value.
 *
 * @param input - `start` and `end` as ISO date strings.
 * @returns The timeline value.
 * @throws {Error} If either `start` or `end` is empty.
 */
export function timelineField(input: TimelineFieldInput): TimelineFieldInput {
  if (!input.start || !input.end) {
    throw new Error("timelineField: both start and end are required (ISO date strings)");
  }
  return input;
}

export type LinkFieldInput = { url: string; text?: string | undefined };
/**
 * Build a link field value.
 *
 * @param input - `url` and optional display `text`.
 * @returns The link value.
 * @throws {Error} If `url` is empty.
 */
export function linkField(input: LinkFieldInput): LinkFieldInput {
  if (!input.url) throw new Error("linkField: url is required");
  return input;
}

/**
 * Build a number field value.
 *
 * @param value - A finite number.
 * @returns The value.
 * @throws {Error} If `value` is not finite.
 */
export function numberField(value: number): number {
  if (!Number.isFinite(value)) throw new Error("numberField: value must be a finite number");
  return value;
}
