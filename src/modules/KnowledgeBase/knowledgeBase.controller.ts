import type { Request, Response } from 'express';
import { KnowledgeBase } from './knowledgeBase.model.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';

// ---- ADMIN ROUTES ----

/**
 * Create a new Knowledge Base Article
 */
export const createArticle = asyncHandler(async (req: Request, res: Response) => {
  const { title, content, category, targetAudience, isActive } = req.body;

  if (!title || !content || !category) {
    throw new ApiError(400, 'Title, content, and category are required');
  }

  const article = await KnowledgeBase.create({
    title,
    content,
    category,
    targetAudience: targetAudience || 'All',
    isActive: isActive !== undefined ? isActive : true
  });

  res.status(201).json(new ApiResponse(201, 'Article created successfully', article));
});

/**
 * Update an existing Knowledge Base Article
 */
export const updateArticle = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const article = await KnowledgeBase.findByIdAndUpdate(
    id,
    { $set: req.body },
    { new: true, runValidators: true }
  );

  if (!article) {
    throw new ApiError(404, 'Article not found');
  }

  res.status(200).json(new ApiResponse(200, 'Article updated successfully', article));
});

/**
 * Delete a Knowledge Base Article
 */
export const deleteArticle = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const article = await KnowledgeBase.findByIdAndDelete(id);

  if (!article) {
    throw new ApiError(404, 'Article not found');
  }

  res.status(200).json(new ApiResponse(200, 'Article deleted successfully', null));
});

/**
 * Get all Knowledge Base Articles (Admin)
 */
export const getAllArticlesAdmin = asyncHandler(async (req: Request, res: Response) => {
  const articles = await KnowledgeBase.find().sort({ createdAt: -1 });
  res.status(200).json(new ApiResponse(200, 'All articles fetched successfully', articles));
});


// ---- PUBLIC/PARTNER ROUTES ----

/**
 * Get Knowledge Base Articles for Partner App
 * Filters by targetAudience and only returns active articles
 */
export const getPartnerArticles = asyncHandler(async (req: Request, res: Response) => {
  const { targetAudience } = req.query; // e.g. 'Doctor', 'Nurse', 'Ambulance', 'Rental'

  const query: any = { isActive: true };
  
  if (targetAudience) {
    query.targetAudience = { $in: [targetAudience, 'All'] };
  } else {
    // If no specific role provided, just return 'All' or general articles
    query.targetAudience = 'All';
  }

  const articles = await KnowledgeBase.find(query).sort({ category: 1, createdAt: -1 });

  res.status(200).json(new ApiResponse(200, 'Partner articles fetched successfully', articles));
});
