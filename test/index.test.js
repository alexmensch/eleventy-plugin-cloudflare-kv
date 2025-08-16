import { describe, it } from "mocha";
import { expect } from "chai";
import kvCollectionsPlugin from "../index.js";

describe("eleventy-cloudflare-kv", () => {
  it("should export a function", () => {
    expect(kvCollectionsPlugin).to.be.a("function");
  });

  it("should accept eleventyConfig and userConfig parameters", () => {
    const mockEleventyConfig = {
      on: () => {},
      addCollection: () => {}
    };

    // Should not throw with valid config
    expect(() => {
      kvCollectionsPlugin(mockEleventyConfig, {
        metadata: {
          permalink: () => "/test/"
        }
      });
    }).to.not.throw();
  });

  it("should use default environment variable names when not provided", () => {
    const mockEleventyConfig = {
      on: () => {},
      addCollection: () => {}
    };

    // Should not throw with minimal config
    expect(() => {
      kvCollectionsPlugin(mockEleventyConfig, {
        metadata: {
          permalink: () => "/test/"
        }
      });
    }).to.not.throw();
  });
});
