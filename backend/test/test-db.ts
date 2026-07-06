/**
 * The e2e suite runs against a dedicated `roommate_test` database so it can
 * wipe tables freely without touching dev data. Override with
 * TEST_DATABASE_URL (CI does not need to — its postgres service matches the
 * default).
 */
export function testDatabaseUrl(): string {
  return (
    process.env.TEST_DATABASE_URL ??
    'postgresql://roommate:roommate@localhost:5432/roommate_test?schema=public'
  );
}
