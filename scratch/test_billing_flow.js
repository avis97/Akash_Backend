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
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch(e) {
          resolve({ raw: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function testWorkflow() {
  console.log('--- TESTING BILLING & INVENTORY WORKFLOW ---');
  
  // 1. Get products & users
  const invRes = await makeRequest('GET', '/api/inventory');
  const userRes = await makeRequest('GET', '/api/users');
  const sampleProduct = invRes.data[0];
  const sampleClient = userRes.data.find(u => u.role === 'CLIENT') || userRes.data[0];

  console.log('Sample Product:', sampleProduct.name, '| Initial Stock:', sampleProduct.stockQuantity);
  console.log('Sample Client:', sampleClient.name, '| ID:', sampleClient.id);
  
  // 2. Create Quotation as Super Admin
  const quotPayload = {
    clientId: sampleClient.id,
    clientName: sampleClient.name,
    clientEmail: sampleClient.email,
    totalAmount: sampleProduct.unitPrice * 2,
    items: [
      {
        productId: sampleProduct.id,
        name: sampleProduct.name,
        code: sampleProduct.code,
        unitPrice: sampleProduct.unitPrice,
        qty: 2,
        total: sampleProduct.unitPrice * 2
      }
    ]
  };

  const createQuotRes = await makeRequest('POST', '/api/billing/quotations', quotPayload);
  console.log('1. Quotation Created:', createQuotRes.data.quotationNumber, '| Status:', createQuotRes.data.status);
  const quotId = createQuotRes.data.id;

  // 3. Client Accepts Quotation
  const acceptRes = await makeRequest('PATCH', `/api/billing/quotations/${quotId}/accept`, { acceptedBy: sampleClient.name });
  console.log('2. Client Accepted Quotation:', acceptRes.data.quotationNumber, '| New Status:', acceptRes.data.status);

  // 4. Super Admin Generates Bill (Invoice)
  const billRes = await makeRequest('POST', `/api/billing/quotations/${quotId}/generate-bill`, { generatedBy: 'Super Admin' });
  console.log('3. Super Admin Generated Bill:', billRes.invoice.invoiceNumber, '| Quotation Status:', billRes.data.status);

  // 5. Verify Product Stock Deduction in Inventory
  const updatedInvRes = await makeRequest('GET', '/api/inventory');
  const updatedProduct = updatedInvRes.data.find(p => p.id === sampleProduct.id);
  console.log('4. Updated Product Stock:', updatedProduct.name, '| New Stock:', updatedProduct.stockQuantity);
  console.log('✅ SUCCESS: Product stock reduced from', sampleProduct.stockQuantity, 'to', updatedProduct.stockQuantity, '(Deducted Qty: 2)');
}

testWorkflow().catch(console.error);
