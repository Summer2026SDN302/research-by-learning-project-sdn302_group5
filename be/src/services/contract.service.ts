import Contract, { IContract } from '../models/Contract.model';
import Product from '../models/Product.model';
import { AppError } from '../middlewares/error.middleware';
import { EscrowService } from './escrow.service';
import { NotificationService } from './notification.service';

export interface CreateContractBody {
  farmerId?: string;
  enterpriseId?: string;
  farmerName: string;
  enterpriseName: string;
  productName: string;
  productId?: string;
  quantity: number;
  unit: 'tan' | 'kg' | 'thung';
  pricePerUnit: number;
  depositPercentage: number;
  paymentTerms: '50_50' | '30_70' | '100_delivery' | '100_upfront';
  deliveryDate: string;
  notes?: string;
}

export class ContractService {
  /**
   * Create a new contract
   */
  static async create(
    body: CreateContractBody,
    userId: string,
    role: 'farmer' | 'enterprise'
  ): Promise<IContract> {
    let farmerId = body.farmerId;
    let enterpriseId = body.enterpriseId;

    // Resolve farmerId / enterpriseId from the product and role
    if (role === 'enterprise') {
      enterpriseId = userId;
      if (body.productId) {
        const product = await Product.findById(body.productId);
        if (product?.createdBy) {
          farmerId = product.createdBy.toString();
        }
      }
    } else {
      farmerId = userId;
    }

    if (!farmerId || !enterpriseId) {
      throw new AppError('Không thể xác định nông dân hoặc doanh nghiệp', 400);
    }

    // Calculate values
    const totalValue = body.quantity * body.pricePerUnit * 1000;
    const commission = totalValue * 3 / 100;
    const depositAmount = (totalValue * body.depositPercentage) / 100;

    // Generate unique contract code: PRE-YYYY-XXXX (retry on collision)
    const year = new Date().getFullYear();
    let contractCode: string;
    let attempts = 0;
    do {
      const seq = Math.floor(1000 + Math.random() * 9000);
      contractCode = `PRE-${year}-${seq}`;
      attempts++;
    } while (attempts < 10 && (await Contract.exists({ contractCode })));

    const contract = await Contract.create({
      ...body,
      contractCode,
      farmerId,
      enterpriseId,
      productId: body.productId || undefined,
      totalValue,
      commission,
      commissionRate: 3,
      depositAmount,
      status: 'pending',
    });

    // Notify the farmer that enterprise created a contract with them
    if (role === 'enterprise') {
      try {
        await NotificationService.create({
          userId: farmerId.toString(),
          type: 'contract',
          title: 'Hợp đồng mới từ doanh nghiệp',
          message: `Doanh nghiệp "${body.enterpriseName}" đã tạo hợp đồng mua ${body.productName} (${body.quantity} ${body.unit}). Vui lòng xem xét và ký hợp đồng.`,
          severity: 'info',
          relatedId: String(contract._id),
          relatedModel: 'Contract',
        });
      } catch { /* non-critical */ }
    }

    return contract;
  }

  /**
   * Get contract by ID (only for parties)
   */
  static async getById(contractId: string, userId: string): Promise<IContract> {
    const contract = await Contract.findById(contractId);
    if (!contract) {
      throw new AppError('Hợp đồng không tồn tại', 404);
    }

    const isParty =
      contract.farmerId.toString() === userId ||
      contract.enterpriseId.toString() === userId;
    if (!isParty) {
      throw new AppError('Bạn không có quyền xem hợp đồng này', 403);
    }

    return contract;
  }

  /**
   * List contracts for a user
   */
  static async listByUser(
    userId: string,
    role: 'farmer' | 'enterprise',
    status?: string
  ): Promise<IContract[]> {
    const query: any =
      role === 'farmer'
        ? { farmerId: userId }
        : { enterpriseId: userId };

    if (status) {
      query.status = status;
    }

    return Contract.find(query).sort({ createdAt: -1 });
  }

  /**
   * Sign a contract
   */
  static async sign(
    contractId: string,
    userId: string,
    role: 'farmer' | 'enterprise'
  ): Promise<IContract> {
    const contract = await Contract.findById(contractId);
    if (!contract) {
      throw new AppError('Hợp đồng không tồn tại', 404);
    }

    if (role === 'farmer') {
      if (contract.farmerId.toString() !== userId) {
        throw new AppError('Bạn không phải là nông dân trong hợp đồng này', 403);
      }
      contract.signedByFarmer = true;
    } else {
      if (contract.enterpriseId.toString() !== userId) {
        throw new AppError('Bạn không phải là doanh nghiệp trong hợp đồng này', 403);
      }
      contract.signedByEnterprise = true;
    }

    // If both signed, update status and product progress
    if (contract.signedByFarmer && contract.signedByEnterprise) {
      contract.signedAt = new Date();
      contract.status = 'approved';

      if (contract.productId) {
        const product = await Product.findById(contract.productId);
        if (product && product.totalQuantity > 0) {
          const unitMultiplier =
            contract.unit === 'tan' ? 1000 : contract.unit === 'thung' ? 25 : 1;
          const committedKg = contract.quantity * unitMultiplier;
          const addedPct = (committedKg / product.totalQuantity) * 100;
          product.progress = Math.min(100, (product.progress || 0) + addedPct);
          product.remaining = Math.max(0, (product.remaining ?? product.totalQuantity) - committedKg);
          await product.save();
        }
      }
    }

    await contract.save();

    // Notify parties after signing
    try {
      if (contract.signedByFarmer && contract.signedByEnterprise) {
        // Both signed — auto-create escrow
        await EscrowService.createEscrowForContract(contract);

        // Notify both parties
        await Promise.all([
          NotificationService.create({
            userId: contract.farmerId.toString(),
            type: 'contract',
            title: 'Hợp đồng đã được ký kết',
            message: `Hợp đồng ${contract.contractCode} đã được cả hai bên ký kết. Đang chờ doanh nghiệp đặt cọc ký quỹ để kích hoạt hợp đồng.`,
            severity: 'info',
            relatedId: String(contract._id),
            relatedModel: 'Contract',
          }),
          NotificationService.create({
            userId: contract.enterpriseId.toString(),
            type: 'contract',
            title: 'Hợp đồng đã được ký kết — cần đặt cọc',
            message: `Hợp đồng ${contract.contractCode} đã được cả hai bên ký kết. Vui lòng vào mục Ký quỹ để đặt cọc và kích hoạt hợp đồng.`,
            severity: 'warning',
            relatedId: String(contract._id),
            relatedModel: 'Contract',
          }),
        ]);
      } else if (role === 'farmer') {
        // Farmer signed — notify enterprise
        await NotificationService.create({
          userId: contract.enterpriseId.toString(),
          type: 'contract',
          title: 'Nông dân đã ký hợp đồng',
          message: `Nông dân "${contract.farmerName}" đã ký hợp đồng ${contract.contractCode}. Vui lòng ký để hoàn tất.`,
          severity: 'info',
          relatedId: String(contract._id),
          relatedModel: 'Contract',
        });
      } else {
        // Enterprise signed — notify farmer
        await NotificationService.create({
          userId: contract.farmerId.toString(),
          type: 'contract',
          title: 'Doanh nghiệp đã ký hợp đồng',
          message: `Doanh nghiệp "${contract.enterpriseName}" đã ký hợp đồng ${contract.contractCode}. Vui lòng ký để hoàn tất.`,
          severity: 'info',
          relatedId: String(contract._id),
          relatedModel: 'Contract',
        });
      }
    } catch { /* non-critical */ }

    return contract;
  }

  /**
   * Reject a contract (farmer rejects before signing — different from cancel)
   */
  static async reject(
    contractId: string,
    userId: string,
    reason: string
  ): Promise<IContract> {
    const contract = await Contract.findById(contractId);
    if (!contract) {
      throw new AppError('Hợp đồng không tồn tại', 404);
    }

    if (contract.farmerId.toString() !== userId) {
      throw new AppError('Chỉ nông dân mới có thể từ chối hợp đồng', 403);
    }

    if (contract.status !== 'pending') {
      throw new AppError('Chỉ có thể từ chối hợp đồng đang chờ xác nhận', 400);
    }

    if (contract.signedByFarmer) {
      throw new AppError('Bạn đã ký hợp đồng này. Dùng "Hủy hợp đồng" nếu muốn huỷ sau khi ký.', 400);
    }

    contract.status = 'cancelled';
    contract.cancelledAt = new Date();
    contract.cancelReason = `[TỪ CHỐI] ${reason}`;
    await contract.save();

    // Notify enterprise
    try {
      await NotificationService.create({
        userId: contract.enterpriseId.toString(),
        type: 'contract',
        title: 'Nông dân từ chối hợp đồng',
        message: `Nông dân "${contract.farmerName}" đã từ chối hợp đồng ${contract.contractCode}. Lý do: ${reason}`,
        severity: 'warning',
        relatedId: String(contract._id),
        relatedModel: 'Contract',
      });
    } catch { /* non-critical */ }

    return contract;
  }

  /**
   * Cancel a contract
   */
  static async cancel(
    contractId: string,
    userId: string,
    reason: string
  ): Promise<IContract> {
    const contract = await Contract.findById(contractId);
    if (!contract) {
      throw new AppError('Hợp đồng không tồn tại', 404);
    }

    const isParty =
      contract.farmerId.toString() === userId ||
      contract.enterpriseId.toString() === userId;
    if (!isParty) {
      throw new AppError('Bạn không có quyền hủy hợp đồng này', 403);
    }

    if (['completed', 'cancelled'].includes(contract.status)) {
      throw new AppError('Không thể hủy hợp đồng ở trạng thái này', 400);
    }

    const cancelledByRole = contract.farmerId.toString() === userId ? 'farmer' : 'enterprise';
    contract.status = 'cancelled';
    contract.cancelledAt = new Date();
    contract.cancelReason = reason;
    await contract.save();

    // Notify the other party
    try {
      const otherPartyId = cancelledByRole === 'farmer'
        ? contract.enterpriseId.toString()
        : contract.farmerId.toString();
      const cancellerName = cancelledByRole === 'farmer' ? contract.farmerName : contract.enterpriseName;
      await NotificationService.create({
        userId: otherPartyId,
        type: 'contract',
        title: 'Hợp đồng đã bị hủy',
        message: `${cancellerName} đã hủy hợp đồng ${contract.contractCode}. Lý do: ${reason}`,
        severity: 'warning',
        relatedId: String(contract._id),
        relatedModel: 'Contract',
      });
    } catch { /* non-critical */ }

    return contract;
  }
}
