const router = require('express').Router(),
      axios = require('axios').default;

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

const instance1 = axios.create({
  baseURL: store1.endpoint,
  timeout: 1000,
  auth: {
    username: store1.user,
    password: store1.passwd
  }
});


async function get_data() {
  const response = await instance1.get('/admin/api/2020-07/products.json');
  if (response.status !== 200) {
    throw response.statusText;
  }

  return response.data;
}


router.get('/inventory', async function(req, res) {
  console.log("here at inventory endpoint");
  let data = await get_data();
  console.log("done with inventory");
  res.json(data);
});

module.exports = router;
