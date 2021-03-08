const express = require('express');
const router = express.Router();
const passport = require('passport');
const bcrypt = require('bcryptjs');
const Food = require('../models/Food');
const upload = require('../controllers/uploadController');
const FoodType = require('../models/FoodType');
const User = require("../models/User");
const Restaurant = require("../models/Restaurant");
const Supplier = require("../models/Supplier");
const RestaurantAdmin = require("../models/RestaurantAdmin");
const Sale = require("../models/Sale");
const moment = require('moment');
const Order = require("../models/Order");
const TotalOrder = require("../models/TotalOrder");
const geolib = require('geolib');
const Menu = require("../models/Menu");
const {ObjectId} = require("bson");
const {isAuthenticatedAdmin} = require('../config/auth');

router.get('/',function (req,res,next){
  res.render('AdminRestaurant/login',{user:req.user});
});
router.get('/dashboard',isAuthenticatedAdmin,function (req,res,next){
  TotalOrder.find({'restaurant':req.user.restaurant})
    .populate('customer').populate('supplier')
    .exec(function (err, doc) {
      console.log(req.user);
      res.render('AdminRestaurant/dashboard',{
        user:req.user,
        order: doc
      });
    });
});

router.get('/login',function (req,res,next){
  res.render('AdminRestaurant/login');
});
router.post('/login',function(req,res,next){
  passport.authenticate('adminLocal', {
    successRedirect: '/adminRestaurant/dashboard',
    failureRedirect: '/adminRestaurant/login',
    failureFlash: true
  })(req, res, next);
});
router.get('/logout',function (req,res,next){
  res.cookie('jwt','',{maxAge: 1 });
  req.logout();
  req.flash('success_msg', 'You are logged out');
  res.redirect('/adminRestaurant/login');
});

router.get('/admin',isAuthenticatedAdmin,function (req,res,next){
  RestaurantAdmin.find({restaurant:req.user.restaurant}).populate('restaurant').exec(function(err,restAdmin){
    //console.log(restAdmin);
    res.render('AdminRestaurant/admin',{user:req.user,restAdmin:restAdmin});
  });
});
router.get('/admin/:id',isAuthenticatedAdmin,function(req,res,next){
  const adminID = req.params.id;
  RestaurantAdmin.find({_id:adminID},function(err,admin){
    res.render('adminRestaurant/restAdmin',{
      user: req.user,
      admin : admin
    });
  })
});

router.get('/administrator',isAuthenticatedAdmin,function(req,res,next){
  RestaurantAdmin.findOne({_id: req.user._id}).populate('restaurant').exec(function (err,admin){
    res.render('adminRestaurant/administrator',{
      user:req.user,
      admin: admin
    })
  });
});

router.post('/administrator/:id',isAuthenticatedAdmin,upload.single('picture'),function(req,res,next){
  const adminID = req.params.id;
  const {name,email,address,koordinate} = req.body;
  const modified = moment().format("MM/DD/YYYY, h:mm:ss");
  if(!req.file){
    RestaurantAdmin.updateOne({ _id: adminID},  {
        modified:modified,
        name:name,
        email:email,
        address:address, koordinate:koordinate
      },
      function (error, success) {
        res.redirect('/adminRestaurant/administrator');
      });
  }else{
    RestaurantAdmin.updateOne({ _id: adminID},  {
        modified:modified,
        name:name,
        email:email,
        address:address,
        picture:req.file.filename,
            koordinate:koordinate
      },
      function (error, success) {
        res.redirect('/adminRestaurant/administrator');
      });
  }
});

router.post('/admin/edit/:id',isAuthenticatedAdmin,function(req,res,next){
  const adminID = req.params.id;
  const restaurant = req.user.restaurant;
  const adminName = req.body.adminName;
  const address = req.body.address;
  const adminEmail = req.body.adminEmail;
  const status = req.body.status;
  const password = req.body.password;
  const modified = moment(new Date).format("MM/DD/YYYY, h:mm:ss");

  if (password === ""){
    RestaurantAdmin.updateOne({ _id: adminID},  {
          status: status ,
          restaurant:restaurant,
          modified:modified,
          name:adminName,
          email:adminEmail,
          address:address,
        },
        function (error, success) {
          res.redirect('/adminRestaurant/admin');
        });
  }else{
    bcrypt.genSalt(10, (err, salt) => {
      bcrypt.hash(password, salt, (err, hash) => {
        if (err) throw err;
        RestaurantAdmin.updateOne({ _id: adminID},  {
              status: status ,
              password : hash,
              restaurant:restaurant,
              modified:modified,
              name:adminName,
              email:adminEmail,
              address:address,
            },
            function (error, success) {
              res.redirect('/adminRestaurant/admin');
            });
      });
    });
  }
});


router.get('/food',isAuthenticatedAdmin,function (req,res,next){
  Food.find({restaurant:req.user.restaurant})
      .populate('type')
      .exec(function(err, food) {
        console.log(food);
        if (err) console.log(err);
        res.render('adminRestaurant/food', {
          user: req.user,
          foodArray: food
        });
      });
});
router.get('/food/:id',isAuthenticatedAdmin,function(req,res,next){
  const foodID = req.params.id;
  Food.find({_id: foodID}).populate('type').exec(function(err,food){
    FoodType.find({},function (err,ftype){
      res.render('adminRestaurant/foodItem',{
        user:req.user,
        food:food,
        FoodTypeArray: ftype
      });
    })

  });
});
router.post('/food/edit/:id',isAuthenticatedAdmin,upload.single('picture'),function (req,res,next){
  const foodID = req.params.id;
  const {name,description,type,price} = req.body;
  const modified = moment(new Date).format("MM/DD/YYYY, h:mm:ss");
  if (!req.file) {
    Food.updateOne({_id: foodID}, {
        modified: modified,
        type: type,
        name: name,
        description: description,
        price: price,
      },
      function (error, success) {
        res.redirect('/adminRestaurant/food');
      });
  }else{
    Food.updateOne({_id: foodID}, {
        modified: modified,
        type: type,
        name: name,
        description: description,
        price: price,
        picture:req.file.filename,
      },
      function (error, success) {
        res.redirect('/adminRestaurant/food');
      });
  }
});

router.delete('/food/delete/:id',isAuthenticatedAdmin,function (req,res,next){
  Food.deleteOne({ _id: req.params.id }, function (err) {
    if (err) return err;
    else res.sendStatus(200);
  });
});


router.get('/add-food-item',isAuthenticatedAdmin,function (req,res,next){
  FoodType.find({},function (err,foodtype){
    if(err) console.log(err);
    else{
      res.render('AdminRestaurant/add-food-item',{
        user:req.user,
        FoodTypeArray:foodtype
      });
    }
  })
});
router.post('/add-food-item',isAuthenticatedAdmin,upload.single('picture'),function (req,res,next){
  const {name,type,price} = req.body;
  const restaurant = req.user.restaurant;
  const picture = req.file.filename;
  const status = true;
  const meni = false;
  const description = req.body.desc;
  const newFoodItem = new Food(
    {
        name, type, price,picture,status,meni,description,restaurant
        }
    );
    newFoodItem.save().then(user =>
    {
      res.redirect('/adminRestaurant/food');
    });
});
router.get('/add-meni',isAuthenticatedAdmin,function (req,res,next){
  Food.find({restaurant:req.user.restaurant},function (err,food){
    if(err) return (err);
    else{
        FoodType.find({},function (err,types){
            if(err) return err;
            else{
                res.render('AdminRestaurant/add-meni',{
                    user:req.user,
                    FoodTypeArray:types,
                    food:food
                });
            }
        });
    }
  })
});
router.post('/add-meni',isAuthenticatedAdmin,upload.single('picture'),function (req,res,next){
  const {name,type,price,desc} = req.body;
  const picture = req.file.filename;
  const restaurant = req.user.restaurant;
  const status = true;
  const modified = moment().format("MM/DD/YYYY h:mm:ss");
  let data = req.body.menuItems;
  const food = [];
  for(let i = 0; i<data.length;i++){
      food.push(ObjectId(data[i]));
  }
  const newMenu = new Menu({
      name:name,
      type:type,
      price:price,
      picture:picture,
      status:status,
      description:desc,
      restaurant:restaurant,
      modified: modified,
      food:food
  });
  newMenu.save().then(user =>
  {
      res.redirect('/adminRestaurant/menu');
  });
});


router.get('/add-restaurant-admin',isAuthenticatedAdmin,function (req,res,next){
  res.render('AdminRestaurant/add-restaurant-admin',{user:req.user});
});

router.post('/add-restaurant-admin',isAuthenticatedAdmin,function (req,res,next){
  const restaurant = req.user.restaurant;
  const { adminName, address, koordinate , adminEmail, password} = req.body;
  const status = true;
  let errors = [];
  if (!adminName || !adminEmail || !password || !address ) {
    errors.push({msg: 'Please enter all fields'});
  }
  if (errors.length > 0) {
    res.render('AdminRestaurant/add-restaurant-admin', {
      errors,
      adminName,
      adminEmail,
      user:req.user
    });
  }else {
    RestaurantAdmin.findOne({ email: adminEmail }).then(user => {
      if (user) {
        errors.push({ msg: 'Email already exists' });
        res.render('AdminRestaurant/add-restaurant-admin', {
          errors,
          adminName,
          adminEmail,
          user:req.user
        });
      } else {
        const newUser = new RestaurantAdmin({
          name: adminName,
          email: adminEmail,
          password: password,
          restaurant : restaurant,
          address: address,
          koordinate:koordinate,
          status: status
        });
        bcrypt.genSalt(10, (err, salt) => {
          bcrypt.hash(newUser.password, salt, (err, hash) => {
            if (err) throw err;
            newUser.password = hash;
            newUser
              .save()
              .then(user => {
                res.redirect('/adminRestaurant/admin');
              })
              .catch(err => console.log(err));
          });
        });
      }
    });
  }
});


router.get('/customers',isAuthenticatedAdmin,function (req,res,next){
  const restaurant = req.user.restaurant;
  User.find({status:1,restaurants:restaurant},function(err,customers){
    console.log(customers)
      res.render('AdminRestaurant/customers',{user:req.user._id,customers:customers});
    })
});
router.get('/customers/:id',isAuthenticatedAdmin,function (req,res,next){
  const user = req.params.id;
  User.find({_id:user}).populate('orders').exec(function(err,customer){
   Order.find({customer:user,restaurant:req.user.restaurant}).sort([['status', 'descending']]).populate('food').exec(function(err,totalOrder){
     console.log(totalOrder);
     res.render('AdminRestaurant/customer',{user:req.user._id,customer:customer,totalOrder:totalOrder});

    })
  })
});
router.get('/orders',isAuthenticatedAdmin,function (req,res,next){
  TotalOrder.find({restaurant:req.user.restaurant}).populate([{
    path: 'orders',
    populate: {
      path: 'food',
      model: 'Food'
    }
  }]).populate('restaurant').populate('customer').populate('supplier').
  exec(function (err,orders){
    res.render('AdminRestaurant/orders',{
      user:req.user,
      orders:orders
    });
  })
});
router.get('/order-confirm',isAuthenticatedAdmin,function (req,res,next){
  TotalOrder.find({restaurant:req.user.restaurant,status:2})
    .populate([{
      path: 'orders',
      populate: {
        path: 'food',
        model: 'Food'
      }
    }])
    .exec(function (err,orders){
     // console.log(orders[0].orders[0])
   // console.log(orders[0].orders[0].food[0].name)
    res.render('AdminRestaurant/order-confirm',
      {user:req.user,
        orders:orders});

  })

});
router.get('/order-confirm/:id',isAuthenticatedAdmin,function (req,res,next) {
  let dostavljacID = [];
  let najmanja = 500000;
  Restaurant.findOne({_id:req.user.restaurant},function(err,restaurant){
    const adresa = restaurant.koordinate.replace("(","").replace(")","");
    const nova = adresa.split(",");
    let RestoranLatitude = parseFloat(nova[0]);
    let RestoranLongitude = parseFloat(nova[1]);
    //console.log("LATR :"+RestoranLatitude+" LONGR: "+RestoranLongitude);
    Supplier.find({restaurant:req.user.restaurant,status:2},function(err,supplier){
        //Trazi najmanju udaljenost između dostavljača i restorana
        for(let s=0;s<supplier.length;s++){
          const adres = supplier[s].koordinate.replace("(","").replace(")","");
          const nova = adres.split(",");
          var latitude1 = parseFloat(nova[0]);
          var longitude1 = parseFloat(nova[1]);
          var minimalna = geolib.getDistance( { latitude: latitude1, longitude:longitude1},
            { latitude: RestoranLatitude, longitude: RestoranLongitude },accuracy = 1);
          console.log("MINIMALNA: "+minimalna)
          if(minimalna<najmanja){
            najmanja = minimalna;
            dostavljacID.push(ObjectId(supplier[s]._id));
          }
          console.log("NAJMANJA"+najmanja);
          console.log(dostavljacID, typeof dostavljacID);
        }
      TotalOrder.find({_id: req.params.id})
        .populate([{
          path: 'orders',
          populate: {
            path: 'food',
            model: 'Food'
          }
        }]).populate('customer')
        .exec(function (err, order) {
          Supplier.findOne({_id:dostavljacID},function (err,supplier){
              res.render('AdminRestaurant/confirm-order',
                {
                  user: req.user,
                  order: order,
                  supplier:supplier
                });
            })
          });
        });
  });

});
router.post('/order-confirm/:id',isAuthenticatedAdmin,function (req,res,next){
  const supplierID = req.body.supplier;
  TotalOrder.findOneAndUpdate({_id:req.params.id},{status:3},{new:true},function(err,order) {
    if (err) {
      console.log("Something wrong when updating data!");
    }
    Supplier.findOneAndUpdate({_id:supplierID},{status:3},{new:true},function (err,supplie){
      res.redirect('/adminRestaurant/dashboard');
    })
  });
});
router.get('/assign-order',isAuthenticatedAdmin,function (req,res,next){
  res.render('AdminRestaurant/admin',{user:req.user});
});


router.get('/suppliers',isAuthenticatedAdmin,function (req,res,next){
  Supplier.find({restaurant:req.user.restaurant},function (err,suppliers){
    res.render('AdminRestaurant/suppliers',{user:req.user,suppliers:suppliers});
  });
});
router.get('/suppliers/:id',isAuthenticatedAdmin,function (req,res,next){
  const supplierID = req.params.id;
  Supplier.find({_id:supplierID},function(err,supplier){
    res.render('AdminRestaurant/supplier',{
      user: req.user,
      supplier: supplier
    })
  })
});
router.post('/suppliers/edit/:id',isAuthenticatedAdmin,function (req,res,next){
  const supplierID = req.params.id;
  const {name,address,email,status,password} = req.body;
  const modified = moment(new Date).format("MM/DD/YYYY, h:mm:ss");
  console.log("PODACI: "+name+address+email+status+password);
  if (password === ""){
    Supplier.updateOne({ _id: supplierID},  {
          status: status ,
          modified:modified,
          name:name,
          email:email,
          s_address:address
        },
        function (error, success) {
          res.redirect('/adminRestaurant/suppliers');
        });
  }else{
    bcrypt.genSalt(10, (err, salt) => {
      bcrypt.hash(password, salt, (err, hash) => {
        if (err) throw err;
        Supplier.updateOne({ _id: supplierID},  {
              status: status ,
              password : hash,
              modified:modified,
              name:name,
              email:email,
              s_address:address
            },
            function (error, success) {
              res.redirect('/adminRestaurant/suppliers');
            });
      });
    });
  }

});


router.delete('/suppliers/delete/:id',isAuthenticatedAdmin,function (req,res,next){
  Supplier.deleteOne({ _id: req.params.id }, function (err) {
    if (err) return err;
    else res.sendStatus(200);
  });
});


router.get('/add-supplier',isAuthenticatedAdmin,function (req,res,next){
  res.render('AdminRestaurant/add-suppliers',{user:req.user});
});
router.post('/add-supplier',isAuthenticatedAdmin,function (req,res,next){
  const {name,email,address,password,koordinate} = req.body;
  const status = true;
  const newSupplier = new Supplier({
    name:name,
    email:email,
    s_address:address,
    restaurant:req.user.restaurant,
    status:status,
    koordinate:koordinate
  });
  bcrypt.genSalt(10, (err, salt) => {
    bcrypt.hash(password, salt, (err, hash) => {
      if (err) throw err;
      newSupplier.password = hash;
      newSupplier.save();
    });
  });
  Restaurant.updateOne({ _id: req.user.restaurant}, {
    $push: {
      suppliers: {
        _id : newSupplier._id
      }
    }},
      function (error, success) {
        res.redirect('/adminRestaurant/suppliers');
  });
});


router.get('/add-sale',isAuthenticatedAdmin,function (req,res,next){
    Food.find({restaurant:req.user.restaurant},function(err,food){
      res.render('AdminRestaurant/add-sale',{
        user:req.user,
        food:food
      });
  });
});
router.post('/add-sale',isAuthenticatedAdmin,upload.single('picture'),function (req,res,next){
  const {name,desc,price,date_from,date_to,food } = req.body;
  const picture = req.file.filename;
  const status = true;
  const newSale = new Sale({
    name:name,
    food:food,
    description:desc,
    salePrice:price,
    date_from:date_from,
    date_to:date_to,
    picture:picture,
    status:status,
    restaurant:req.user.restaurant
  });
  newSale.save().then(user =>
  {
    res.redirect('/adminRestaurant/sale');
  });
});
router.get('/sale',isAuthenticatedAdmin,function (req,res,next){
  Sale.find({restaurant:req.user.restaurant}).populate('food').exec(function(err,sale){
    res.render('AdminRestaurant/sale',{
      user:req.user,
      sale:sale
    });
  })
});
router.get('/sale/:id',isAuthenticatedAdmin,function (req,res,next){
  const saleID = req.params.id;
  Sale.find({_id: saleID}).populate('food').exec(function(err,sale) {
      res.render('adminRestaurant/saleItem', {
        user: req.user,
        sale: sale
    });
  });
});

router.post('/sale/edit/:id',isAuthenticatedAdmin,upload.single('picture'),function (req,res,next){
  const saleID = req.params.id;
  const {name,food,date_from,date_to,price,status} = req.body;
  const modified = moment(new Date).format("MM/DD/YYYY, h:mm:ss");
  if(!req.file)
  {
    Sale.updateOne({ _id: saleID},  {
        name:name,
        food:food,
        date_from:date_from,
        date_to:date_to,
        salePrice:price,
        status:status,
        modified:modified
      },
      function (error, success) {
        res.redirect('/adminRestaurant/sale');
      });
  }else{
    Sale.updateOne({ _id: saleID},  {
        name:name,
        food:food,
        date_from:date_from,
        date_to:date_to,
        salePrice:price,
        status:status,
        modified:modified,
        picture: req.file.filename
      },
      function (error, success) {
        res.redirect('/adminRestaurant/sale');
      });
  }
});
router.delete('/sale/delete/:id',isAuthenticatedAdmin,function (req,res,next){
  Sale.deleteOne({ _id: req.params.id }, function (err) {
    if (err) return err;
    else res.sendStatus(200);
  });
});
router.get('/menu',isAuthenticatedAdmin,function(req,res,next){
  Menu.find({restaurant:req.user.restaurant}).populate('food').populate('type').exec(function(err,menu){
    res.render('adminRestaurant/menu',{
      user:req.user,
      menu:menu
    })
  })
});
router.get('/menu/:id',isAuthenticatedAdmin,function(req,res,next){
    const menuID = req.params.id;
    Menu.findOne({_id: menuID}).populate('food').populate('type').exec(function(err,menu){
        if(err) return err;
        else{
            FoodType.find({},function(err,foodtype){
                if(err) return err;
                else{
                    Food.find({restaurant:req.user.restaurant},function(err,food){
                        if(err) return err;
                        else{
                            res.render('adminRestaurant/menuItem',{
                                user:req.user,
                                menu:menu,
                                FoodTypeArray:foodtype,
                                food:food
                            });
                        }
                    })

                }
            })
        }
    });
});
router.post('/menu/edit/:id',isAuthenticatedAdmin,upload.single('picture'),function(req,res,next){
    const menuID = req.params.id;
    const {name,description,type,price} = req.body;
    const restaurant = req.user.restaurant;
    const status = true;
    const modified = moment().format("MM/DD/YYYY, h:mm:ss");
    let data = req.body.menuItems;
    const food = [];
    //console.log(data,typeof data,data.length,data[0].length)

    if (!req.file && data === undefined) {
        Menu.updateOne({_id: menuID}, {
                name:name,
                status:status,
                restaurant:restaurant,
                modified: modified,
                type: type,
                description: description,
                price: price
            },
            function (error, success) {
                res.redirect('/adminRestaurant/menu');
            });
    }else if(!req.file && data!==undefined){
        for(let i = 0; i<data.length;i++){
            food.push(ObjectId(data[i]));
        }
        Menu.updateOne({_id: menuID}, {
                name:name,
                status:status,
                restaurant:restaurant,
                modified: modified,
                type: type,
                description: description,
                price: price,
                $push: {
                    food: food
                }
            },
            function (error, success) {
                res.redirect('/adminRestaurant/menu');
            });
    }else if(req.file && data===undefined){
        Menu.updateOne({_id: menuID}, {
                name:name,
                status:status,
                restaurant:restaurant,
                modified: modified,
                type: type,
                description: description,
                price: price,
                picture:req.file.filename,
                $push: {
                    food: food
                }
            },
            function (error, success) {
                res.redirect('/adminRestaurant/menu');
            });
    }else if(req.file && data !==undefined){
        for(let i = 0; i<data.length;i++){
            food.push(ObjectId(data[i]));
        }
        Menu.updateOne({_id: menuID}, {
                name:name,
                status:status,
                restaurant:restaurant,
                modified: modified,
                type: type,
                description: description,
                price: price,
                picture:req.file.filename,
                $push: {
                    food: food
                }
            },
            function (error, success) {
                res.redirect('/adminRestaurant/menu');
            });
    }
});
router.delete('/menu/delete/:id',isAuthenticatedAdmin,function (req,res,next){
    Menu.deleteOne({ _id: req.params.id }, function (err) {
        if (err) return err;
        else res.sendStatus(200);
    });
});
router.delete('/menu/deleteItem/:id/:food',isAuthenticatedAdmin,function (req,res,next){
    Menu.updateOne({ _id: req.params.id },
        {$pull : {food : req.params.food}},
        {new:true},function(err,r){
        if(err) return err;
        else{
            res.sendStatus(200);
        }
    });

});




module.exports = router;
