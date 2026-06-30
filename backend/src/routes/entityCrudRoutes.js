import { Router } from "express";
import {
  createEntity,
  deleteEntity,
  getEntity,
  listEntities,
  updateEntity,
} from "../services/entityRepository.js";

const isNumericId = (value) => /^\d+$/.test(String(value));

const requireNumericId = (definition, id) => {
  if (definition.get || isNumericId(id)) {
    return;
  }

  const error = new Error(`${definition.label} id must be numeric.`);
  error.statusCode = 400;
  throw error;
};

export const createEntityCrudRoutes = (definition) => {
  const router = Router();

  router.get("/", async (_req, res, next) => {
    try {
      const items = await listEntities(definition);
      return res.json({ items });
    } catch (error) {
      return next(error);
    }
  });

  router.get("/:id", async (req, res, next) => {
    try {
      requireNumericId(definition, req.params.id);
      const item = await getEntity(definition, req.params.id);

      if (!item) {
        return res.status(404).json({ message: `${definition.label} not found.` });
      }

      return res.json({ item });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/", async (req, res, next) => {
    try {
      if (definition.readOnly) {
        return res.status(405).json({ message: `${definition.label} is read-only.` });
      }

      const item = await createEntity(definition, req.body);
      return res.status(201).json({ item });
    } catch (error) {
      return next(error);
    }
  });

  router.put("/:id", async (req, res, next) => {
    try {
      if (definition.readOnly) {
        return res.status(405).json({ message: `${definition.label} is read-only.` });
      }

      requireNumericId(definition, req.params.id);
      const item = await updateEntity(definition, req.params.id, req.body);

      if (!item) {
        return res.status(404).json({ message: `${definition.label} not found.` });
      }

      return res.json({ item });
    } catch (error) {
      return next(error);
    }
  });

  router.delete("/:id", async (req, res, next) => {
    try {
      if (definition.readOnly) {
        return res.status(405).json({ message: `${definition.label} is read-only.` });
      }

      requireNumericId(definition, req.params.id);
      const deleted = await deleteEntity(definition, req.params.id);

      if (!deleted) {
        return res.status(404).json({ message: `${definition.label} not found.` });
      }

      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  });

  return router;
};
