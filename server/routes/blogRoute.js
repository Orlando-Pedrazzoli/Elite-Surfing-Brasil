import express from 'express';
import {
  getPosts,
  getFeaturedPosts,
  getPostBySlug,
  getAllPostsAdmin,
  createPost,
  updatePost,
  deletePost,
  togglePublish,
} from '../controllers/blogController.js';
import authSeller from '../middlewares/authSeller.js';

const blogRouter = express.Router();

// Rotas públicas
blogRouter.get('/', getPosts);
blogRouter.get('/featured', getFeaturedPosts);
blogRouter.get('/post/:slug', getPostBySlug);

// Rotas admin (seller)
blogRouter.get('/admin/all', authSeller, getAllPostsAdmin);
blogRouter.post('/admin', authSeller, createPost);
blogRouter.put('/admin/:id', authSeller, updatePost);
blogRouter.delete('/admin/:id', authSeller, deletePost);
blogRouter.put('/admin/:id/toggle', authSeller, togglePublish);

export default blogRouter;
