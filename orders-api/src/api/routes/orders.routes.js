import { Router } from "express";
import * as ctrl from "../controllers/orders.controller.js";

const r = Router();
r.get("/V1/health", (_req, res) => res.json({ ok: true }));
r.post("/V1/orders", ctrl.create);
r.get("/V1/orders", ctrl.list);
r.get("/V1/orders/:id", ctrl.getById);
r.post("/V1/orders/:id/confirm", ctrl.confirm);
r.post("/V1/orders/:id/cancel", ctrl.cancel);

export default r;
