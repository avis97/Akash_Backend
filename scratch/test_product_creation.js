const http = require('http');

function makeRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5005,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function testProductCreation() {
  console.log('--- TESTING NEW PRODUCT CREATION ---');
  
  const productPayload = {
    name: 'AMPERE METER KARTAR 50A',
    sku: 'AE - 0313',
    salePrice: 4500,
    purchasePrice: 3200,
    tax: '18% GST',
    brand: 'KARTAR',
    category: 'AMPERE METER',
    unit: 'Pics',
    productImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    type: 'Product',
    stockQuantity: 100,
    description: 'Digital Ampere Meter for panel measurement and monitoring.'
  };

  const res = await makeRequest('POST', '/api/inventory', productPayload);
  console.log('API Response:', JSON.stringify(res, null, 2));

  if (res.success) {
    console.log('✅ Product created successfully in PostgreSQL DB!');
    console.log('Product ID:', res.data.id);
    console.log('SKU / Code:', res.data.code);
    console.log('Name:', res.data.name);
    console.log('Sale Price:', res.data.salePrice);
    console.log('Purchase Price:', res.data.purchasePrice);
    console.log('Tax:', res.data.tax);
    console.log('Type:', res.data.type);
    console.log('Quantity:', res.data.stockQuantity);
    console.log('Description:', res.data.description);
  } else {
    console.error('❌ Failed to create product:', res.message);
  }
}

testProductCreation().catch(console.error);
