const express = require('express');
const app = express();
const cors = require('cors');
const  jwt = require('jsonwebtoken');
require('dotenv').config()
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const port = process.env.PORT || 5000;


//middleWere
app.use(cors())
app.use(express.json())



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.stvj7tw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const productCollection = client.db('E-commerceDB').collection('products')
    const cartCollection = client.db('E-commerceDB').collection('carts')
    const userCollection = client.db('E-commerceDB').collection('users')
    const reviewCollection = client.db('E-commerceDB').collection('reviews')
    const paymentCollection = client.db('E-commerceDB').collection('payments')
    const blogCollection = client.db('E-commerceDB').collection('blogs')


   
    



   // reviews

   app.get('/reviews',async(req,res) => {

    const result = await reviewCollection.find().toArray();

    res.send(result)
   })




    // products 
    app.get('/products',async(req,res) => {
      const result = await productCollection.find().toArray();

      res.send(result)
    })

    app.get('/products/:id',async(req,res) => {


      const id = req.params.id;

      console.log(id)

      const query = {_id: new ObjectId (id)}

      const result = await productCollection.findOne(query)

      res.send(result)
      


    })

    app.post('/products',async(req,res) => {

      const product = req.body;

      const result = await productCollection.insertOne(product);

      res.send(result);

    })
    app.delete('/products/:id',async(req,res) => {

      const id = req.params.id;

      console.log(id)

      const query = {_id: new ObjectId(id)}

      const result = await productCollection.deleteOne(query)

      res.send(result);

    })

    app.patch('/products/:id',async(req,res) => {

      const item = req.body;

      const id = req.params.id;

      const filter = {_id: new ObjectId(id)}

      const updatedDoc = {

        $set:{
         
          name:item.name,
          category:item.category,
          price:item.price,
          image:item.image

        }
      }

      const result = await productCollection.updateOne(filter,updatedDoc)

      res.send(result);

    })



    


     // jwt related api

     app.post('/jwt',async(req,res) => {

      const user = req.body;

      const token = jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{
        expiresIn:"1h"
      });
      res.send({token});

    })
    // middleWere
    const verifyToken = (req,res,next) => {
      
      console.log('insite varify token',req.headers.authorization);
      
      if(!req.headers.authorization){

        return res.status(401).send({message:'forbiden access'})

      }

      const token = req.headers.authorization.split(' ')[1]
      jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(error,decoded)=>{
          if(error){
            return res.status(401).send({message : 'forbiden access'})
          }
          req.decoded = decoded
        
      })
      next()
  

    

    }


    
        // use varify admin after varifyToken 


        const verifyAdmin = async(req,res,next) => {
            
          const email = req.decoded.email;

          const query = {email:email};

          const user = await userCollection.findOne(query);
          
          const isAdmin = user ?.role === 'admin';

          if(!isAdmin){
              return res.status(403).send({message:'forbiden access'})
          }
          next();



      }

   



    

    // user collection 

    app.get('/users',verifyToken,verifyAdmin,async(req,res) => {


      const result = await userCollection.find().toArray();
      
      res.send(result);

    })
    

    app.get('/users/admin/:email',verifyToken,async(req,res) => {
      const email = req.params.email;

      if(email !== req.decoded.email){
          return res.status(403).send({message:"unauthorized"})
      }

      const query = {email:email};

      const user = await userCollection.findOne(query);

      let admin = false;

      if(user){
          admin = user?.role === 'admin';
      }

      res.send({ admin });


  })

  app.post('/users', async (req, res) => {
    const user = req.body;

    // insert email if user does not exists  
    // 

    const query = { email: user.email }

    const existingUser = await userCollection.findOne(query)

    if (existingUser) {
        return res.send({ message: 'user already exists', insertedId: null })
    }

    const result = await userCollection.insertOne(user)

    res.send(result);


})

    app.delete('/users/:id',async(req,res) => {

      const id = req.params.id;
      const query = {_id:new ObjectId(id)}
      const result = await userCollection.deleteOne(query);
      res.send(result);

    })

    app.patch('/users/admin/:id',async(req,res) => {

      const id = req.params.id;

      const filter = {_id: new ObjectId(id)}

      const updatedDoc = {
        $set:{
          role:'admin'

        }

      }

      const result = await userCollection.updateOne(filter,updatedDoc)
      res.send(result);

    } )

    // cart collection 

    app.get('/carts',async(req,res) => {

      const email = req.query.email;
      const query = {email:email};
      const result = await cartCollection.find(query).toArray();

      res.send(result)
    })


    app.post('/carts',async(req,res) => {
      const cartItem = req.body;

      const result = await cartCollection.insertOne(cartItem)
      res.send(result)
    })
    app.delete('/carts/:id',async(req,res) => {

      const id = req.params.id;
      const query  = {_id : new ObjectId(id)}
      const result = await cartCollection.deleteOne(query);
      res.send(result);
      
    })

    // payment intent 

    app.post('/create-payment-intent',async(req,res) => {


      const {Price} = req.body;
      const amount = parseInt(Price * 100)

      console.log(amount,'amout inside the insite')


      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types:['card']
      
      });
      res.send({
        clientSecret:paymentIntent.client_secret
      })


    })

    // payment 

    app.get('/payments/:email',async(req,res) => {

      const query = { email: req.params.email }


   
   
      const result = await paymentCollection.find(query).toArray();
      res.send(result);

    })

    app.post('/payments',async(req,res) => {
        const payment = req.body;
        const paymentResult = await paymentCollection.insertOne(payment)


        // delete product 

        console.log('payment info',payment);

        const query = {_id:{
          $in: payment.cartIds.map(id => new ObjectId(id))
        }};
        const deleteResult = await cartCollection.deleteMany(query)

        res.send({paymentResult,deleteResult})

  


        
    })

    // blogs colection 

    app.get('/blogs',async(req,res) => {
      const result = await blogCollection.find().toArray()

      res.send(result)
    })

    // starts or analytics

    app.get('/admin-stats',async(req,res)  => {
      const users = await userCollection.estimatedDocumentCount();
      const products = await productCollection.estimatedDocumentCount();
      const orders = await paymentCollection.estimatedDocumentCount();

      res.send({
        users,
        products,
        orders
      })
    })











    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/',(req,res) => {
    res.send('shop is runnning')
})

app.listen(port, () => {
    console.log(`shop is port ${port}`);
})
