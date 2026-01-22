import { createClient, Client } from "@libsql/client";

let client: Client | null = null;

/**
 * Get or create the database client.
 * Uses Turso in production, local file in development if no Turso URL provided.
 */
export function getDb(): Client {
  if (client) return client;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (url && authToken) {
    // Production: Use Turso
    client = createClient({
      url,
      authToken,
    });
  } else if (url && url.startsWith("file:")) {
    // Local development with file-based SQLite
    client = createClient({
      url,
    });
  } else {
    // Fallback to local file for development
    client = createClient({
      url: "file:local.db",
    });
  }

  return client;
}

/**
 * Close the database connection.
 */
export function closeDb(): void {
  if (client) {
    client.close();
    client = null;
  }
}
