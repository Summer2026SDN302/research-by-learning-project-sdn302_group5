import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { protect } from '../middlewares/auth.middleware';
import User from '../models/User.model';
import { Conversation, Message } from '../models/Message.model';
import { AuthRequest } from '../types';
import { createLogger } from '../utils/logger';

const log = createLogger('Messaging');

const router = Router();

router.use(protect);

// GET /messaging/conversations - list user's conversations
router.get('/conversations', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const conversations = await Conversation.find({ participants: userId })
      .populate('participants', 'fullName email role')
      .sort({ lastMessageAt: -1 });

    const result = conversations.map((conversation) => {
      const otherParticipant = conversation.participants.find(
        (participant: any) => participant._id.toString() !== userId
      );

      return {
        _id: conversation._id,
        partner: otherParticipant || null,
        lastMessage: conversation.lastMessage,
        lastMessageAt: conversation.lastMessageAt,
      };
    });

    res.json({ success: true, data: result });
  } catch (err) {
    log.error('Failed to load conversations', err);
    res.status(500).json({
      success: false,
      message: 'Khong the tai danh sach cuoc tro chuyen',
    });
  }
});

// POST /messaging/conversations - create or get a conversation with a user
router.post('/conversations', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { partnerId } = req.body;

    if (!partnerId) {
      res.status(400).json({
        success: false,
        message: 'partnerId la bat buoc',
      });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(partnerId)) {
      res.status(400).json({
        success: false,
        message: 'partnerId khong hop le',
      });
      return;
    }

    if (partnerId === userId) {
      res.status(400).json({
        success: false,
        message: 'Khong the tao cuoc tro chuyen voi chinh ban',
      });
      return;
    }

    const partner = await User.findById(partnerId).select('fullName email role isActive');
    if (!partner || !partner.isActive) {
      res.status(404).json({
        success: false,
        message: 'Nguoi dung khong ton tai hoac da bi vo hieu hoa',
      });
      return;
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [userId, partnerId], $size: 2 },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [userId, partnerId],
      });
    }

    await conversation.populate('participants', 'fullName email role');

    const otherParticipant = conversation.participants.find(
      (participant: any) => participant._id.toString() !== userId
    );

    res.json({
      success: true,
      data: {
        _id: conversation._id,
        partner: otherParticipant || null,
        lastMessage: conversation.lastMessage,
        lastMessageAt: conversation.lastMessageAt,
      },
    });
  } catch (err) {
    log.error('Failed to create conversation', err);
    res.status(500).json({
      success: false,
      message: 'Khong the tao cuoc tro chuyen',
    });
  }
});

// GET /messaging/conversations/:id/messages - get messages in a conversation
router.get('/conversations/:id/messages', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const conversationId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      res.status(400).json({ success: false, message: 'ID khong hop le' });
      return;
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
    });

    if (!conversation) {
      res.status(404).json({
        success: false,
        message: 'Cuoc tro chuyen khong ton tai',
      });
      return;
    }

    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 100);

    const messages = await Message.find({ conversationId })
      .populate('sender', 'fullName email role')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    await Message.updateMany(
      { conversationId, sender: { $ne: userId }, readBy: { $ne: userId } },
      { $addToSet: { readBy: userId } }
    );

    res.json({ success: true, data: messages.reverse() });
  } catch (err) {
    log.error('Failed to load messages', err);
    res.status(500).json({
      success: false,
      message: 'Khong the tai tin nhan',
    });
  }
});

// POST /messaging/conversations/:id/messages - send a message
router.post('/conversations/:id/messages', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const conversationId = req.params.id;
    const { text } = req.body;

    if (!text || !text.trim()) {
      res.status(400).json({
        success: false,
        message: 'Noi dung tin nhan khong duoc trong',
      });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      res.status(400).json({ success: false, message: 'ID khong hop le' });
      return;
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
    });

    if (!conversation) {
      res.status(404).json({
        success: false,
        message: 'Cuoc tro chuyen khong ton tai',
      });
      return;
    }

    const message = await Message.create({
      conversationId,
      sender: userId,
      text: text.trim(),
      readBy: [userId],
    });

    conversation.lastMessage = text.trim().substring(0, 100);
    conversation.lastMessageAt = new Date();
    await conversation.save();

    await message.populate('sender', 'fullName email role');

    res.status(201).json({ success: true, data: message });
  } catch (err) {
    log.error('Failed to send message', err);
    res.status(500).json({
      success: false,
      message: 'Khong the gui tin nhan',
    });
  }
});

export default router;
