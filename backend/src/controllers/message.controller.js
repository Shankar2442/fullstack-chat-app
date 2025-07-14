import Message from "../models/message.model.js";
import User from "../models/users.model.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

export const getUsersList = async (req, res) => {
  try {
    const loggedInUser = req.user._id;
    const filteredUsers = await User.find({ _id: { $ne: loggedInUser } });
    res.status(200).json(filteredUsers);
  } catch (error) {
    console.log("Error in getUsersList controller", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getMessageById = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;
    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    });
    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessageById controller", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getUnreadMessageCount = async (req, res) => {
  try {
    const { id: senderId } = req.params;
    const receiverId = req.user._id;

    if (!senderId || !receiverId) {
      return res.status(400).json({ message: 'Missing required parameters' });
    }

    // Get unread messages count
    const unreadCount = await Message.countDocuments({
      senderId,
      receiverId,
      read: false
    });

    res.json({ count: unreadCount });
  } catch (error) {
    console.error("Error in getUnreadMessageCount controller:", error);
    res.status(500).json({ 
      message: "Internal server error",
      error: error.message 
    });
  }
};

export const markMessagesAsRead = async (req, res) => {
  try {
    const { id: senderId } = req.params;
    const receiverId = req.user._id;

    await Message.updateMany(
      { 
        senderId, 
        receiverId, 
        read: false 
      },
      { $set: { read: true } }
    );

    res.json({ success: true });
  } catch (error) {
    console.log("Error in markMessagesAsRead controller", error);
    res.status(500).json({ message: "Failed to mark messages as read" });
  }
};

export const sendNewMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    let imageUrl;
    if (image) {
      try {
        // Configure Cloudinary upload options
        const uploadOptions = {
          resource_type: 'auto',
          folder: 'chat-app',
          quality: 'auto',
          fetch_format: 'auto',
          transformation: [
            { width: 1920, height: 1080, crop: 'limit' },
            { quality: 'auto:eco' }
          ]
        };

        // Upload image with options
        const responseImage = await cloudinary.uploader.upload(image, uploadOptions);
        imageUrl = responseImage.secure_url;
      } catch (uploadError) {
        console.log('Cloudinary Upload Error:', uploadError);
        if (uploadError.http_code === 413 || uploadError.http_code === 400) {
          return res.status(413).json({
            message: 'Please select an image under 10MB',
            error: uploadError.message || 'Image size too large'
          });
        }
        throw uploadError;
      }
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
      read: false, // Explicitly mark as unread
    });
    await newMessage.save();

    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendNewMessage controller", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};
