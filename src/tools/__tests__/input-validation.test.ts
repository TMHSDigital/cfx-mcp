import { describe, it, expect, vi, afterEach } from "vitest";
import { lookupNative, isValidHost, clearCache } from "../../utils/cfx-api.js";
import { getNativeHandler } from "../getNative.js";
import { queryServerHandler } from "../queryServer.js";
import { searchReleasesHandler } from "../searchReleases.js";

// Minimal mock natives DB for unit tests
const MOCK_DB = {
  ENTITY: {
    "0x3FEF770D40960D5A": {
      name: "GET_ENTITY_COORDS",
      hash: "0x3FEF770D40960D5A",
      apiset: "client",
      params: [
        { name: "entity", type: "Entity" },
        { name: "alive", type: "BOOL" },
      ],
      return_type: "Vector3",
      description: "Gets the coordinates of an entity.",
    },
    "0xABC00000000AAAAA": {
      name: "SET_ENTITY_COORDS",
      hash: "0xABC00000000AAAAA",
      apiset: "client",
      params: [],
      return_type: "void",
      description: "Sets entity coordinates.",
    },
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
  clearCache();
});

// ---- lookupNative unit tests ----

describe("lookupNative", () => {
  it("finds native by exact name (case-insensitive)", () => {
    const result = lookupNative(MOCK_DB, "get_entity_coords");
    expect(result).not.toBeNull();
    expect(Array.isArray(result)).toBe(false);
    expect((result as { name: string }).name).toBe("GET_ENTITY_COORDS");
  });

  it("finds native by uppercase exact name", () => {
    const result = lookupNative(MOCK_DB, "GET_ENTITY_COORDS");
    expect(result).not.toBeNull();
    expect((result as { name: string }).name).toBe("GET_ENTITY_COORDS");
  });

  it("finds native by hex hash", () => {
    const result = lookupNative(MOCK_DB, "0x3FEF770D40960D5A");
    expect(result).not.toBeNull();
    expect((result as { name: string }).name).toBe("GET_ENTITY_COORDS");
  });

  it("returns array for partial name match", () => {
    const result = lookupNative(MOCK_DB, "ENTITY");
    expect(Array.isArray(result)).toBe(true);
    expect((result as unknown[]).length).toBe(2);
  });

  it("returns null for unknown native", () => {
    const result = lookupNative(MOCK_DB, "NONEXISTENT_NATIVE_XYZ");
    expect(result).toBeNull();
  });

  it("returns null for unknown hash", () => {
    const result = lookupNative(MOCK_DB, "0xDEADBEEFDEADBEEF");
    expect(result).toBeNull();
  });
});

// ---- isValidHost unit tests ----

describe("isValidHost", () => {
  it("accepts IPv4 address", () => {
    expect(isValidHost("192.168.1.1")).toBe(true);
    expect(isValidHost("127.0.0.1")).toBe(true);
  });

  it("accepts plain hostname", () => {
    expect(isValidHost("play.example.com")).toBe(true);
    expect(isValidHost("server")).toBe(true);
  });

  it("rejects URL with http scheme", () => {
    expect(isValidHost("http://evil.com")).toBe(false);
  });

  it("rejects host with path component", () => {
    expect(isValidHost("evil.com/path")).toBe(false);
  });

  it("rejects host with embedded port colon", () => {
    expect(isValidHost("evil.com:9999")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidHost("")).toBe(false);
  });
});

// ---- cfx_getNative happy-path test (mocked fetch) ----

describe("cfx_getNative", () => {
  it("returns native data on happy path", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_DB,
      }),
    );

    const result = await getNativeHandler({ query: "GET_ENTITY_COORDS" });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("GET_ENTITY_COORDS");
  });

  it("returns error response when native is not found", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_DB,
      }),
    );

    const result = await getNativeHandler({ query: "TOTALLY_UNKNOWN_NATIVE" });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("No native found");
  });

  it("returns error response when fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValueOnce(new Error("Network error")),
    );

    const result = await getNativeHandler({ query: "GET_ENTITY_COORDS" });

    expect(result.isError).toBe(true);
  });
});

// ---- cfx_queryServer validation and failure tests ----

describe("cfx_queryServer", () => {
  it("rejects host with URL scheme", async () => {
    const result = await queryServerHandler({
      host: "http://evil.com",
      port: 30120,
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Invalid host");
  });

  it("rejects host with path component", async () => {
    const result = await queryServerHandler({
      host: "evil.com/info.json",
      port: 30120,
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Invalid host");
  });

  it("returns graceful error when server is unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("ECONNREFUSED")),
    );

    const result = await queryServerHandler({
      host: "127.0.0.1",
      port: 30120,
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Could not reach server");
  });

  it("returns server info on happy path", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            serverName: "Test Server",
            gametype: "Freeroam",
            mapname: "Los Santos",
            server: "FXServer v1.0.0",
            resources: ["spawnmanager"],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ name: "Player1", id: 1, ping: 45 }],
        }),
    );

    const result = await queryServerHandler({ host: "127.0.0.1", port: 30120 });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("Test Server");
    expect(result.content[0].text).toContain("Player1");
  });
});

// ---- cfx_searchReleases happy-path test (mocked fetch) ----

describe("cfx_searchReleases", () => {
  it("returns topics on happy path", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          topics: [
            {
              id: 1234,
              title: "ESX Framework",
              slug: "esx-framework",
              created_at: "2022-01-01T00:00:00.000Z",
              reply_count: 500,
              tags: ["esx", "framework"],
              posters: [
                {
                  description: "Original Poster",
                  user: { username: "esx-dev" },
                },
              ],
            },
          ],
        }),
      }),
    );

    const result = await searchReleasesHandler({ query: "esx", limit: 10 });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("ESX Framework");
    expect(result.content[0].text).toContain("forum.cfx.re");
  });

  it("returns message when no results found", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ topics: [] }),
      }),
    );

    const result = await searchReleasesHandler({
      query: "xyznonexistentquery",
      limit: 10,
    });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("No releases found");
  });

  it("returns error response when API is unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 503,
      }),
    );

    const result = await searchReleasesHandler({ query: "esx", limit: 5 });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("503");
  });
});
