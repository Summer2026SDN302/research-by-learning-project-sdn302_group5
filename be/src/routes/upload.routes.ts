import { Router, Request, Response } from 'express';
import { protect } from '../middlewares/auth.middleware';
import path from 'path';
import fs from 'fs';

const router = Router();
router.use(protect);

const UPLOAD_DIR = path.join(__dirname, '../../uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// POST /upload — handle file upload via base64
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { fileName, fileData, fileType } = req.body;

    if (!fileName || !fileData) {
      res.status(400).json({ success: false, message: 'fileName và fileData là bắt buộc' });
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (fileType && !allowedTypes.includes(fileType)) {
      res.status(400).json({ success: false, message: 'Loại file không được hỗ trợ' });
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    const buffer = Buffer.from(fileData, 'base64');
    if (buffer.length > maxSize) {
      res.status(400).json({ success: false, message: 'File quá lớn (tối đa 5MB)' });
      return;
    }

    // Sanitize filename
    const ext = path.extname(fileName).toLowerCase();
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
    if (!allowedExtensions.includes(ext)) {
      res.status(400).json({ success: false, message: 'Phần mở rộng file không hợp lệ' });
      return;
    }

    const safeName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
    const filePath = path.join(UPLOAD_DIR, safeName);

    fs.writeFileSync(filePath, buffer);

    res.status(201).json({
      success: true,
      data: {
        url: `/uploads/${safeName}`,
        originalName: fileName,
        size: buffer.length,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi tải file lên' });
  }
});

export default router;
