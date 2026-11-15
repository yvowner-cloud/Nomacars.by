/** Выполняется один раз при старте сервера: применяет миграции базы. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (!process.env.DATABASE_URL) {
    console.warn("[db] DATABASE_URL не задан — вход и избранное отключены");
    return;
  }
  const { migrate } = await import("./lib/server/migrations");
  try {
    await migrate();
    const { startFxScheduler } = await import("./lib/server/settings");
    startFxScheduler();
    const { publishExistingImportsOnce } = await import("./lib/server/catalog");
    await publishExistingImportsOnce();
  } catch (e) {
    console.error("[db] ошибка миграции:", (e as Error).message);
  }
}
