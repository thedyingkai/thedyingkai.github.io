const configs = new Map();

export async function fetchResource(url, { signal, timeout = 12000, format = 'json', fetcher = fetch, ...options } = {}) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, timeout);
  try {
    const response = await fetcher(url, { cache: 'no-cache', ...options, signal: controller.signal });
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
    return await response[format]();
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}

// Share in-flight config requests across page modules, but allow failed loads
// to be retried. HTTP revalidation replaces timestamp-based cache busting.
export function loadConfig(name, { reload = false } = {}) {
  if (!/^[a-z][a-z-]*$/.test(name)) throw new Error(`Invalid config name: ${name}`);
  if (reload) configs.delete(name);
  if (!configs.has(name)) {
    const request = fetchResource(`/config/${name}.json`).catch(error => {
      if (configs.get(name) === request) configs.delete(name);
      throw error;
    });
    configs.set(name, request);
  }
  return configs.get(name);
}

export async function mapConcurrent(values, mapper, concurrency = 6) {
  const output = new Array(values.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < values.length) {
      const index = cursor++;
      try { output[index] = { status: 'fulfilled', value: await mapper(values[index], index) }; }
      catch (reason) { output[index] = { status: 'rejected', reason }; }
    }
  };
  await Promise.all(Array.from({ length: Math.min(values.length, Math.max(1, concurrency)) }, worker));
  return output;
}
