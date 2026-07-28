export const MAX_LIVE_RESPONSE_BYTES = 16 * 1024 * 1024;

export async function readBoundedLiveText(response, limit = MAX_LIVE_RESPONSE_BYTES) {
  const contentLength = response.headers.get("content-length");
  if (contentLength && /^\d+$/.test(contentLength) && BigInt(contentLength) > BigInt(limit)) {
    await response.body?.cancel();
    throw new Error(`live response exceeds ${limit} bytes`);
  }
  if (!response.body) return "";

  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) throw new Error(`live response exceeds ${limit} bytes`);
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

export function parseLiveJSON(text) {
  let rewritten = "";
  let index = 0;
  while (index < text.length) {
    if (text[index] === '"') {
      const start = index++;
      while (index < text.length) {
        if (text[index] === "\\") index += 2;
        else if (text[index++] === '"') break;
      }
      rewritten += text.slice(start, index);
      continue;
    }
    const token = text.slice(index).match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/)?.[0];
    if (token) {
      const exactInteger = !/[.eE]/.test(token);
      const unsafe = exactInteger
        && (BigInt(token) > BigInt(Number.MAX_SAFE_INTEGER) || BigInt(token) < BigInt(Number.MIN_SAFE_INTEGER));
      rewritten += unsafe ? JSON.stringify(token) : token;
      index += token.length;
      continue;
    }
    rewritten += text[index++];
  }
  return JSON.parse(rewritten);
}

export async function readBoundedLiveJSON(response, limit = MAX_LIVE_RESPONSE_BYTES) {
  const text = await readBoundedLiveText(response, limit);
  return text ? parseLiveJSON(text) : undefined;
}
