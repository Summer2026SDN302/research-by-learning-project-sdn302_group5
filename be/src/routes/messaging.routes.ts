import { Router, Request, Response } from 'express';
import { protect } from '../middlewares/auth.middleware';
import { Conversation, Message } from '../models/Message.model';
import mongoose from 'mongoose';

const router = Router();
router.use(protect);

// GET /messaging/conversations — list user's conversations
router.get('/conversations', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const conversations = await Conversation.find({ participants: userId })
      .populate('participants', 'fullName email role')
      .sort({ lastMessageAt: -1 });

    const result = conversations.map((c) => {
      const other = c.participants.find(
        (p: any) => p._id.toString() !== userId.toString()
      );
      return {
        _id: c._id,
        partner: other,
        lastMessage: c.lastMessage,
        lastMessageAt: c.lastMessageAt,
      };
    });

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi tải cuộc trò chuyện' });
  }
});

// POST /messaging/conversations — create or get a conversation with a user
router.post('/conversations', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    const { partnerId } = req.body;
    if (!partnerId) {
      res.status(400).json({ success: false, message: 'partnerId là bắt buộc' });
      return;
    }

    // Check existing conversation
    let conversation = await Conversation.findOne({
      participants: { $all: [userId, partnerId], $size: 2 },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [userId, partnerId],
      });
    }

    await conversation.populate('participants', 'fullName email role');

    res.json({ success: true, data: conversation });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi tạo cuộc trò chuyện' });
  }
});

// GET /messaging/conversations/:id/messages — get messages in a conversation
router.get('/conversations/:id/messages', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    const conversationId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      res.status(400).json({ success: false, message: 'ID không hợp lệ' });
      return;
    }

    // Verify user is participant
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
    });
    if (!conversation) {
      res.status(404).json({ success: false, message: 'Cuộc trò chuyện không tồn tại' });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    const messages = await Message.find({ conversationId })
      .populate('sender', 'fullName email role')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Mark as read
    await Message.updateMany(
      { conversationId, sender: { $ne: userId }, readBy: { $ne: userId } },
      { $addToSet: { readBy: userId } }
    );

    res.json({ success: true, data: messages.reverse() });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi tải tin nhắn' });
  }
});

// POST /messaging/conversations/:id/messages — send a message
router.post('/conversations/:id/messages', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    const conversationId = req.params.id;
    const { text } = req.body;

    if (!text || !text.trim()) {
      res.status(400).json({ success: false, message: 'Nội dung tin nhắn không được trống' });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      res.status(400).json({ success: false, message: 'ID không hợp lệ' });
      return;
    }

    // Verify user is participant
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
    });
    if (!conversation) {
      res.status(404).json({ success: false, message: 'Cuộc trò chuyện không tồn tại' });
      return;
    }

    const message = await Message.create({
      conversationId,
      sender: userId,
      text: text.trim(),
      readBy: [userId],
    });

    // Update conversation
    conversation.lastMessage = text.trim().substring(0, 100);
    conversation.lastMessageAt = new Date();
    await conversation.save();

    await message.populate('sender', 'fullName email role');

    res.status(201).json({ success: true, data: message });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi gửi tin nhắn' });
  }
});

export default router;
