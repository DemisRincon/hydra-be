
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import sharp from 'sharp';
import Tesseract from 'tesseract.js';

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);
  private genAI: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      this.logger.warn('Gemini API Key not found');
    } else {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  async extractText(imageBuffer: Buffer): Promise<string> {
    try {
      if (this.genAI) {
        // Optimize image: Resize to max 1024px and compress as JPEG
        const optimizedBuffer = await sharp(imageBuffer)
          .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toBuffer();

        const base64Image = optimizedBuffer.toString('base64');
        const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

        const prompt = `Identify the exact card name of this Magic: The Gathering card. 
        Return ONLY the card name, nothing else. 
        If it's not a card, return an empty string.
        Ignore any set symbols, flavor text, or stats.`;

        try {
          const result = await this.generateWithRetry(model, prompt, base64Image);
          const response = await result.response;
          let text = response.text();
          text = text.trim().replace(/\n/g, ' ');
          this.logger.log(`OCR Result (Gemini): ${text}`);
          return text;
        } catch (geminiError) {
          this.logger.warn(`Gemini OCR failed: ${geminiError.message}. Falling back to Tesseract.`);
          // Fallback to Tesseract below
        }
      }

      this.logger.log('Starting Tesseract fallback...');
      
      // Pre-process image for Tesseract to focus on the Card Name (Top 20%)
      const image = sharp(imageBuffer);
      const metadata = await image.metadata();
      
      const tesseractBuffer = await image
        .extract({ 
          left: 0, 
          top: 0, 
          width: metadata.width || 1000, 
          height: Math.floor((metadata.height || 1000) * 0.25) // Top 25%
        })
        .toBuffer(); // Try without aggressive grayscale/normalize first

      // Tesseract fallback
      const worker = await Tesseract.createWorker('eng'); 
      try {
        const { data: { text } } = await worker.recognize(tesseractBuffer);
        this.logger.log(`OCR Result (Tesseract RAW): ${text}`);
        
        // Cleanup: Remove special chars, take first meaningful chunk
        const cleanText = text.replace(/[^a-zA-Z0-9\s]/g, '').trim();
        const firstLine = cleanText.split('\n')[0] || cleanText;

        this.logger.log(`OCR Result (Tesseract Final): ${firstLine}`);
        return firstLine;
      } finally {
        await worker.terminate();
      }

    } catch (error) {
      this.logger.error('Error processing OCR', error);
      throw new InternalServerErrorException('Failed to process image');
    }
  }

  private async generateWithRetry(model: any, prompt: string, base64Image: string, retries = 1): Promise<any> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const result = await model.generateContent([
          prompt,
          {
            inlineData: {
              data: base64Image,
              mimeType: 'image/jpeg',
            },
          },
        ]);
        return result;
      } catch (error: any) {
        // Check if it's a 429 error
        if (error.status === 429 || error.message?.includes('429')) {
          if (attempt === retries) throw error;
          
          let delay = 3000 * Math.pow(2, attempt - 1); // 3s, 6s, 12s
          
          // Try to extract retry delay from error message or details if available
          // The error logs showed: retryDelay: '12s' in errorDetails
          if (error.errorDetails) {
            const retryInfo = error.errorDetails.find((d: any) => d.retryDelay);
            if (retryInfo && retryInfo.retryDelay) {
               const seconds = parseFloat(retryInfo.retryDelay.replace('s', ''));
               if (!isNaN(seconds)) {
                 delay = (seconds * 1000) + 1000; // Add 1s buffer
               }
            }
          }

          this.logger.warn(`Gemini Request Rate Limited (429). Retrying in ${delay}ms... (Attempt ${attempt}/${retries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }
  }
}
