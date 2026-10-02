const { getReleaseData } = require('./store.cjs');

exports.handler = async (event) => {
  const method = event.httpMethod;

  if (method === 'GET') {
    const store = await getReleaseData();
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
