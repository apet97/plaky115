import { omitUndefined } from "./values.js";

export function stringField(value: string): string {
  return value;
}

export function statusField(value: string | number): string | number {
  return value;
}

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

export function personField(input: PersonFieldInput): PersonFieldOutput {
  return omitUndefined({
    users: input.users?.map((user) => (typeof user === "number" ? { id: user } : user)),
    teams: input.teams?.map((team) => (typeof team === "number" ? { id: team } : team)),
  }) as PersonFieldOutput;
}

export type TimelineFieldInput = { start: string; end: string };
export function timelineField(input: TimelineFieldInput): TimelineFieldInput {
  if (!input.start || !input.end) {
    throw new Error("timelineField: both start and end are required (ISO date strings)");
  }
  return input;
}

export type LinkFieldInput = { url: string; text?: string | undefined };
export function linkField(input: LinkFieldInput): LinkFieldInput {
  if (!input.url) throw new Error("linkField: url is required");
  return input;
}

export function numberField(value: number): number {
  if (!Number.isFinite(value)) throw new Error("numberField: value must be a finite number");
  return value;
}
