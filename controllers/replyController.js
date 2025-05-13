import PostReply from '../models/PostReply.js';
import Post from '../models/PublicPost.js';

export const createReply = async (req, res) => {
    try {
        const { postId, content } = req.body;
        const userId = req.user.id;


        // Validate input
        if (!postId || !content) {
        return res.status(400).json({ message: 'Post ID and content are required' });
        }

        // Verify if the post exists
        const post = await Post.findById(postId);
        if (!post) {
        return res.status(404).json({ message: 'Post not found' });
        }

        // Create a new reply
        const newReply = new PostReply({
        postId,
        userId,
        content
        });
        await newReply.save();
        // Populate userId with user details
        const populatedReply = await newReply.populate('userId', 'nome permissions profilePicUrl tipo');
        return res.status(201).json(populatedReply);
    }   catch (error) {
        return res.status(500).json({ message: 'Internal server error : ' + error.message });
    }
}

export const getReplies = async (req, res) => {
    try {
        const { postId } = req.params;

        // Validate input
        if (!postId) {
            return res.status(400).json({ message: 'Post ID is required' });
        }

        // Fetch replies for the post
        const replies = await PostReply.find({ postId }).populate('userId', 'nome permissions profilePicUrl tipo');
        if (!replies || replies.length === 0) {
            return res.status(404).json({ message: 'No replies found for this post' });
        }
        return res.status(200).json(replies);
    } catch (error) {
        return res.status(500).json({ message: 'Internal server error : ' + error.message });
    }
}