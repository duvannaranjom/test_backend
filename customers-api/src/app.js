import "dotenv/config";
import express from "express";
import customersRoutes from "./api/routes/customers.routes.js";
import { errorHandler } from "./middlewares/error-handler.js";

const app = express();
app.use(express.json());

// rutas
app.use("/", customersRoutes);

// manejo de errores
app.use((req, res) => res.status(404).json({ message: "Not found" }));
app.use(errorHandler);

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => console.log(`Customers API listening on :${PORT}`));

export default app;
