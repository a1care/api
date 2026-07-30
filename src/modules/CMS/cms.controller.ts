import type { Request, Response } from 'express';
import { CMSContent } from './cms.model.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';

// ---- ADMIN ROUTES ----

/**
 * Update or Create CMS Content (Terms, Privacy, FAQ)
 * Only Super Admin
 */
export const upsertCMSContent = asyncHandler(async (req: Request, res: Response) => {
  const { type, targetApp, content, faqs } = req.body;

  if (!['TERMS', 'PRIVACY', 'FAQ'].includes(type)) {
    throw new ApiError(400, 'Invalid type. Must be TERMS, PRIVACY, or FAQ.');
  }
  if (!['CUSTOMER', 'PARTNER'].includes(targetApp)) {
    throw new ApiError(400, 'Invalid targetApp. Must be CUSTOMER or PARTNER.');
  }

  let cmsContent = await CMSContent.findOne({ type, targetApp });

  if (cmsContent) {
    if (type === 'FAQ') {
      cmsContent.faqs = faqs || [];
    } else {
      cmsContent.content = content || '';
    }
    await cmsContent.save();
  } else {
    cmsContent = await CMSContent.create({
      type,
      targetApp,
      content: type === 'FAQ' ? '' : content,
      faqs: type === 'FAQ' ? (faqs || []) : []
    });
  }

  res.status(200).json(new ApiResponse(200, 'CMS content updated successfully', cmsContent));
});

/**
 * Get all CMS Content (For Admin Panel to manage)
 * Only Super Admin
 */
export const getAllCMSContent = asyncHandler(async (req: Request, res: Response) => {
  const allContent = await CMSContent.find().sort({ createdAt: -1 });
  res.status(200).json(new ApiResponse(200, 'All CMS content fetched', allContent));
});


// ---- PUBLIC ROUTES ----

/**
 * Get CMS Content for Mobile Apps
 * Public route
 */
export const getPublicCMSContent = asyncHandler(async (req: Request, res: Response) => {
  const { type, targetApp } = req.params as { type: string; targetApp: string };
  
  if (!type || !['TERMS', 'PRIVACY', 'FAQ'].includes(type.toUpperCase())) {
    throw new ApiError(400, 'Invalid type');
  }
  if (!targetApp || !['CUSTOMER', 'PARTNER'].includes(targetApp.toUpperCase())) {
    throw new ApiError(400, 'Invalid targetApp');
  }

  const cmsContent = await CMSContent.findOne({ 
    type: type.toUpperCase(), 
    targetApp: targetApp.toUpperCase() 
  });

  // Return a graceful default if not found
  if (!cmsContent) {
    if (type.toUpperCase() === 'FAQ') {
      return res.status(200).json(new ApiResponse(200, 'FAQ fetched', { faqs: [] }));
    } else {
      return res.status(200).json(new ApiResponse(200, `${type} fetched`, { content: '' }));
    }
  }

  res.status(200).json(new ApiResponse(200, `${type} fetched successfully`, cmsContent));
});
