import type { Request, Response } from 'express';
import { ServiceableArea } from './serviceableArea.model.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';

export const getPublicAreas = asyncHandler(async (req: Request, res: Response) => {
  const areas = await ServiceableArea.find({ isActive: true }).sort({ displayOrder: 1, name: 1 });
  res.status(200).json(new ApiResponse(200, 'Serviceable areas fetched', areas));
});

export const adminGetAllAreas = asyncHandler(async (req: Request, res: Response) => {
  const areas = await ServiceableArea.find().sort({ displayOrder: 1, name: 1 });
  res.status(200).json(new ApiResponse(200, 'All serviceable areas fetched', areas));
});

export const adminCreateArea = asyncHandler(async (req: Request, res: Response) => {
  const { name, city, state, isActive, displayOrder } = req.body;
  if (!name) {
    throw new ApiError(400, 'Name is required');
  }
  const area = await ServiceableArea.create({ name, city, state, isActive, displayOrder });
  res.status(201).json(new ApiResponse(201, 'Serviceable area created successfully', area));
});

export const adminUpdateArea = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, city, state, isActive, displayOrder } = req.body;
  const area = await ServiceableArea.findByIdAndUpdate(
    id,
    { name, city, state, isActive, displayOrder },
    { new: true, runValidators: true }
  );
  if (!area) {
    throw new ApiError(404, 'Serviceable area not found');
  }
  res.status(200).json(new ApiResponse(200, 'Serviceable area updated successfully', area));
});

export const adminDeleteArea = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const area = await ServiceableArea.findByIdAndDelete(id);
  if (!area) {
    throw new ApiError(404, 'Serviceable area not found');
  }
  res.status(200).json(new ApiResponse(200, 'Serviceable area deleted successfully', {}));
});

export const adminSeedAreas = asyncHandler(async (req: Request, res: Response) => {
  const defaultAreas = [
    'Safilguda', 'Neredmet', 'Malkajgiri', 'Anand Bagh', 
    'Dayanand Nagar', 'Moula Ali', 'A.S. Rao Nagar', 'Sainikpuri'
  ];
  
  let addedCount = 0;
  for (let i = 0; i < defaultAreas.length; i++) {
    const areaName = defaultAreas[i];
    const exists = await ServiceableArea.findOne({ name: areaName, city: 'Hyderabad' });
    if (!exists) {
      await ServiceableArea.create({
        name: areaName,
        city: 'Hyderabad',
        state: 'Telangana',
        isActive: true,
        displayOrder: i + 1
      });
      addedCount++;
    }
  }
  
  res.status(200).json(new ApiResponse(200, `Seeded ${addedCount} default areas successfully`, { addedCount }));
});
