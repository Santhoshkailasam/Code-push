const versionData = require('../../version.json');

exports.handler = async (event) => {
  const method = event.httpMethod;

  if (method === 'GET') {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(versionData),
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
