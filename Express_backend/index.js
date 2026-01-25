import express from 'express'
import multer from 'multer'
import cors from 'cors';
import { searchBarcodes, getAllBarcodes } from './search.js';

const app =express();
const upload=multer();
const PORT = 3000;
app.use(express.urlencoded({extended:true}));
app.set('view engine','ejs');//Set EJS as view engine
app.use(upload.array())
app.use(express.json())
app.use(cors());


app.get('/barcode-search',(req,res)=>{
    const search_term=req.query.barcode;
    console.log("request recieved about:"+search_term);
    const results = searchBarcodes(search_term.trim());
    if (results.length === 0){
        return res.json({
            barcode : `not found`,
            product_name : 'not found'
        })
    }
    const {code, pname} = results[0];
    res.json({
        barcode:`${code}`,
        product_name:`${pname}`
    })
})

app.get('/recipe-search',(req,res)=>{
    const search_term=req.query.ingredients;
    //--------OpenAI reciepe generation here---------

    //-----------------------------------------------
    res.json({//response should be a single recipe in this json format to fill template in frontend
        title:``,
        calories:``,
        macro_nutrients:``,
        servings:``,
        preperation_time:``,
        equipment_needed:``,
        ingredients:``,
        instructions:``,
    })
})


app.use((err,req,res,next)=>{
    console.error(err.message);
    res.send('Internal Server Error');
})
app.use((req,res)=>{//Catch all invalid routes
    res.status(404).send('Sorry this is an invalid URL')
})


app.listen(PORT,()=>{
    console.log(`server is running on http://localhost:${PORT}\nyou're a goofy`)
})


/*
app.put('/users/:id', (req,res)=>{
    const userId=req.params.id;
    const {name,email}=req.body
    res.json({
        message:`User ${userId} updated to ${name} ,${email}`
    })
})

app.use('/welcome',(req, res, next) => {
  console.log('A new request received at ' + Date.now());
  next();
});

app.post('/form',(req,res)=>{
    console.log(req.body);
    res.send("form recieved");
})

app.get('/error',()=>{
    throw new Error('This is an error');
})

app.get('/',(req,res)=>{
    const userName= 'Cian';
    res.render('index',{userName})
})
app.get('/about',(req,res)=>{
    res.send('this is the about route')
})



app.post('/users',(req,res)=>{
    const{name,email}=req.body;
    res.json({
        message:`User ${name} with email ${email} created successfully!`
    })
})



app.delete('/users/:id',(req,res)=>{
    const userId=req.params.id;
    res.json({
        message:`User with ID ${userId} deleted succesfully`
    })
})


app.get('/things/:name/:id',(req,res)=>{
    const {name,id}=req.params
    res.json({
        id,
        name
    })
})

*/