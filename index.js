import express from 'express';
import axios from 'axios';
import { createClient } from "redis";

const app = express();
const client = await createClient({
    url: 'redis://default:AHlRUKDZTPVPFGOEGFmwbnTlyvTsGLlI@monorail.proxy.rlwy.net:22153',
}).on("error", (err) => console.log("Redis Client Error", err))
    .connect();

client.on("error", function (err) {
    console.log("Error " + err);
    throw err;
});

// Set the cache expiration time (in seconds)
const CACHE_EXPIRATION = 3600; // 1 hour

// Proxy endpoint
app.get('/api/*', async (req, res) => {
    const urlPath = req.params[0];
    const cacheKey = `api:${urlPath}`;
    try {
        console.log(`Making request to: http://localhost:3500/api${urlPath}`);
        // Check if the response is already cached
        const cachedData = await client.get(cacheKey);
        if (cachedData) {
            console.log('Serving from cache');
            return res.json(JSON.parse(cachedData));
        }

        // If not cached, make the API request
        const response = await axios.get(`http://localhost:3500/api${urlPath}`);
        const data = response.data;

        // Cache the response
        await client.set(cacheKey, JSON.stringify(data), 'EX', CACHE_EXPIRATION);
        console.log('Serving from API');
        res.json(data);
    } catch (error) {
        console.error('Error:', error);
        console.error('Error details:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'An error occurred' });
    }
});

// Start the server
app.listen(3500, () => {
    console.log('Redis caching proxy server is running on port 3000');
});

// Clear redis cache
app.get('/clear-cache', async (req, res) => {
    try {
        await client.flushAll();
        res.json({ message: 'Cache cleared' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'An error occurred' });
    }
});