const sinon = require("sinon");
const sinonChai = require("sinon-chai").default;
const chai = require("chai");
const chaiAsPromised = require("chai-as-promised").default;
const kvCollectionsPlugin = require("../index.js").default;

chai.use(sinonChai);
chai.use(chaiAsPromised);

const expect = chai.expect;

describe("eleventy-cloudflare-kv", () => {
  let fetchStub;
  let consoleLogStub;
  let consoleErrorStub;

  beforeEach(() => {
    fetchStub = sinon.stub(globalThis, "fetch");
    consoleLogStub = sinon.stub(console, "log");
    consoleErrorStub = sinon.stub(console, "error");

    // Mock process.env
    sinon.stub(process, "env").value({
      CLOUDFLARE_ACCOUNT_ID: "test-account-id",
      CLOUDFLARE_KV_NS_ID: "test-namespace-id",
      CLOUDFLARE_API_TOKEN: "test-api-token"
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("Plugin initialization", () => {
    it("should export a function", () => {
      expect(kvCollectionsPlugin).to.be.a("function");
    });

    it("should accept eleventyConfig and userConfig parameters", () => {
      const mockEleventyConfig = {
        on: sinon.stub(),
        addCollection: sinon.stub()
      };

      expect(() => {
        kvCollectionsPlugin(mockEleventyConfig, {
          metadata: {
            permalink: () => "/test/"
          }
        });
      }).to.not.throw();

      expect(mockEleventyConfig.on).to.have.been.calledWith("eleventy.before");
    });

    it("should use default environment variable names when not provided", () => {
      const mockEleventyConfig = {
        on: sinon.stub(),
        addCollection: sinon.stub()
      };

      kvCollectionsPlugin(mockEleventyConfig, {});

      expect(mockEleventyConfig.on).to.have.been.calledOnce;
    });

    it("should use custom environment variable names when provided", () => {
      const mockEleventyConfig = {
        on: sinon.stub(),
        addCollection: sinon.stub()
      };

      const customConfig = {
        accountId: "CUSTOM_ACCOUNT_ID",
        namespaceId: "CUSTOM_NAMESPACE_ID",
        cloudflareAPIToken: "CUSTOM_API_TOKEN"
      };

      kvCollectionsPlugin(mockEleventyConfig, customConfig);

      expect(mockEleventyConfig.on).to.have.been.calledOnce;
    });

    it("should handle quiet mode configuration", () => {
      const mockEleventyConfig = {
        on: sinon.stub(),
        addCollection: sinon.stub()
      };

      kvCollectionsPlugin(mockEleventyConfig, { quiet: true });

      expect(mockEleventyConfig.on).to.have.been.calledOnce;
    });
  });

  describe("KV API Functions", () => {
    describe("fetchFromKV", () => {
      it("should successfully fetch keys from KV", async () => {
        // Mock successful response
        const mockResponse = {
          ok: true,
          json: sinon.stub().resolves({
            result: [{ name: "posts/test-post" }, { name: "pages/about" }]
          })
        };
        fetchStub.resolves(mockResponse);

        const mockEleventyConfig = {
          on: sinon.stub(),
          addCollection: sinon.stub()
        };

        kvCollectionsPlugin(mockEleventyConfig, {});

        // Trigger the eleventy.before event
        const beforeCallback = mockEleventyConfig.on.getCall(0).args[1];
        await beforeCallback();

        expect(fetchStub).to.have.been.calledWith(
          "https://api.cloudflare.com/client/v4/accounts/test-account-id/storage/kv/namespaces/test-namespace-id/keys",
          {
            headers: {
              Authorization: "Bearer test-api-token",
              "Content-Type": "application/json"
            }
          }
        );
      });

      it("should throw error on failed KV API request", async () => {
        // Mock failed response
        const mockResponse = {
          ok: false,
          status: 401,
          statusText: "Unauthorized"
        };
        fetchStub.resolves(mockResponse);

        const mockEleventyConfig = {
          on: sinon.stub(),
          addCollection: sinon.stub()
        };

        kvCollectionsPlugin(mockEleventyConfig, {});

        const beforeCallback = mockEleventyConfig.on.getCall(0).args[1];
        await beforeCallback();

        expect(consoleErrorStub).to.have.been.called;
      });
    });

    describe("fetchKVValue", () => {
      it("should fetch individual KV values", async () => {
        // Mock keys response
        const keysResponse = {
          ok: true,
          json: sinon.stub().resolves({
            result: [{ name: "posts/test-post" }]
          })
        };

        // Mock value response
        const valueResponse = {
          ok: true,
          status: 200,
          text: sinon.stub().resolves(`---
title: Test Post
---
This is test content`)
        };

        fetchStub
          .onFirstCall()
          .resolves(keysResponse)
          .onSecondCall()
          .resolves(valueResponse);

        const mockEleventyConfig = {
          on: sinon.stub(),
          addCollection: sinon.stub()
        };

        kvCollectionsPlugin(mockEleventyConfig, {});

        const beforeCallback = mockEleventyConfig.on.getCall(0).args[1];
        await beforeCallback();

        expect(fetchStub).to.have.been.calledTwice;
        expect(mockEleventyConfig.addCollection).to.have.been.calledWith(
          "posts"
        );
      });

      it("should handle 404 responses for missing keys", async () => {
        const keysResponse = {
          ok: true,
          json: sinon.stub().resolves({
            result: [{ name: "posts/missing" }]
          })
        };

        const valueResponse = {
          ok: false,
          status: 404
        };

        fetchStub
          .onFirstCall()
          .resolves(keysResponse)
          .onSecondCall()
          .resolves(valueResponse);

        const mockEleventyConfig = {
          on: sinon.stub(),
          addCollection: sinon.stub()
        };

        kvCollectionsPlugin(mockEleventyConfig, {});

        const beforeCallback = mockEleventyConfig.on.getCall(0).args[1];
        await beforeCallback();

        expect(consoleErrorStub).to.have.been.called;
      });

      it("should handle failed value fetch requests", async () => {
        const keysResponse = {
          ok: true,
          json: sinon.stub().resolves({
            result: [{ name: "posts/error" }]
          })
        };

        const valueResponse = {
          ok: false,
          status: 500,
          statusText: "Internal Server Error"
        };

        fetchStub
          .onFirstCall()
          .resolves(keysResponse)
          .onSecondCall()
          .resolves(valueResponse);

        const mockEleventyConfig = {
          on: sinon.stub(),
          addCollection: sinon.stub()
        };

        kvCollectionsPlugin(mockEleventyConfig, {});

        const beforeCallback = mockEleventyConfig.on.getCall(0).args[1];
        await beforeCallback();

        expect(consoleErrorStub).to.have.been.called;
      });
    });
  });

  describe("Environment variable validation", () => {
    const requiredEnvVars = [
      "CLOUDFLARE_ACCOUNT_ID",
      "CLOUDFLARE_API_TOKEN",
      "CLOUDFLARE_KV_NS_ID"
    ];

    for (const varName of requiredEnvVars) {
      it(`should throw error when ${varName} is missing`, async () => {
        const backup = process.env[varName];
        delete process.env[varName];

        const mockEleventyConfig = {
          on: sinon.stub(),
          addCollection: sinon.stub()
        };

        kvCollectionsPlugin(mockEleventyConfig);

        // Grab the registered "eleventy.before" callback
        const beforeCallback = mockEleventyConfig.on.getCall(0).args[1];

        // Assert that calling it rejects with the missing var
        await expect(beforeCallback()).to.be.rejectedWith(new RegExp(varName));

        // restore
        if (backup !== undefined) {
          process.env[varName] = backup;
        }
      });
    }
  });

  describe("Collection processing", () => {
    it("should handle empty KV namespace", async () => {
      const keysResponse = {
        ok: true,
        json: sinon.stub().resolves({
          result: []
        })
      };

      fetchStub.resolves(keysResponse);

      const mockEleventyConfig = {
        on: sinon.stub(),
        addCollection: sinon.stub()
      };

      kvCollectionsPlugin(mockEleventyConfig, {});

      const beforeCallback = mockEleventyConfig.on.getCall(0).args[1];
      await beforeCallback();

      expect(consoleLogStub).to.have.been.calledWith(
        "❌ No keys found in KV namespace"
      );
      expect(mockEleventyConfig.addCollection).to.not.have.been.called;
    });

    it("should handle keys without slashes (no collection)", async () => {
      const keysResponse = {
        ok: true,
        json: sinon.stub().resolves({
          result: [{ name: "standalone-page" }]
        })
      };

      const valueResponse = {
        ok: true,
        status: 200,
        text: sinon.stub().resolves(`---
title: Standalone Page
---
Content here`)
      };

      fetchStub
        .onFirstCall()
        .resolves(keysResponse)
        .onSecondCall()
        .resolves(valueResponse);

      const mockEleventyConfig = {
        on: sinon.stub(),
        addCollection: sinon.stub()
      };

      kvCollectionsPlugin(mockEleventyConfig, {});

      const beforeCallback = mockEleventyConfig.on.getCall(0).args[1];
      await beforeCallback();

      expect(mockEleventyConfig.addCollection).to.have.been.calledWith("none");
    });

    it("should process multiple collections correctly", async () => {
      const keysResponse = {
        ok: true,
        json: sinon.stub().resolves({
          result: [
            { name: "posts/post1" },
            { name: "posts/post2" },
            { name: "pages/about" }
          ]
        })
      };

      const valueResponse1 = {
        ok: true,
        status: 200,
        text: sinon.stub().resolves(`---
title: Post 1
---
Content 1`)
      };

      const valueResponse2 = {
        ok: true,
        status: 200,
        text: sinon.stub().resolves(`---
title: Post 2
---
Content 2`)
      };

      const valueResponse3 = {
        ok: true,
        status: 200,
        text: sinon.stub().resolves(`---
title: About
---
About content`)
      };

      fetchStub
        .onCall(0)
        .resolves(keysResponse)
        .onCall(1)
        .resolves(valueResponse1)
        .onCall(2)
        .resolves(valueResponse2)
        .onCall(3)
        .resolves(valueResponse3);

      const mockEleventyConfig = {
        on: sinon.stub(),
        addCollection: sinon.stub()
      };

      kvCollectionsPlugin(mockEleventyConfig, {});

      const beforeCallback = mockEleventyConfig.on.getCall(0).args[1];
      await beforeCallback();

      expect(mockEleventyConfig.addCollection).to.have.been.calledWith("posts");
      expect(mockEleventyConfig.addCollection).to.have.been.calledWith("pages");
      expect(consoleLogStub).to.have.been.calledWith(
        '📁 Collection "posts": 2 items'
      );
      expect(consoleLogStub).to.have.been.calledWith(
        '📁 Collection "pages": 1 items'
      );
    });

    it("should apply metadata functions correctly", async () => {
      const keysResponse = {
        ok: true,
        json: sinon.stub().resolves({
          result: [{ name: "posts/test" }]
        })
      };

      const valueResponse = {
        ok: true,
        status: 200,
        text: sinon.stub().resolves(`---
title: Test Post
---
Content`)
      };

      fetchStub
        .onFirstCall()
        .resolves(keysResponse)
        .onSecondCall()
        .resolves(valueResponse);

      const mockEleventyConfig = {
        on: sinon.stub(),
        addCollection: sinon.stub()
      };

      const metadataFunction = sinon.stub().returns("/posts/test/");

      kvCollectionsPlugin(mockEleventyConfig, {
        metadata: {
          permalink: metadataFunction,
          staticValue: "test-value"
        }
      });

      const beforeCallback = mockEleventyConfig.on.getCall(0).args[1];
      await beforeCallback();

      // Get the collection callback and execute it
      const addCollectionCall = mockEleventyConfig.addCollection.getCall(0);
      expect(addCollectionCall.args[0]).to.equal("posts");

      const collectionCallback = addCollectionCall.args[1];
      const collection = collectionCallback({});

      expect(collection).to.have.length(1);
      expect(collection[0]).to.have.property("permalink", "/posts/test/");
      expect(collection[0]).to.have.property("staticValue", "test-value");
      expect(collection[0]).to.have.property("title", "Test Post");
      expect(collection[0]).to.have.property("kvKey", "posts/test");

      expect(metadataFunction).to.have.been.calledOnce;
    });

    it("should handle quiet mode", async () => {
      const keysResponse = {
        ok: true,
        json: sinon.stub().resolves({
          result: [{ name: "posts/test" }]
        })
      };

      const valueResponse = {
        ok: true,
        status: 200,
        text: sinon.stub().resolves(`---
title: Test
---
Content`)
      };

      fetchStub
        .onFirstCall()
        .resolves(keysResponse)
        .onSecondCall()
        .resolves(valueResponse);

      const mockEleventyConfig = {
        on: sinon.stub(),
        addCollection: sinon.stub()
      };

      kvCollectionsPlugin(mockEleventyConfig, { quiet: true });

      const beforeCallback = mockEleventyConfig.on.getCall(0).args[1];
      await beforeCallback();

      // In quiet mode, certain log messages should not appear
      expect(consoleLogStub).to.not.have.been.calledWith(
        "🔄 Fetching KV collections..."
      );
    });

    it("should only fetch KV data once", async () => {
      const keysResponse = {
        ok: true,
        json: sinon.stub().resolves({
          result: [{ name: "posts/test" }]
        })
      };

      const valueResponse = {
        ok: true,
        status: 200,
        text: sinon.stub().resolves(`---
title: Test
---
Content`)
      };

      fetchStub
        .onFirstCall()
        .resolves(keysResponse)
        .onSecondCall()
        .resolves(valueResponse);

      const mockEleventyConfig = {
        on: sinon.stub(),
        addCollection: sinon.stub()
      };

      kvCollectionsPlugin(mockEleventyConfig, {});

      const beforeCallback = mockEleventyConfig.on.getCall(0).args[1];

      // Call twice to test that data is only fetched once
      await beforeCallback();
      await beforeCallback();

      // Should only make API calls once
      expect(fetchStub).to.have.been.calledTwice; // Once for keys, once for value
    });

    it("should handle processing errors gracefully", async () => {
      const keysResponse = {
        ok: true,
        json: sinon.stub().resolves({
          result: [{ name: "posts/malformed" }]
        })
      };

      // Mock fetch to throw an error on the second call
      fetchStub
        .onFirstCall()
        .resolves(keysResponse)
        .onSecondCall()
        .rejects(new Error("Network error"));

      const mockEleventyConfig = {
        on: sinon.stub(),
        addCollection: sinon.stub()
      };

      kvCollectionsPlugin(mockEleventyConfig, {});

      const beforeCallback = mockEleventyConfig.on.getCall(0).args[1];
      await beforeCallback();

      expect(consoleErrorStub).to.have.been.calledWith(
        sinon.match("❌ Error processing KV key posts/malformed:")
      );
    });
  });
});
