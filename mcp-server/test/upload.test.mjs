import assert from "node:assert/strict";
import { test } from "node:test";

import {
  MAX_UPLOAD_BYTES_HARD_CEILING,
  UploadValidationError,
  buildFileUploadFormData,
  decodeBase64Upload,
  estimateBase64DecodedBytes,
  resolveMaxUploadBytes,
} from "../esm/runtime/upload.js";

test("canonical padded and unpadded base64 decodes to exact bytes", () => {
  assert.deepEqual([...decodeBase64Upload("aGVsbG8=")], [...Buffer.from("hello")]);
  assert.deepEqual([...decodeBase64Upload("YWJj")], [...Buffer.from("abc")]);
  assert.equal(estimateBase64DecodedBytes("aGVsbG8="), 5);
  assert.equal(estimateBase64DecodedBytes("YWJj"), 3);
});

test("invalid alphabet, whitespace, length, and padding are rejected", () => {
  for (const value of ["aGV sbG8=", "aGVsbG8", "aGVsbG8===", "ab=c", "####"]) {
    assert.throws(() => decodeBase64Upload(value), /canonical base64/i, value);
  }
});

test("configured upload limit is a positive integer with a 25 MiB hard ceiling", () => {
  assert.equal(resolveMaxUploadBytes(undefined), 25 * 1024 * 1024);
  assert.equal(resolveMaxUploadBytes("1024"), 1024);
  for (const value of ["0", "-1", "1.5", "nope", `${MAX_UPLOAD_BYTES_HARD_CEILING + 1}`]) {
    assert.throws(() => resolveMaxUploadBytes(value), /PLAKY115_MCP_MAX_UPLOAD_BYTES/);
  }
});

test("estimated oversize input fails before base64 decoding", () => {
  assert.throws(() => decodeBase64Upload("YWJj", { maxBytes: 2 }), /exceeds.*2 bytes/i);
});

test("decoder uses PLAKY115_MCP_MAX_UPLOAD_BYTES when no explicit limit is provided", () => {
  const previous = process.env.PLAKY115_MCP_MAX_UPLOAD_BYTES;
  process.env.PLAKY115_MCP_MAX_UPLOAD_BYTES = "2";
  try {
    assert.throws(() => decodeBase64Upload("YWJj"), /exceeds.*2 bytes/i);
  } finally {
    if (previous === undefined) delete process.env.PLAKY115_MCP_MAX_UPLOAD_BYTES;
    else process.env.PLAKY115_MCP_MAX_UPLOAD_BYTES = previous;
  }
});

test("FormData contains one named file with exact name, content type, and bytes", async () => {
  const form = buildFileUploadFormData({
    fileBase64: "aGVsbG8=",
    fileName: "hello.txt",
    contentType: "text/plain",
  }, { maxBytes: 5 });
  const entries = [...form.entries()];
  assert.equal(entries.length, 1);
  assert.equal(entries[0][0], "file");
  const file = entries[0][1];
  assert.equal(file.name, "hello.txt");
  assert.equal(file.type, "text/plain");
  assert.deepEqual([...new Uint8Array(await file.arrayBuffer())], [...Buffer.from("hello")]);
});

test("filename and content type are validated", () => {
  assert.throws(
    () => buildFileUploadFormData({ fileBase64: "", fileName: "bad\nname", contentType: "text/plain" }),
    /fileName/,
  );
  assert.throws(
    () => buildFileUploadFormData({ fileBase64: "", fileName: "bad\tname", contentType: "text/plain" }),
    /fileName/,
  );
  for (const fileName of ["../escape.txt", "nested/file.txt", "nested\\file.txt"]) {
    assert.throws(
      () => buildFileUploadFormData({ fileBase64: "", fileName, contentType: "text/plain" }),
      /fileName/,
      fileName,
    );
  }
  assert.doesNotThrow(() => buildFileUploadFormData({ fileBase64: "", fileName: "double..dot.txt", contentType: "text/plain" }));
  assert.doesNotThrow(() => buildFileUploadFormData({ fileBase64: "", fileName: "x".repeat(255), contentType: "text/plain; charset=utf-8" }));
  assert.throws(
    () => buildFileUploadFormData({ fileBase64: "", fileName: "x".repeat(256), contentType: "text/plain" }),
    (error) => error instanceof UploadValidationError && error.code === "invalid-filename" && error.path === "fileName",
  );
  assert.throws(
    () => buildFileUploadFormData({ fileBase64: "", fileName: "file", contentType: "bad\r\ntype" }),
    /contentType/,
  );
});

test("invalid upload input causes zero API calls", async () => {
  let calls = 0;
  const request = async () => { calls += 1; };
  const generatedHandler = async (input) => {
    const body = buildFileUploadFormData(input, { maxBytes: 2 });
    await request({ body });
  };
  await assert.rejects(
    generatedHandler({ fileBase64: "YWJj", fileName: "three.txt" }),
    /exceeds.*2 bytes/i,
  );
  assert.equal(calls, 0);
});
