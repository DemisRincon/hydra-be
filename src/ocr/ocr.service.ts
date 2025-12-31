
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import axios from 'axios';
import FormData from 'form-data';

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);
  private readonly apiUrl = 'https://api.ocr.space/parse/image';

  async extractText(imageBuffer: Buffer): Promise<string> {
    try {
      this.logger.log('Processing image with OCR.space API...');

      const apiKey = process.env.OCR_SPACE_API_KEY || 'helloworld'; // 'helloworld' is a free test key (limited)

      const formData = new FormData();
      formData.append('base64Image', `data:image/jpeg;base64,${imageBuffer.toString('base64')}`);
      formData.append('apikey', apiKey);
      formData.append('language', 'eng');
      formData.append('isOverlayRequired', 'false');
      formData.append('OCREngine', '2'); // Engine 2 is better for numbers and special chars
      formData.append('detectOrientation', 'true');
      formData.append('scale', 'true');
      formData.append('isTable', 'true'); // Forces line-by-line parsing, perfect for extracting just the title

      // Note: OCR.space free tier has rate limits, handle accordingly if needed
      const response = await axios.post(this.apiUrl, formData, {
        headers: {
          ...formData.getHeaders(),
        },
      });

      if (response.data.IsErroredOnProcessing) {
        this.logger.error(`OCR.space Error: ${response.data.ErrorMessage}`);
        throw new InternalServerErrorException(response.data.ErrorMessage?.[0] || 'OCR API Error');
      }

      const parsedResults = response.data.ParsedResults;
      if (!parsedResults || parsedResults.length === 0) {
        this.logger.warn('No text detected by OCR.space');
        return "";
      }

      const text = parsedResults[0].ParsedText;
      this.logger.log(`OCR Raw Output: ${text}`);

      const sanitizedText = this.sanitizeText(text);
      this.logger.log(`OCR Final Result: ${sanitizedText}`);
      
      return sanitizedText;

    } catch (error) {
      this.logger.error('Error processing OCR', error);
      throw new InternalServerErrorException('Failed to process image with OCR API');
    }
  }

  private sanitizeText(text: string): string {
    if (!text) return "";
    
    // Split by newlines to get the title (usually the first line in isTable mode)
    const lines = text.split(/[\r\n]+/)
                      .map(line => line.trim())
                      .filter(line => line.length > 2); // Filter noise

    this.logger.log(`OCR Lines Detected: ${JSON.stringify(lines)}`);

    if (lines.length === 0) return "";

    let titleLine = lines[0];

    // Remove common trademark symbols and non-text noise from start/end
    titleLine = titleLine.replace(/[©®™]/g, '');
    titleLine = titleLine.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '');
    
    // Collapse multiple spaces
    titleLine = titleLine.replace(/\s+/g, ' ');

    return titleLine.trim();
  }
}
