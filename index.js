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
const reviewCollection = client.db("microparts").collection("review");
// Stripe
const stripe = require("stripe")('sk_test_51L1c26AQe13D7JV445RLBZTVrVHrVl6aC4EeaLlsTVOGhvgwxoh5YxiRKKYzrcozo7mvFdLRrR0uwiU3CAeRLe8800O5amBNFk');
// verify jwt
function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.JWT_SECRECT_KEY, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' })
        }
        req.decoded = decoded;
        next();
    });
}
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
            // const user = await usersCollection.findOne(filter);
            // if (user?.role === 'admin') {
            //     const JWT = jwt.sign({ email: email }, process.env.JWT_SECRECT_KEY, { expiresIn: '1h' })
            //     res.send({ 'token': JWT });
            // }
            const options = { upsert: true };
            const updateDoc = {
                $set: newUser,
            };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            const JWT = jwt.sign({ email: email }, process.env.JWT_SECRECT_KEY, { expiresIn: '1h' })
            res.send({ 'token': JWT });
        })
        // get user
        app.get('/user', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send(user);
        })
        // get All user
        app.get('/alluser', async (req, res) => {
            const query = {}
            const cursor = usersCollection.find(query);
            const users = await cursor.toArray();
            res.send(users);
        })
        // Get a specific product Data
        app.get('/product/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const result = await productsCollection.findOne(query)
            res.send(result)
        })
        // make someone admin
        app.put('/users', async (req, res) => {
            const updatedStatus = req.body;
            const email = req.query.email
            const filter = { email };
            const options = { upsert: true };
            const updateDoc = {
                $set: { role: updatedStatus?.role }
            };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            res.send(result);
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
        // cart product
        app.get('/cart/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const product = await cartCollection.findOne(query);
            console.log(product);
            res.send(product);
        })
        // payment api
        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            console.log(req.body)
            const { totalPrice } = req.body;
            // Create a PaymentIntent with the order amount and currency
            const paymentIntent = await stripe.paymentIntents.create({
                amount: parseInt(totalPrice.total) * 100,
                currency: "eur",
                automatic_payment_methods: {
                    enabled: true,
                },
            });

            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });
        // update cart
        app.put('/cart/:id', verifyJWT, async (req, res) => {
            const updatedProduct = req.body;
            const id = req.params.id
            console.log(req.body)
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: { 'paidStaus': 'paid', 'transitionID': updatedProduct?.transactionId }
            };
            const result = await cartCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        })
        // Review Adding
        app.post('/review', async (req, res) => {
            const newService = req.body;
            const result = await reviewCollection.insertOne(newService);
            res.send(result);
        })
        // update Profile
        app.put('/updateProfile', async (req, res) => {
            const updatedProfile = req.body;
            const email = req.query.email
            const filter = { email };
            const options = { upsert: true };
            const updateDoc = {
                $set: { city: updatedProfile?.city, education: updatedProfile?.education, linkedInProfile: updatedProfile?.linkedin }
            };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            res.send(result);
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