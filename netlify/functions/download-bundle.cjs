const { getReleaseData } = require('./store.cjs');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const platform = event.queryStringParameters ? event.queryStringParameters.platform : 'android';
    const version = event.queryStringParameters ? event.queryStringParameters.version : null;

    const store = await getReleaseData();

    let bundleBase64 = null;

    if (version && store.bundles && store.bundles[`${platform}_${version}`]) {
      bundleBase64 = store.bundles[`${platform}_${version}`];
    } else if (store.bundles && store.bundles[platform]) {
      bundleBase64 = store.bundles[platform];
    } else if (store[platform] && store[platform].bundleBase64) {
      bundleBase64 = store[platform].bundleBase64;
    }

    if (!bundleBase64) {
      return {
        statusCode: 404,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `Bundle package not found for ${platform} v${version}` }),
      };
    }

    const buffer = Buffer.from(bundleBase64, 'base64');

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="bundle-${platform}-${version || 'update'}.zip"`,
        'Content-Length': buffer.length.toString(),
      },
      body: buffer.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to download bundle', details: err.message }),
    };
  }
};
