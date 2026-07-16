import { Router } from "express";
import {
  createEntity,
  deleteEntity,
  getEntity,
  listEntities,
  updateEntity,
} from "../services/entityRepository.js";
import { hasPermission } from "../services/accountAccessService.js";

const isNumericId = (value) => /^\d+$/.test(String(value));

const requireNumericId = (definition, id) => {
  if (definition.get || isNumericId(id)) {
    return;
  }

  const error = new Error(`${definition.label} id must be numeric.`);
  error.statusCode = 400;
  throw error;
};

const requireDefinitionPermission = (definition, action, user) => {
  const required = definition.permissions?.[action];
  if (!required) return;
  const permissions = Array.isArray(required) ? required : [required];
  if (!permissions.some((permission) => hasPermission(user, permission))) {
    const error = new Error("You do not have permission for this action.");
    error.statusCode = 403;
    throw error;
  }
};

export const createEntityCrudRoutes = (definition) => {
  const router = Router();

  router.get("/", async (req, res, next) => {
    try {
      requireDefinitionPermission(definition, "list", req.user);
      const items = await listEntities(definition, req.user);
      return res.json({ items });
    } catch (error) {
      return next(error);
    }
  });

  router.get("/:id", async (req, res, next) => {
    try {
      requireDefinitionPermission(definition, "get", req.user);
      requireNumericId(definition, req.params.id);
      const item = await getEntity(definition, req.params.id, req.user);

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
      requireDefinitionPermission(definition, "create", req.user);
      if (definition.readOnly || definition.allowCreate === false) {
        return res.status(405).json({ message: `${definition.label} is read-only.` });
      }

      const item = await createEntity(definition, req.body, req.user);
      return res.status(200).json({ item });
    } catch (error) {
      return next(error);
    }
  });

  router.put("/:id", async (req, res, next) => {
    try {
      requireDefinitionPermission(definition, "update", req.user);
      if (definition.readOnly || definition.allowUpdate === false) {
        return res.status(405).json({ message: `${definition.label} is read-only.` });
      }

      requireNumericId(definition, req.params.id);
      const item = await updateEntity(definition, req.params.id, req.body, req.user);

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
      requireDefinitionPermission(definition, "delete", req.user);
      if (definition.readOnly || definition.allowDelete === false) {
        return res.status(405).json({ message: `${definition.label} is read-only.` });
      }

      requireNumericId(definition, req.params.id);
      const deleted = await deleteEntity(definition, req.params.id, req.user);

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
