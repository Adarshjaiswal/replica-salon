import { describe, expect, it } from "vitest";
import { filterAdminCommands, type AdminCommand } from "./adminCommands";

const commands: AdminCommand[] = [
  { label: "Dashboard", group: "Workspace", path: "/admin" },
  {
    label: "Roles and permissions",
    group: "User management",
    path: "/admin/roles",
    keywords: "rbac access control",
  },
  { label: "Services", group: "Catalogue", path: "/admin/services" },
];

describe("filterAdminCommands", () => {
  it("matches labels without case sensitivity", () => {
    expect(filterAdminCommands(commands, "SERV")).toEqual([commands[2]]);
  });

  it("matches command keywords", () => {
    expect(filterAdminCommands(commands, "rbac")).toEqual([commands[1]]);
  });

  it("limits empty-query suggestions", () => {
    expect(filterAdminCommands(commands, "", 2)).toEqual(commands.slice(0, 2));
  });
});
