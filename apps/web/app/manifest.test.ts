import { describe, expect, it } from "vitest";
import manifest from "./manifest";

describe("PWA manifest", () => {
  it("defines an installable standalone customer application", () => {
    const value = manifest();

    expect(value).toMatchObject({
      id: "/",
      name: "Replica Home Saloon Service",
      short_name: "Replica Salon",
      start_url: "/",
      scope: "/",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#6D3C8A",
    });
    expect(value.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sizes: "192x192",
          type: "image/png",
          purpose: "any",
        }),
        expect.objectContaining({
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        }),
      ]),
    );
    expect(value.shortcuts).toHaveLength(2);
  });
});
