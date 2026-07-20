import { Router } from "express";
import ContractController from "./Contract.controller";
import auth from "../middleware/auth";

const router = Router();

router.post("/", auth, ContractController.create);
router.get("/", auth, ContractController.getAll);
router.get("/:id", auth, ContractController.getById);

router.patch("/:id/status", auth, ContractController.updateStatus);
router.patch("/:id/milestone", auth, ContractController.milestone);
router.patch("/:id/payment", auth, ContractController.payment);

router.delete("/:id", auth, ContractController.delete);

export default router;