const router = require('express').Router();
const redis = require('redis');
const redis_client = redis.createClient();
const { promisify } = require('util');
const hgetallAsync = promisify(redis_client.hgetall).bind(redis_client);
const smembersAsync = promisify(redis_client.smembers).bind(redis_client);
const utils = require('../../utils');


function to_numbers(object) {
  return utils.objectMap(object, parseInt);
}

function sum_objects(objs) {
  return objs.reduce((a, b) => {
    for (let k in b) {
      if (b.hasOwnProperty(k)) {
        a[k] = (a[k] || 0) + b[k];
      }
    }
    return a;
  }, {});
}


function sku_list(object) {
  let result = [];
  for (let sku in object) {
    if (object.hasOwnProperty(sku)) {
      result.push({"SKU": sku, "amount": object[sku]});
    }
  }
  return result;
}


router.get('/inventory', async function(req, res) {
  const store_names_list = await smembersAsync('store_list');
  console.log(`store_list ${store_names_list}`);
  const tasks = store_names_list.map((store_name) => {
    return hgetallAsync(store_name);
  });

  const sku_hashes = await Promise.all(tasks);
  const sku_amounts = sku_hashes.map(to_numbers);
  const summed_skus = sum_objects(sku_amounts);
  res.json(sku_list(summed_skus));
});


router.get('/:store/inventory', async function(req, res) {
  const store_name = req.params['store']
  const redis_result = await hgetallAsync(store_name);
  if (redis_result === null) {
    res.status(404);
    res.json({
      error: `store ${store_name} not found`
    });
  } else {
    res.json(sku_list(to_numbers(redis_result)));
  }
});

module.exports = router;
