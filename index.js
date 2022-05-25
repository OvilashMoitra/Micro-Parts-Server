const express = require('express');
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
const cors = require('cors');
app.use(cors());
app.use(express.json());
require('dotenv').config()

// MONGODB Connection
console.log(process.env.DB_PASS)
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dxoyv.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
const productsCollection = client.db("microparts").collection("products");
const usersCollection = client.db("microparts").collection("users");
const cartCollection = client.db("microparts").collection("cart");

async function run() {
    try {
        await client.connect();
        app.get('/products', async (req, res) => {
            const query = {}
            const cursor = productsCollection.find(query);
            const products = await cursor.toArray();
            res.send(products);
        })
        // user creating and JWT 
        app.put('/user', async (req, res) => {
            const newUser = req.body;
            const email = req.query.email
            console.log(email)
            const filter = { email };
            const options = { upsert: true };
            const updateDoc = {
                $set: newUser,
            };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            const JWT = jwt.sign({ email: email }, process.env.JWT_SECRECT_KEY, { expiresIn: '1h' })
            res.send({ 'token': JWT });
        })
        // Get a specific product Data
        app.get('/product/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const result = await productsCollection.findOne(query)
            res.send(result)
        })
        // Product Quantity Update
        app.put('/products/:id', async (req, res) => {
            const updatedProduct = req.body;
            const id = req.params.id
            console.log(id)
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: { stock: updatedProduct?.stock }
            };
            const result = await productsCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        })
        // Add to cart
        app.post('/cart', async (req, res) => {
            const product = req.body;
            const result = await cartCollection.insertOne(product);
            res.send(result);
        })
        // Get Cart Product for specific User
        app.get('/cartedItem', async (req, res) => {
            const email = req.query.email;
            const query = { email };
            const service = await cartCollection.find(query).toArray();
            res.send(service);
        })

    } finally {
        //   await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Running my node CRUD server')
})

app.listen(port, () => {
    console.log('crud server is running ');
})