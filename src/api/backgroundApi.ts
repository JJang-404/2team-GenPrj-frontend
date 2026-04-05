/**
 * backgroundApi.ts
 * ----------------
 * Sends the objects-only PNG blob to the FastAPI background-generation endpoint.
 * The endpoint is not yet implemented server-side; this client is ready to use
 * once `/api/generate-bg` is available.
 */

export async function sendObjectsToBackend(
  blob: Blob,
  endpoint = '/api/generate-bg',
): Promise<Response> {
  const formData = new FormData();
  formData.append('objects_png', blob, 'objects.png');

  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const msg = await response.text().catch(() => '');
    throw new Error(msg || `백엔드 전송 실패 (${response.status})`);
  }

  return response;
}
