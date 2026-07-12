import { pool } from "../db/pool.js";

const toNumber = (value) => (value === null || value === undefined ? null : Number(value));

const isMissing = (value) => value === undefined || value === null || value === "";

export const mapAuditFields = (row) => ({
  databaseId: Number(row.id),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const coerceValue = (field, rawValue, errors) => {
  if (isMissing(rawValue)) {
    if (field.required) {
      errors[field.name] = "Required.";
    }

    return undefined;
  }

  if (field.type === "integer") {
    const numberValue = Number(rawValue);

    if (!Number.isInteger(numberValue)) {
      errors[field.name] = "Must be an integer.";
      return undefined;
    }

    if (field.min !== undefined && numberValue < field.min) {
      errors[field.name] = `Must be at least ${field.min}.`;
      return undefined;
    }

    return numberValue;
  }

  if (field.type === "number") {
    const numberValue = Number(rawValue);

    if (!Number.isFinite(numberValue)) {
      errors[field.name] = "Must be a number.";
      return undefined;
    }

    if (field.min !== undefined && numberValue < field.min) {
      errors[field.name] = `Must be at least ${field.min}.`;
      return undefined;
    }

    return numberValue;
  }

  if (field.type === "boolean") {
    if (typeof rawValue === "boolean") {
      return rawValue;
    }

    if (rawValue === "true" || rawValue === "1") {
      return true;
    }

    if (rawValue === "false" || rawValue === "0") {
      return false;
    }

    errors[field.name] = "Must be a boolean.";
    return undefined;
  }

  if (field.type === "datetime") {
    const dateValue = new Date(rawValue);

    if (Number.isNaN(dateValue.getTime())) {
      errors[field.name] = "Must be a valid date.";
      return undefined;
    }

    return dateValue.toISOString();
  }

  const text = String(rawValue).trim();

  if (field.required && !text) {
    errors[field.name] = "Required.";
    return undefined;
  }

  return text || null;
};

export const validateEntityPayload = (definition, payload, { partial = false } = {}) => {
  const input = payload && typeof payload === "object" && !Array.isArray(payload)
    ? payload
    : {};
  const errors = {};
  const values = {};

  for (const field of definition.fields) {
    if (partial && !(field.name in input)) {
      continue;
    }

    const effectiveField = partial ? { ...field, required: false } : field;
    const coercedValue = coerceValue(effectiveField, input[field.name], errors);

    if (coercedValue !== undefined) {
      values[field.name] = coercedValue;
    }
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    values,
  };
};

export const listEntities = async (definition, context) => {
  if (definition.list) {
    return definition.list(context);
  }

  const result = await pool.query(definition.listSql);
  return result.rows.map(definition.mapRow);
};

export const getEntity = async (definition, id, context) => {
  if (definition.get) {
    return definition.get(id, context);
  }

  const result = await pool.query(definition.getSql, [id]);
  return result.rows[0] ? definition.mapRow(result.rows[0]) : null;
};

export const createEntity = async (definition, payload, context) => {
  if (definition.create) {
    return definition.create(payload, context);
  }

  const validation = validateEntityPayload(definition, payload);

  if (!validation.ok) {
    const error = new Error(`${definition.label} input is invalid.`);
    error.statusCode = 400;
    error.details = validation.errors;
    throw error;
  }

  const fields = definition.fields.filter((field) => Object.hasOwn(validation.values, field.name));
  const columns = fields.map((field) => field.column);
  const placeholders = fields.map((_field, index) => `$${index + 1}`);
  const values = fields.map((field) => validation.values[field.name]);

  const result = await pool.query(
    `
      INSERT INTO ${definition.table} (${columns.join(", ")})
      VALUES (${placeholders.join(", ")})
      RETURNING id
    `,
    values,
  );

  return getEntity(definition, result.rows[0].id, context);
};

export const updateEntity = async (definition, id, payload, context) => {
  if (definition.update) {
    return definition.update(id, payload, context);
  }

  const validation = validateEntityPayload(definition, payload, { partial: true });

  if (!validation.ok) {
    const error = new Error(`${definition.label} input is invalid.`);
    error.statusCode = 400;
    error.details = validation.errors;
    throw error;
  }

  const fields = definition.fields.filter((field) => Object.hasOwn(validation.values, field.name));

  if (fields.length === 0) {
    const error = new Error(`No ${definition.label} fields provided.`);
    error.statusCode = 400;
    throw error;
  }

  const setFragments = fields.map((field, index) => `${field.column} = $${index + 1}`);
  const values = fields.map((field) => validation.values[field.name]);

  const result = await pool.query(
    `
      UPDATE ${definition.table}
      SET ${setFragments.join(", ")}, updated_at = NOW()
      WHERE id = $${values.length + 1}
      RETURNING id
    `,
    [...values, id],
  );

  if (result.rowCount === 0) {
    return null;
  }

  return getEntity(definition, result.rows[0].id, context);
};

export const deleteEntity = async (definition, id, context) => {
  if (definition.delete) {
    return definition.delete(id, context);
  }

  const result = await pool.query(
    `DELETE FROM ${definition.table} WHERE id = $1 RETURNING id`,
    [id],
  );

  return result.rowCount > 0;
};

export const numberFromRow = toNumber;
