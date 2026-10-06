interface ApiEnvelope<T> {
  data?: T;
}

function publicApiBase(): string {
  const configured =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

  return configured.startsWith("/")
    ? `http://api:4000${configured}`
    : configured.replace(/\/$/, "");
}

export async function fetchPublicApi<T>(
  path: string,
  revalidate = 60,
): Promise<T | null> {
  try {
    const response = await fetch(`${publicApiBase()}${path}`, {
      next: { revalidate },
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as ApiEnvelope<T>;
    return payload.data ?? null;
  } catch {
    return null;
  }
}
