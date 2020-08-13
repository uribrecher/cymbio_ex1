const router = require('express').Router(),
      axios = require('axios').default;

// TODO: avoid committing secrets to git!!!
const store1 = {
  endpoint: 'https://cymbiointerviewstore1.myshopify.com/',
  user: '734b2b15f6ab57cdc1f717c7f959e9b6',
  passwd: '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'
}

const store2 = {
  endpoint: 'https://cymbiointerviewstore2.myshopify.com/',
  user: '22f7057600d5c76f36f31cf453e211ca',
  passwd: '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'
}

const store1_api = axios.create({
  baseURL: store1.endpoint,
  timeout: 1000,
  auth: {
    username: store1.user,
    password: store1.passwd
  }
});

const store2_api = axios.create({
  baseURL: store2.endpoint,
  timeout: 1000,
  auth: {
    username: store2.user,
    password: store2.passwd
  }
});

const stores = {
  store1: store1_api,
  store2: store2_api
}


function process_products(data) {
  let result = []
  data['products'].forEach((product) => {
    product['variants'].forEach((variant) => {
      const record = {
        SKU: variant['sku'],
        amount: variant['inventory_quantity']
      }
      result.push(record)
    })
  });

  return result;
}

async function get_inventory_for_store(store) {
  const response = await store.get('/admin/api/2020-07/products.json');
  return process_products(response.data);
}

router.get('/inventory', async function(req, res) {
  const data = await Promise.all([
      get_inventory_for_store(store1_api),
      get_inventory_for_store(store2_api)
  ]);

  // TODO: merge the two stores data
  res.json(data);
});

router.get('/:store/inventory', async function(req, res) {
  // TODO: handle pagination
  const store_name = req.params['store']
  if (store_name in stores) {
    const inventory_data = get_inventory_for_store(stores[store_name]);
    res.json(await inventory_data)
  } else {
    res.status(404);
    res.json({
      error: 'store not found'
    });
  }
});

module.exports = router;
