import {
  createCustomerSchema,
  updateCustomerSchema,
  idParamSchema,
  listQuerySchema,
} from "../validators/customers.validator.js";
import * as customerService from "../services/customer.service.js";

export async function create(req, res, next) {
  try {
    const dto = createCustomerSchema.parse(req.body);
    const out = await customerService.create(dto);
    res.status(201).json(out);
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const { id } = idParamSchema.parse(req.params);
    console.log("Init controller ID: ----> ", id);
    const out = await customerService.getById(id);
    if (!out) return res.sendStatus(404);
    res.json(out);
  } catch (err) {
    next(err);
  }
}

export async function list(req, res, next) {
  try {
    console.log("Init list ");
    const {
      search = "",
      cursor,
      limit = 20,
    } = listQuerySchema.parse(req.query);
    const page = await customerService.list({
      search,
      cursor,
      limit: Number(limit),
    });
    res.json(page);
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const { id } = idParamSchema.parse(req.params);
    const dto = updateCustomerSchema.parse(req.body);
    const out = await customerService.update(id, dto);
    if (!out) return res.sendStatus(404);
    res.json(out);
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const { id } = idParamSchema.parse(req.params);
    const ok = await customerService.remove(id);
    if (!ok) return res.sendStatus(404);
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
}

/** Endpoint interno para Orders/Orchestrator */
export async function getInternalById(req, res, next) {
  try {
    const { id } = idParamSchema.parse(req.params);
    const out = await customerService.getById(id);
    if (!out) return res.sendStatus(404);
    res.json({
      id: out.id,
      name: out.name,
      email: out.email,
      phone: out.phone,
    });
  } catch (err) {
    next(err);
  }
}

export default { create, getById, list, update, remove, getInternalById };
