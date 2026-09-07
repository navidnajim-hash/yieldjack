export function log(level: "info" | "warn" | "error", message: string) {
  const line = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}`;
  if (level === "error") console.error(line);
  else console.log(line);
}
