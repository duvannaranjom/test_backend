import { Router } from "express";
import controller from "../controllers/customers.controller.js";
import { authInternal } from "../../middlewares/auth.internal.js";

const r = Router();
r.get("/V1/health", (_req, res) => res.json({ ok: true }));
r.post("/V1/customers", controller.create);
r.get("/V1/customers", controller.list);
r.get("/V1/customers/:id", controller.getById);
r.put("/V1/customers/:id", controller.update);
r.delete("/V1/customers/:id", controller.remove);

r.get("/V1/internal/customers/:id", authInternal, controller.getInternalById);
export default r;
