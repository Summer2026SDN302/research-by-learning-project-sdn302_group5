import Product, { IProduct } from '../models/Product.model';
import Review, { IReview } from '../models/Review.model';
import { AppError } from '../middlewares/error.middleware';

export interface CreateProductBody {
  name: string;
  location: string;
  farm: string;
  image: string;
  priceMin: number;
  priceMax: number;
  unit?: string;
  expectedDate?: string;
  progress?: number;
  remaining?: number;
  totalQuantity?: number;
  note?: string;
  badge?: string;
  category: string;
  region: string;
  type?: string;
  description?: string;
  nutritionInfo?: string;
  certifications?: string[];
  commitments?: string[];
  seller?: {
    name: string;
    avatar: string;
    rating?: number;
    totalContracts?: number;
  };
}

export class ProductService {
  /**
   * Get all products with optional filters
   */
  static async getAll(filters: {
    category?: string;
    region?: string;
    type?: string;
    search?: string;
    page?: number;
    limit?: number;
    sort?: string;
  }): Promise<{ products: IProduct[]; total: number; page: number; totalPages: number }> {
    const query: any = { isActive: true };

    if (filters.category) query.category = filters.category;
    if (filters.region) query.region = filters.region;
    if (filters.type) query.type = filters.type;
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { location: { $regex: filters.search, $options: 'i' } },
        { farm: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const skip = (page - 1) * limit;

    let sortOption: any = { createdAt: -1 };
    if (filters.sort === 'price_asc') sortOption = { priceMin: 1 };
    if (filters.sort === 'price_desc') sortOption = { priceMax: -1 };
    if (filters.sort === 'rating') sortOption = { rating: -1 };
    if (filters.sort === 'name') sortOption = { name: 1 };

    const [products, total] = await Promise.all([
      Product.find(query).sort(sortOption).skip(skip).limit(limit),
      Product.countDocuments(query),
    ]);

    return {
      products,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get product by ID
   */
  static async getById(productId: string): Promise<IProduct> {
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      throw new AppError('Sản phẩm không tồn tại', 404);
    }
    return product;
  }

  /**
   * Get similar products (same region or category, excluding self)
   */
  static async getSimilar(productId: string, limit: number = 4): Promise<IProduct[]> {
    const product = await Product.findById(productId);
    if (!product) return [];

    return Product.find({
      _id: { $ne: productId },
      isActive: true,
      $or: [{ region: product.region }, { category: product.category }],
    })
      .limit(limit)
      .sort({ rating: -1 });
  }

  /**
   * Get products by region
   */
  static async getByRegion(region: string): Promise<IProduct[]> {
    return Product.find({ region, isActive: true }).sort({ rating: -1 });
  }

  /**
   * Create a new product (farmer only)
   */
  static async create(body: CreateProductBody, userId: string, userName: string): Promise<IProduct> {
    // Fallback if userName is empty/null/undefined (e.g. old JWT or missing fullName)
    const resolvedName = (userName && userName.trim()) || 'Nông dân';
    const resolvedAvatar = resolvedName.slice(0, 2).toUpperCase();

    const sellerData = body.seller || {
      name: resolvedName,
      avatar: resolvedAvatar,
    };

    const product = await Product.create({
      ...body,
      seller: {
        userId,
        name: (sellerData.name && sellerData.name.trim()) || resolvedName,
        avatar: (sellerData.avatar && sellerData.avatar.trim()) || resolvedAvatar,
        rating: sellerData.rating || 5.0,
        totalContracts: sellerData.totalContracts || 0,
      },
      createdBy: userId,
    });

    return product;
  }

  /**
   * Update product (owner only)
   */
  static async update(
    productId: string,
    userId: string,
    updateData: Partial<CreateProductBody>
  ): Promise<IProduct> {
    const product = await Product.findById(productId);
    if (!product) {
      throw new AppError('Sản phẩm không tồn tại', 404);
    }

    if (product.createdBy && product.createdBy.toString() !== userId) {
      throw new AppError('Bạn không có quyền chỉnh sửa sản phẩm này', 403);
    }

    // Filter allowed fields
    const allowedFields = [
      'name', 'location', 'farm', 'image', 'priceMin', 'priceMax',
      'unit', 'expectedDate', 'progress', 'remaining', 'totalQuantity',
      'note', 'badge', 'category', 'region', 'type', 'description',
      'nutritionInfo', 'certifications', 'commitments',
    ];

    const filteredUpdate: any = {};
    for (const field of allowedFields) {
      if ((updateData as any)[field] !== undefined) {
        filteredUpdate[field] = (updateData as any)[field];
      }
    }

    const updated = await Product.findByIdAndUpdate(productId, filteredUpdate, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      throw new AppError('Cập nhật sản phẩm thất bại', 500);
    }

    return updated;
  }

  /**
   * Delete product (soft delete, owner only)
   */
  static async delete(productId: string, userId: string): Promise<void> {
    const product = await Product.findById(productId);
    if (!product) {
      throw new AppError('Sản phẩm không tồn tại', 404);
    }

    if (product.createdBy && product.createdBy.toString() !== userId) {
      throw new AppError('Bạn không có quyền xóa sản phẩm này', 403);
    }

    product.isActive = false;
    await product.save();
  }

  /**
   * Get products by farmer/seller userId
   */
  static async getByUser(userId: string): Promise<IProduct[]> {
    return Product.find({ createdBy: userId, isActive: true }).sort({ createdAt: -1 });
  }

  /**
   * Get all reviews for a product
   */
  static async getReviews(productId: string): Promise<IReview[]> {
    return Review.find({ productId }).sort({ createdAt: -1 });
  }

  /**
   * Add a review for a product (enterprise only, one per user)
   */
  static async addReview(
    productId: string,
    reviewerId: string,
    reviewerName: string,
    rating: number,
    text: string
  ): Promise<IReview> {
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      throw new AppError('Sản phẩm không tồn tại', 404);
    }

    const existing = await Review.findOne({ productId, reviewerId });
    if (existing) {
      throw new AppError('Bạn đã đánh giá sản phẩm này rồi', 400);
    }

    const review = await Review.create({
      productId,
      reviewerId,
      reviewerName,
      reviewerAvatar: reviewerName.slice(0, 1).toUpperCase(),
      rating,
      text: text.trim(),
    });

    // Recalculate and update denormalized rating on the product
    const allReviews = await Review.find({ productId });
    const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
    await Product.findByIdAndUpdate(productId, {
      rating: Math.round(avg * 10) / 10,
      reviewCount: allReviews.length,
    });

    return review;
  }
}
