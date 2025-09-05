import "dotenv/config";
import express from "express";
import ordersRoutes from "./api/routes/orders.routes.js";
import { errorHandler, notFound } from "./middlewares/error-handler.js";

const app = express();
app.use(express.json());

app.use("/", ordersRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = Number(process.env.PORT ?? 3002);
app.listen(PORT, () => console.log(`Orders API listening on :${PORT}`));

export default app;
