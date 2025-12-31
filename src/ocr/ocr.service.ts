
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import sharp from 'sharp';
import Tesseract from 'tesseract.js';

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  async extractText(imageBuffer: Buffer): Promise<string> {
    try {
      this.logger.log('Processing image with Tesseract...');

      // Optimize image for Tesseract
      // 1. Resize to ensure reasonable size (not too huge, not too small)
      // 2. Crop top 25% for card title
      // 3. Grayscale and Normalize for better OCR contrast
      const image = sharp(imageBuffer);
      const metadata = await image.metadata();
      
      const processedBuffer = await image
        .resize({ width: 2000, withoutEnlargement: true }) // Ensure enough resolution
        .extract({ 
          left: 0, 
          top: 0, 
          width: metadata.width || 1000, 
          height: Math.floor((metadata.height || 1000) * 0.25) 
        })
        .grayscale()
        .normalize()
        .toBuffer();

      const worker = await Tesseract.createWorker('eng');
      
      try {
        const { data: { text } } = await worker.recognize(processedBuffer);
        
        this.logger.log(`OCR Raw Output: ${text}`);

        // Clean up text
        // Take the first non-empty line that looks like text
        const lines = text.split('\n')
          .map(l => l.trim())
          .filter(l => l.length > 3); // Filter very short noise

        const cleanText = lines[0] || "";
        
        // Remove special characters mostly, keep letters numbers and basic punctuation
        const finalResult = cleanText.replace(/[^a-zA-Z0-9\s',.-]/g, '').trim();

        this.logger.log(`OCR Final Result: ${finalResult}`);
        return finalResult;
      } finally {
        await worker.terminate();
      }
    } catch (error) {
      this.logger.error('Error processing OCR', error);
      throw new InternalServerErrorException('Failed to process image');
    }
  }
}
