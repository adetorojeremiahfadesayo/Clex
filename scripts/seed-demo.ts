// Planned for M1: idempotently seeds two synthetic companies. Refuses production.
if (process.env.APP_ENV === "production") {
  console.error("seed:demo refuses to run against production.");
  process.exit(2);
}
console.error("seed:demo is not implemented yet (planned M1). Nothing was written.");
process.exit(1);
