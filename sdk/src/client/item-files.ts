import type { PlakyClient } from "./client.js";
import { idPathSegment } from "./path.js";
import { resolveExplicitIdempotencyKey } from "../runtime/idempotency.js";
import type { PlakyRequestOverrides } from "../runtime/types.js";
import type { SpaceId, BoardId, ItemId, ItemFileId } from "../runtime/ids.js";
import type { ItemFileDownloadShape, ItemFileShape } from "./shapes.js";
import type { components } from "../generated/types.js";

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

  list(params: ItemFileListParams, options?: PlakyRequestOverrides): Promise<ItemFileShape[]> {
    return this.client.request<ItemFileShape[]>(
      {
        method: "GET",
        path: itemFilesPath(params),
        operationId: "listItemFiles",
      },
      options,
    );
  }

  upload(params: ItemFileUploadParams, options?: PlakyRequestOverrides): Promise<ItemFileShape> {
    const body = new FormData();
    if (params.fileName === undefined) body.append("file", params.file);
    else body.append("file", params.file, params.fileName);

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

  get(params: ItemFileGetParams, options?: PlakyRequestOverrides): Promise<ItemFileShape> {
    return this.client.request<ItemFileShape>(
      {
        method: "GET",
        path: itemFilePath(params),
        operationId: "getItemFile",
      },
      options,
    );
  }

  async getDownload(params: ItemFileGetParams, options?: PlakyRequestOverrides): Promise<ItemFileDownloadShape> {
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

  update(params: ItemFileUpdateParams, options?: PlakyRequestOverrides): Promise<ItemFileShape> {
    const idempotencyKey = resolveExplicitIdempotencyKey(params, options);
    return this.client.request<ItemFileShape>(
      {
        method: "PUT",
        path: itemFilePath(params),
        body: params.body,
        operationId: "updateItemFile",
      },
      { ...options, idempotencyKey },
    );
  }

  async delete(params: ItemFileDeleteParams, options?: PlakyRequestOverrides): Promise<void> {
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
