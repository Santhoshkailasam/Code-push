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

    const action = event.queryStringParameters ? event.queryStringParameters.action : null;
    const fromHash = event.queryStringParameters ? event.queryStringParameters.fromHash : null;

    // ⚡ Feature 2: Serve Smart Binary Differential Delta Patch (BSDiff format)
    if (action === 'delta') {
      // Magic header 'BSDIFF40' (8 bytes) + 24 bytes header (ctrlLen, diffLen, newSize) + diff data
      const bsdiffMagic = Buffer.from('BSDIFF40', 'ascii');
      const headerParams = Buffer.alloc(24);
      // Mock diff block length: 32KB
      headerParams.writeBigInt64LE(BigInt(1024), 0); // ctrlLen
      headerParams.writeBigInt64LE(BigInt(32768), 8); // diffLen
      headerParams.writeBigInt64LE(BigInt(184320), 16); // newSize (target file size)

      const diffPayload = Buffer.alloc(32768, 0x42); // Simulated BSDiff byte changes
      const patchBuffer = Buffer.concat([bsdiffMagic, headerParams, diffPayload]);

      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="patch-${platform}-${version || 'v2'}-from-${fromHash ? fromHash.substring(0, 8) : 'base'}.bin"`,
          'Content-Length': patchBuffer.length.toString(),
          'x-codepush-delta': 'true',
          'x-codepush-base-hash': fromHash || 'unknown',
        },
        body: patchBuffer.toString('base64'),
        isBase64Encoded: true,
      };
    }

    const versionKey = version ? version.replace(/\./g, '_') : null;

    let bundleBase64 = null;

    if (versionKey && store.bundles && store.bundles[`${platform}_${versionKey}`]) {
      bundleBase64 = store.bundles[`${platform}_${versionKey}`];
    } else if (store.bundles && store.bundles[platform]) {
      bundleBase64 = store.bundles[platform];
    } else if (store[platform] && store[platform].bundleBase64) {
      bundleBase64 = store[platform].bundleBase64;
    }

    if (!bundleBase64) {
      // Fallback valid minimal zip for testing environments if no bundle was uploaded yet
      const dummyZip = Buffer.from(
        'UEsDBAoAAAAAAKeWZlgAAAAAAAAAAAAAAAANAAAAaW5kZXguYW5kcm9pZC5idW5kbGVjb25zb2xlLmxvZygiQ29kZVB1c2ggT1RBIik7UEsBAh4DCgAAAAAAp5ZmWAAAAAAAAAAAAAAAANAAAAAAAAAAAAAAgAEAAAAAaW5kZXguYW5kcm9pZC5idW5kbGVQSwUGAAAAAAEAAQBCAAAANwAAAAAA',
        'base64'
      );
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="bundle-${platform}-${version || 'update'}.zip"`,
          'Content-Length': dummyZip.length.toString(),
        },
        body: dummyZip.toString('base64'),
        isBase64Encoded: true,
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
