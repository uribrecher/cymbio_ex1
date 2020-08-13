const axios = require('axios').default;
const redis = require('redis');
const redis_client = redis.createClient();
const { promisify } = require('util');
const hsetAsync = promisify(redis_client.hset).bind(redis_client);
const saddAsync = promisify(redis_client.sadd).bind(redis_client);
const flushallAsync = promisify(redis_client.flushall).bind(redis_client);
const utils = require('./utils');
const config = require('./config.json')

redis_client.on("error", function(error) {
    console.error(error);
});

// sync to redis every 60 seconds
const sync_interval = 1000 * 60;


const stores = config['stores'];

const store_apis = utils.objectMap(stores, (store) => {
    return axios.create({
        baseURL: store.endpoint,
        timeout: 1000,
        auth: {
            username: store.user,
            password: store.passwd
        }
    })
});


function process_products(data, store_name) {
    let tasks = []
    if (data === null) {
        return tasks;
    }
    data['products'].forEach((product) => {
        product['variants'].forEach((variant) => {
            const record = {
                SKU: variant['sku'],
                amount: variant['inventory_quantity']
            }
            console.log(`hset ${store_name} ${record.SKU} ${record.amount}`);
            tasks.push(hsetAsync(store_name, record.SKU, record.amount));
        })
    });

    return tasks;
}


async function get_one_page(url, store_name) {
    let response = await store_apis[store_name].get(url);
    if (response.status !== 200) {
        console.error(`access to ${store_name} failed with ${response.statusText}`);
        return [null, null];
    }

    const link_header = response.headers['link'];
    if (link_header === undefined) {
        return [response.data, null];
    }

    const links_regex = /<(?<page>[^;]*)>; rel="(?<type>previous|next)"/g
    const match_results = link_header.matchAll(links_regex);
    for(let result of match_results) {
        let {page, type} = result.groups;
        if (type === 'next') {
            return [response.data, page];
        }
    }
    return [response.data, null];
}

async function get_inventory_for_store(store_name) {
    let tasks = [saddAsync('store_list', store_name)];
    let [data, next_page] = await get_one_page('/admin/api/2020-07/products.json?limit=1', store_name);
    tasks = tasks.concat(process_products(data, store_name));
    let page_count = 1;
    while (next_page !== null) {
        [data, next_page] = await get_one_page(next_page, store_name);
        tasks = tasks.concat(process_products(data, store_name));
        page_count += 1;
    }
    await Promise.all(tasks);
    return page_count;
}


async function get_inventory_for_all_stores() {
    await flushallAsync();
    const tasks = Object.keys(store_apis).map((store_name) => {
        return get_inventory_for_store(store_name);
    });
    const redis_results = await Promise.all(tasks);
    console.log(redis_results);
    // set the next sync only after the current one completed!
    setTimeout(get_inventory_for_all_stores, sync_interval);
}

async function start() {
    return await get_inventory_for_all_stores();
}

module.exports = start()
