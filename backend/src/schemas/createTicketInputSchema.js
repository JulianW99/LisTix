export const createTicketInputSchema = {
  eventId: { type: "integer", required: true },
  sectionId: { type: "integer", required: true },
  restrictionId: { type: "integer", required: false },
  restrictionIds: { type: "integerArray", required: true },
  ticketType: { type: "string", required: true },
  marketplaceStatusId: { type: "integer", required: false },
  quantity: { type: "integer", required: true, min: 1 },
  rowLabel: { type: "string", required: true },
  lowestSeat: { type: "integer", required: true, min: 1 },
  purchasePrice: { type: "number", required: true, min: 0 },
  askingPrice: { type: "number", required: true, min: 0 },
  notes: { type: "string", required: false },
};

const isMissing = (value) => value === undefined || value === null || value === "";

const parseInteger = (fieldName, value, fieldSchema, errors) => {
  if (isMissing(value)) {
    if (fieldSchema.required) {
      errors[fieldName] = "Required.";
    }
    return undefined;
  }

  const numberValue = Number(value);

  if (!Number.isInteger(numberValue)) {
    errors[fieldName] = "Must be an integer.";
    return undefined;
  }

  if (fieldSchema.min !== undefined && numberValue < fieldSchema.min) {
    errors[fieldName] = `Must be at least ${fieldSchema.min}.`;
    return undefined;
  }

  return numberValue;
};

const parseNumber = (fieldName, value, fieldSchema, errors) => {
  if (isMissing(value)) {
    if (fieldSchema.required) {
      errors[fieldName] = "Required.";
    }
    return undefined;
  }

  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    errors[fieldName] = "Must be a number.";
    return undefined;
  }

  if (fieldSchema.min !== undefined && numberValue < fieldSchema.min) {
    errors[fieldName] = `Must be at least ${fieldSchema.min}.`;
    return undefined;
  }

  return numberValue;
};

const parseString = (fieldName, value, fieldSchema, errors) => {
  if (isMissing(value)) {
    if (fieldSchema.required) {
      errors[fieldName] = "Required.";
    }
    return undefined;
  }

  const text = String(value).trim();

  if (fieldSchema.required && !text) {
    errors[fieldName] = "Required.";
    return undefined;
  }

  return text || null;
};

const parseIntegerArray = (fieldName, value, fieldSchema, errors) => {
  if (!Array.isArray(value)) {
    if (fieldSchema.required) errors[fieldName] = "Must be an array.";
    return undefined;
  }
  const parsed = [...new Set(value.map(Number))];
  if (parsed.some((item) => !Number.isInteger(item) || item < 1)) {
    errors[fieldName] = "Must contain valid IDs.";
    return undefined;
  }
  return parsed;
};

export const validateCreateTicketInput = (payload, { partial = false } = {}) => {
  const errors = {};
  const value = {};
  const input = payload && typeof payload === "object" && !Array.isArray(payload)
    ? payload
    : {};

  for (const [fieldName, fieldSchema] of Object.entries(createTicketInputSchema)) {
    if (partial && !(fieldName in input)) {
      continue;
    }

    const effectiveSchema = partial
      ? { ...fieldSchema, required: false }
      : fieldSchema;
    const rawValue = input[fieldName];

    if (effectiveSchema.type === "integer") {
      const parsedValue = parseInteger(fieldName, rawValue, effectiveSchema, errors);
      if (parsedValue !== undefined) {
        value[fieldName] = parsedValue;
      }
      continue;
    }

    if (effectiveSchema.type === "number") {
      const parsedValue = parseNumber(fieldName, rawValue, effectiveSchema, errors);
      if (parsedValue !== undefined) {
        value[fieldName] = parsedValue;
      }
      continue;
    }

    if (effectiveSchema.type === "string") {
      const parsedValue = parseString(fieldName, rawValue, effectiveSchema, errors);
      if (parsedValue !== undefined) {
        value[fieldName] = parsedValue;
      }
      continue;
    }

    if (effectiveSchema.type === "integerArray") {
      const parsedValue = parseIntegerArray(fieldName, rawValue, effectiveSchema, errors);
      if (parsedValue !== undefined) value[fieldName] = parsedValue;
    }
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    value,
  };
};
