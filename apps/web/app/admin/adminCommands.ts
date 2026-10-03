export interface AdminCommand {
  label: string;
  group: string;
  path: string;
  keywords?: string;
}

export function filterAdminCommands(
  commands: AdminCommand[],
  query: string,
  limit = 7,
): AdminCommand[] {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return commands.slice(0, limit);
  }

  return commands
    .filter((command) =>
      `${command.label} ${command.group} ${command.keywords ?? ""}`
        .toLowerCase()
        .includes(normalizedQuery),
    )
    .slice(0, limit);
}
