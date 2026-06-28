import ContractService from "./Contract.service";

export default class ContractController {
  static async create(req: any, res: any) {
    try {
      const data = await ContractService.createContract(
        req.body,
        req.user
      );
      res.json(data);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  }

  static async getAll(req: any, res: any) {
    try {
      const data = await ContractService.getAll(req.query);
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  }

  static async getById(req: any, res: any) {
    try {
      const data = await ContractService.getById(req.params.id);
      res.json(data);
    } catch (e: any) {
      res.status(404).json({ message: e.message });
    }
  }

  static async status(req: any, res: any) {
    try {
      const data = await ContractService.updateStatus(
        req.params.id,
        req.body.status,
        req.user
      );
      res.json(data);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  }

  static async milestone(req: any, res: any) {
    try {
      const data = await ContractService.doneMilestone(
        req.params.id,
        req.body.index,
        req.user
      );
      res.json(data);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  }

  static async payment(req: any, res: any) {
    try {
      const data = await ContractService.addPayment(
        req.params.id,
        req.body,
        req.user
      );
      res.json(data);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  }

  static async delete(req: any, res: any) {
    try {
      const data = await ContractService.delete(
        req.params.id,
        req.user
      );
      res.json(data);
    } catch (e: any) {
      res.status(403).json({ message: e.message });
    }
  }
}