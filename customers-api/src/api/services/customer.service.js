import * as customerRepo from "../repositories/mysql.customer.repo.js";
import { AppError } from "../../errors/app-error.js";

export async function create({ name, email, phone }) {
  try {
    const id = await customerRepo.create({ name, email, phone });
    return { id, name, email, phone };
  } catch (err) {
    if (err && err.code === "ER_DUP_ENTRY") {
      throw new AppError("Email already exists", 409);
    }
    throw err;
  }
}

export async function getById(id) {
  console.log("Init service ID: ----> ", id);
  return await customerRepo.findById(id);
}

export async function list({ search = "", cursor, limit = 20 }) {
  const items = await customerRepo.search({ search, cursor, limit });
  const nextCursor =
    items.length === Number(limit) ? items[items.length - 1].id : null;
  return { items, nextCursor };
}

export async function update(id, { name, email, phone }) {
  try {
    const updated = await customerRepo.update(id, { name, email, phone });
    return updated;
  } catch (err) {
    if (err && err.code === "ER_DUP_ENTRY") {
      throw new AppError("Email already exists", 409);
    }
    throw err;
  }
}

export async function remove(id) {
  return await customerRepo.remove(id);
}
