import { describe, expect, it } from "vitest";

import { appConfig } from "@/config/app";

import { readImage, readImages, readJobFile } from "./read-attachment";

const png = (name = "ad.png", bytes = [1, 2, 3]) => new File([new Uint8Array(bytes)], name, { type: "image/png" });

describe("readImage", () => {
  it("turns an image into a base64 data URL", async () => {
    const result = await readImage(png());
    expect(result).toMatchObject({ ok: true, value: { name: "ad.png", mimeType: "image/png" } });
    expect(result.ok && result.value.dataUrl).toBe("data:image/png;base64,AQID");
  });

  it("rejects other file types and oversized images", async () => {
    const pdf = new File(["x"], "ad.pdf", { type: "application/pdf" });
    expect(await readImage(pdf)).toMatchObject({ ok: false, message: expect.stringContaining("not a PNG") });

    const big = new File([new Uint8Array(appConfig.maxImageBytes + 1)], "big.png", { type: "image/png" });
    expect(await readImage(big)).toMatchObject({ ok: false, message: expect.stringContaining("larger than 8 MB") });
  });

  it("gives each image its own ID", async () => {
    const a = await readImage(png());
    const b = await readImage(png());
    expect(a.ok && b.ok && a.value.id !== b.value.id).toBe(true);
  });
});

describe("readImages", () => {
  it("keeps what fits and reports each file it could not take", async () => {
    const text = new File(["x"], "notes.txt", { type: "text/plain" });
    const { items, errors } = await readImages([png("a.png"), text, png("b.png"), png("c.png")], 2);

    expect(items.map((item) => item.name)).toEqual(["a.png", "b.png"]);
    expect(errors).toHaveLength(2);
    expect(errors[0]).toContain("notes.txt");
    expect(errors[1]).toContain("c.png was left out");
  });

  it("takes nothing when there is no room", async () => {
    const { items, errors } = await readImages([png()], 0);
    expect(items).toEqual([]);
    expect(errors).toHaveLength(1);
  });
});

describe("readJobFile", () => {
  it("decodes .txt and .md files as text, whatever their reported type", async () => {
    const txt = await readJobFile(new File(["Build things."], "ad.txt", { type: "text/plain" }));
    expect(txt).toMatchObject({ ok: true, value: { kind: "text", name: "ad.txt", text: "Build things." } });

    const md = await readJobFile(new File(["# Role"], "ad.md", { type: "" }));
    expect(md).toMatchObject({ ok: true, value: { kind: "text", text: "# Role" } });
  });

  it("turns a PDF into media to be read by the model", async () => {
    const result = await readJobFile(new File([new Uint8Array([1, 2, 3])], "ad.pdf", { type: "application/pdf" }));
    expect(result).toMatchObject({
      ok: true,
      value: { kind: "media", item: { name: "ad.pdf", mimeType: "application/pdf", dataUrl: "data:application/pdf;base64,AQID" } },
    });
  });

  it("rejects unsupported and oversized files", async () => {
    expect(await readJobFile(new File(["x"], "ad.docx"))).toMatchObject({ ok: false });

    const big = new File([new Uint8Array(appConfig.maxFileBytes + 1)], "big.pdf", { type: "application/pdf" });
    expect(await readJobFile(big)).toMatchObject({ ok: false, message: expect.stringContaining("larger than 10 MB") });
  });
});
