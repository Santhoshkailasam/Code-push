const { getReleaseData } = require('./store.cjs');

exports.handler = async (event) => {
  const method = event.httpMethod;

  if (method === 'GET') {
    const store = await getReleaseData();
    const apiKey = (event.queryStringParameters ? event.queryStringParameters.apiKey : null) || event.headers['x-codepush-api-key'] || event.headers['x-api-key'];
    const userId = (event.queryStringParameters ? event.queryStringParameters.userId : null) || event.headers['x-user-id'];

    if (apiKey || userId) {
      let scopedStore = { ...store };

      if (apiKey && store.keys && store.keys[apiKey]) {
        if (store.keys[apiKey].android) scopedStore.android = store.keys[apiKey].android;
        if (store.keys[apiKey].ios) scopedStore.ios = store.keys[apiKey].ios;
      } else if (userId && store.users && store.users[userId]) {
        if (store.users[userId].android) scopedStore.android = store.users[userId].android;
        if (store.users[userId].ios) scopedStore.ios = store.users[userId].ios;
      }

      if (store.history) {
        scopedStore.history = store.history.filter((item) => {
          if (userId && item.userId === userId) return true;
          if (apiKey && item.apiKey === apiKey) return true;
          return false;
        });
      }

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(scopedStore),
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(store),
    };
  }

  return {
    statusCode: 405,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({ error: 'Method Not Allowed' }),
  };
};
