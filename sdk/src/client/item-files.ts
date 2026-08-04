import type { PlakyClient } from "./client.js";
import { idPathSegment } from "./path.js";
import { resolveExplicitIdempotencyKey } from "../runtime/idempotency.js";
import { assertArrayResult } from "../runtime/pagination.js";
import type { ResourceRequestOverrides } from "../runtime/types.js";
import type { SpaceId, BoardId, ItemId, ItemFileId } from "../runtime/ids.js";
import type { ItemFileDownloadShape, ItemFileShape } from "./shapes.js";
import type { components } from "../generated/types.js";
import { normalizeBlobUploadPlan, normalizeItemFileUpdatePlan } from "../workflows/mutation-plans.js";

export type ItemFileUpdateBody = components["schemas"]["ItemFileUpdateRequest"];

export type ItemFileListParams = {
  spaceId: SpaceId | string | number;
  boardId: BoardId | string | number;
  itemId: ItemId | string | number;
};

export type ItemFileGetParams = ItemFileListParams & {
  itemFileId: ItemFileId | string | number;
};

export type ItemFileUploadParams = ItemFileListParams & {
  file: Blob;
  fileName?: string | undefined;
  idempotencyKey?: string | undefined;
};

export type ItemFileUpdateParams = ItemFileGetParams & {
  body: ItemFileUpdateBody;
  idempotencyKey?: string | undefined;
};

export type ItemFileDeleteParams = ItemFileGetParams & {
  idempotencyKey?: string | undefined;
};

/** Item files resource. Access via `client.itemFiles`. */
export class ItemFilesResource {
  constructor(private readonly client: PlakyClient) {}

  async list(params: ItemFileListParams, options?: ResourceRequestOverrides): Promise<ItemFileShape[]> {
    const response = await this.client.request<unknown>(
      {
        method: "GET",
        path: itemFilesPath(params),
        operationId: "listItemFiles",
      },
      options,
    );
    return assertArrayResult<ItemFileShape>(response, "listItemFiles");
  }

  async upload(params: ItemFileUploadParams, options?: ResourceRequestOverrides): Promise<ItemFileShape> {
    const normalized = await normalizeBlobUploadPlan(params);
    const body = new FormData();
    const mediaType = normalized.upload?.mediaType ?? "application/octet-stream";
    const file = params.file.type === mediaType
      ? params.file
      : new Blob([params.file], { type: mediaType });
    if (params.fileName === undefined) body.append("file", file);
    else body.append("file", file, normalized.upload?.fileName);

    const idempotencyKey = resolveExplicitIdempotencyKey(params, options);
    return this.client.request<ItemFileShape>(
      {
        method: "POST",
        path: itemFilesPath(params),
        body,
        operationId: "uploadItemFile",
      },
      { ...options, idempotencyKey },
    );
  }

  get(params: ItemFileGetParams, options?: ResourceRequestOverrides): Promise<ItemFileShape> {
    return this.client.request<ItemFileShape>(
      {
        method: "GET",
        path: itemFilePath(params),
        operationId: "getItemFile",
      },
      options,
    );
  }

  async getDownload(params: ItemFileGetParams, options?: ResourceRequestOverrides): Promise<ItemFileDownloadShape> {
    const result = await this.client.request<ItemFileDownloadShape>(
      {
        method: "GET",
        path: `${itemFilePath(params)}/download`,
        operationId: "getItemFileDownload",
      },
      options,
    );
    return {
      ...(result.url !== undefined ? { url: result.url } : {}),
      ...(result.expiresInSeconds !== undefined ? { expiresInSeconds: result.expiresInSeconds } : {}),
    };
  }

  update(params: ItemFileUpdateParams, options?: ResourceRequestOverrides): Promise<ItemFileShape> {
    const normalized = normalizeItemFileUpdatePlan(params);
    const idempotencyKey = resolveExplicitIdempotencyKey(params, options);
    return this.client.request<ItemFileShape>(
      {
        method: "PUT",
        path: itemFilePath(params),
        body: normalized.body,
        operationId: "updateItemFile",
      },
      { ...options, idempotencyKey },
    );
  }

  async delete(params: ItemFileDeleteParams, options?: ResourceRequestOverrides): Promise<void> {
    const idempotencyKey = resolveExplicitIdempotencyKey(params, options);
    await this.client.request<void>(
      {
        method: "DELETE",
        path: itemFilePath(params),
        operationId: "deleteItemFile",
        responseType: "void",
      },
      { ...options, idempotencyKey },
    );
  }
}

function itemFilesPath(params: ItemFileListParams): string {
  return `/v1/public/spaces/${idPathSegment(params.spaceId)}/boards/${idPathSegment(params.boardId)}/items/${idPathSegment(params.itemId)}/files`;
}

function itemFilePath(params: ItemFileGetParams): string {
  return `${itemFilesPath(params)}/${idPathSegment(params.itemFileId)}`;
}
