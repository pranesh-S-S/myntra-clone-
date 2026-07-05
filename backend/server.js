const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const userrouter = require("./routes/Userroutes");
const categoryrouter = require("./routes/Categoryroutes");
const productrouter = require("./routes/Productroutes");
const Bagroutes = require("./routes/Bagroutes");
const Wishlistroutes = require("./routes/Wishlistroutes");
const OrderRoutes = require("./routes/OrderRoutes");
const RecentlyViewedRoutes = require("./routes/RecentlyViewedRoutes");
const NotificationRoutes = require("./routes/NotificationRoutes");
const TransactionRoutes = require("./routes/TransactionRoutes");
const CartRoutes = require("./routes/CartRoutes");
const RecommendationRoutes = require("./routes/RecommendationRoutes");
const { startCronJobs } = require("./services/cronJobs");
const cors = require('cors');
dotenv.config();
const app = express();
app.use(express.json());
app.use(cors({
  origin: true, 
  credentials: true, 
}));
app.get("/", (req, res) => {
  res.send("✅ Myntra backend in working");
});
app.use("/user", userrouter);
app.use("/category", categoryrouter);
app.use("/product", productrouter);
app.use("/bag", Bagroutes);
app.use("/wishlist", Wishlistroutes);
app.use("/Order", OrderRoutes);
app.use("/recently-viewed", RecentlyViewedRoutes);
app.use("/notifications", NotificationRoutes);
app.use("/transactions", TransactionRoutes);
app.use("/cart", CartRoutes);
app.use("/recommendations", RecommendationRoutes);
mongoose
  .connect(process.env.MONGO_URI, { family: 4 })
  .then(() => {
    console.log("Mongodb connected");
    // Start cron jobs after DB is ready
    startCronJobs();
  })
  .catch((err) => console.log(err));

const PORT = process.env.PORT;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
