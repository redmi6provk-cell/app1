import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Directory for storing uploads
const UPLOADS_DIR = path.join(process.cwd(), 'public/uploads');

// Ensure uploads directory exists
const ensureUploadsDir = async () => {
  if (!existsSync(UPLOADS_DIR)) {
    await mkdir(UPLOADS_DIR, { recursive: true });
  }
};

// Handle POST request for image uploads
export async function POST(request: NextRequest) {
  try {
    // Ensure upload directory exists
    await ensureUploadsDir();

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('image') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const fileType = file.type;
    if (!fileType.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Uploaded file must be an image' },
        { status: 400 }
      );
    }

    // Generate a unique filename
    const extension = fileType.split('/')[1] || 'png';
    const fileName = `${uuidv4()}.${extension}`;
    const filePath = path.join(UPLOADS_DIR, fileName);

    // Convert file to buffer and save it
    const fileBuffer = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(fileBuffer));

    // Return the image URL (relative to public directory)
    const imageUrl = `/uploads/${fileName}`;
    
    return NextResponse.json({ 
      success: true, 
      imageUrl 
    });
  } catch (error: unknown) {
    console.error('Error uploading image:', error);
    const message = error instanceof Error ? error.message : 'Failed to upload image';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
} 