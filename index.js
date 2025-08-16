import matter from "gray-matter";

// Default environment variable names
const DEFAULT_ENV_VARS = {
  accountId: "CLOUDFLARE_ACCOUNT_ID",
  namespaceId: "CLOUDFLARE_KV_NS_ID",
  cloudflareAPIToken: "CLOUDFLARE_API_TOKEN"
};

// KV API Helper Functions
async function fetchFromKV(kvBaseUrl, apiToken) {
  const response = await fetch(`${kvBaseUrl}/keys`, {
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(
      `❌ Cloudflare KV API error: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

async function fetchKVValue(kvBaseUrl, apiToken, key) {
  const response = await fetch(`${kvBaseUrl}/values/${key}`, {
    headers: {
      Authorization: `Bearer ${apiToken}`
    }
  });

  if (response.status === 404) {
    return null; // Key doesn't exist
  }

  if (!response.ok) {
    throw new Error(`❌ Failed to fetch KV value for key: ${key}`);
  }

  return response.text();
}

// Main KV Collections Fetcher
async function fetchKVCollections(config, quiet) {
  const {
    accountId: accountIdVar,
    namespaceId: namespaceIdVar,
    cloudflareAPIToken: apiTokenVar
  } = config.envVars;

  const ACCOUNT_ID = process.env[accountIdVar];
  const NAMESPACE_ID = process.env[namespaceIdVar];
  const API_TOKEN = process.env[apiTokenVar];

  if (!ACCOUNT_ID || !API_TOKEN || !NAMESPACE_ID) {
    throw new Error(
      `❌ Cloudflare credential environment variables not found. Expected: ${accountIdVar}, ${apiTokenVar}, ${namespaceIdVar}`
    );
  }

  const KV_BASE_URL = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/storage/kv/namespaces/${NAMESPACE_ID}`;

  try {
    const keysResponse = await fetchFromKV(KV_BASE_URL, API_TOKEN);
    const keys = keysResponse.result;

    if (!keys || keys.length === 0) {
      if (!quiet) {
        console.log("❌ No keys found in KV namespace");
      }
      return {};
    }

    if (!quiet) {
      console.log(`✅ Found ${keys.length} keys in KV namespace`);
    }

    const collections = {};

    await Promise.all(
      keys.map(async (keyObj) => {
        try {
          const kvKey = keyObj.name;
          const content = await fetchKVValue(KV_BASE_URL, API_TOKEN, kvKey);

          const parsed = matter(content);

          // Parse collection name and item key from KV key
          const slashIndex = kvKey.indexOf("/");
          let collectionName, itemKey;

          if (slashIndex !== -1) {
            collectionName = kvKey.substring(0, slashIndex);
            itemKey = kvKey.substring(slashIndex + 1);
          } else {
            collectionName = "none";
            itemKey = kvKey;
          }

          // Initialize collection if it doesn't exist
          if (!collections[collectionName]) {
            collections[collectionName] = {};
          }

          // Store the processed content
          collections[collectionName][itemKey] = {
            content: parsed.content,
            ...parsed.data,
            kvKey
          };
        } catch (error) {
          console.error(`❌ Error processing KV key ${keyObj.name}:`, error);
        }
      })
    );

    const totalItems = Object.values(collections).reduce(
      (sum, collection) => sum + Object.keys(collection).length,
      0
    );

    if (!quiet) {
      console.log(
        `✅ Successfully processed ${totalItems} items across ${Object.keys(collections).length} collection(s)`
      );
    }

    return collections;
  } catch (error) {
    console.error("❌ Error fetching items from Cloudflare KV:", error);
    return {};
  }
}

export default function kvCollectionsPlugin(eleventyConfig, userConfig = {}) {
  const config = {
    envVars: {
      accountId: userConfig.accountId || DEFAULT_ENV_VARS.accountId,
      namespaceId: userConfig.namespaceId || DEFAULT_ENV_VARS.namespaceId,
      cloudflareAPIToken:
        userConfig.cloudflareAPIToken || DEFAULT_ENV_VARS.cloudflareAPIToken
    },
    metadata: userConfig.metadata || {},
    quiet: userConfig.quiet || false
  };

  let kvCollections = {};
  let kvDataFetched = false;

  eleventyConfig.on("eleventy.before", async () => {
    if (!kvDataFetched) {
      if (!config.quiet) {
        console.log("🔄 Fetching KV collections...");
      }
      kvCollections = await fetchKVCollections(config, config.quiet);
      kvDataFetched = true;

      if (!config.quiet) {
        Object.keys(kvCollections).forEach((collectionName) => {
          const itemCount = Object.keys(kvCollections[collectionName]).length;
          console.log(`📁 Collection "${collectionName}": ${itemCount} items`);
        });
      }

      Object.keys(kvCollections).forEach((collectionName) => {
        eleventyConfig.addCollection(collectionName, (_collectionApi) => {
          const collection = kvCollections[collectionName];

          return Object.entries(collection).map(([itemKey, itemData]) => {
            // Add any additional metadata specified by user
            const additionalMetadata = {};
            Object.entries(config.metadata).forEach(([key, value]) => {
              if (typeof value === "function") {
                additionalMetadata[key] = value(
                  itemData,
                  itemKey,
                  collectionName
                );
              } else {
                additionalMetadata[key] = value;
              }
            });

            return {
              ...itemData,
              ...additionalMetadata
            };
          });
        });
      });
    }
  });
}
