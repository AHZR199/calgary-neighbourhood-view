export class LookupInputError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

// cap the json body size before parsing; only string fields are allowed
export async function readLookupFields(request: Request, fields: string[]) {
  if (
    request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !==
    'application/json'
  )
    throw new LookupInputError('Send a JSON request.', 415);
  const limit = 1024;
  if (Number(request.headers.get('content-length')) > limit)
    throw new LookupInputError('Request is too large.', 413);
  if (!request.body) throw new LookupInputError('A request body is required.');
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0,
    text = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > limit) {
        await reader.cancel();
        throw new LookupInputError('Request is too large.', 413);
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } finally {
    reader.releaseLock();
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new LookupInputError('Invalid JSON request.');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
    throw new LookupInputError('Invalid lookup fields.');
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (!fields.includes(key) || typeof value !== 'string')
      throw new LookupInputError('Invalid lookup fields.');
    result[key] = value;
  }
  return result;
}
