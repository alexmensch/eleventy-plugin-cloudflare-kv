[![npm version](https://badge.fury.io/js/eleventy-plugin-cloudflare-kv.svg)](https://badge.fury.io/js/eleventy-plugin-cloudflare-kv)
[![Node.js CI](https://github.com/alexmensch/eleventy-plugin-cloudflare-kv/workflows/Node.js%20CI/badge.svg)](https://github.com/alexmensch/eleventy-plugin-cloudflare-kv/actions)
[![codecov](https://codecov.io/gh/alexmensch/eleventy-plugin-cloudflare-kv/graph/badge.svg)](https://codecov.io/gh/alexmensch/eleventy-plugin-cloudflare-kv)

# eleventy-plugin-cloudflare-kv

An Eleventy plugin that builds collections from content stored in Cloudflare KV as a simple CMS.

## Features

- 🚀 Fetch content from Cloudflare KV at build time
- 📝 Automatic Frontmatter parsing
- 🏷️ Organize content into collections based on KV key name
- ⚙️ Configurable metadata for each item
- 🤫 Optional quiet mode for clean build output
- 🔧 Flexible environment variable configuration

## Installation

```bash
npm install eleventy-plugin-cloudflare-kv
```

## Usage

### Basic Setup

Add the plugin to your `.eleventy.js` configuration:

```javascript
import kvCollectionsPlugin from "eleventy-plugin-cloudflare-kv";

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(kvCollectionsPlugin, {
    metadata: {
      permalink: (itemData, itemKey, collectionName) => {
        return `/${collectionName}/${itemData.slug || itemKey}/`;
      }
    }
  });
}
```

### Configuration Options

| Option               | Type    | Required | Description                                                                            |
| -------------------- | ------- | -------- | -------------------------------------------------------------------------------------- |
| `metadata`           | Object  | No       | Additional metadata to add to each item                                                |
| `accountId`          | String  | No       | Environment variable name for Cloudflare Account ID (default: `CLOUDFLARE_ACCOUNT_ID`) |
| `namespaceId`        | String  | No       | Environment variable name for KV Namespace ID (default: `CLOUDFLARE_KV_NS_ID`)         |
| `cloudflareAPIToken` | String  | No       | Environment variable name for API Token (default: `CLOUDFLARE_API_TOKEN`)              |
| `quiet`              | Boolean | No       | Suppress console output except errors (default: `false`)                               |

### Environment Variables

Set these environment variables in your build environment:

```bash
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_KV_NS_ID=your-namespace-id
CLOUDFLARE_API_TOKEN=your-api-token
```

Or configure custom variable names:

```javascript
eleventyConfig.addPlugin(kvCollectionsPlugin, {
  accountId: "MY_ACCOUNT_ID",
  namespaceId: "MY_KV_NAMESPACE",
  cloudflareAPIToken: "MY_API_TOKEN",
  metadata: {
    permalink: (itemData) => `/posts/${itemData.slug}/`
  }
});
```

### KV Key Structure

The plugin organizes content into collections based on your KV key structure:

- `posts/hello-world` → Collection: `posts`, Item key: `hello-world`
- `pages/about` → Collection: `pages`, Item key: `about`
- `standalone` → Collection: `none`, Item key: `standalone`

### Content Format

Store your content in KV with front matter:

```markdown
---
title: "Hello World"
date: 2024-01-01
slug: "hello-world"
tags: ["post", "greeting"]
---

# Hello World

This is my first post stored in Cloudflare KV!
```

### Advanced Configuration

```javascript
eleventyConfig.addPlugin(kvCollectionsPlugin, {
  metadata: {
    permalink: (itemData, itemKey, collectionName) => {
      if (!itemData.permalink) {
        if (!itemData.title || !itemData.date) {
          throw new Error(`Unable to generate permalink for item: ${itemKey}`);
        }
        const date = new Date(itemData.date);
        const year = date.getFullYear();
        const slug = itemData.slug || itemKey;
        return `/${collectionName}/${year}/${slug}/`;
      }
      return itemData.permalink;
    },
    layout: "post.njk",
    collection: (itemData, itemKey, collectionName) => collectionName
  },
  quiet: true
});
```

## API

### Metadata Functions

Metadata values can be either constants or functions that receive:

- `itemData`: The parsed content and front matter data
- `itemKey`: The item's key derived from the KV key
- `collectionName`: The collection name derived from the KV key

## Requirements

- Node.js 20+
- Eleventy 2.0+
- Cloudflare KV namespace with API token

## Contributing

Issues and pull requests are welcome on GitHub at https://github.com/alexmensch/eleventy-plugin-cloudflare-kv.
