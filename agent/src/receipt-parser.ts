import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini
function getGeminiModel() {
  const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.GOOGLE_VISION_API_KEY;

  if (!GOOGLE_API_KEY) {
    throw new Error('GOOGLE_API_KEY environment variable is required');
  }

  const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
  return genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json" }
  });
}

export interface ParsedReceipt {
  items: Array<{
    description: string;
    price: number;
  }>;
  subtotal?: number;
  tax?: number;
  tip?: number;
  total?: number;
  merchant?: string;
  date?: string;
  currency?: string;
}

/**
 * Parse receipt image using Google Gemini AI
 */
export async function parseReceiptWithGoogleVision(
  imageBase64: string
): Promise<ParsedReceipt> {
  console.log('📋 Parsing receipt with Google Gemini AI...');

  try {
    const model = getGeminiModel();

    const prompt = `
      Analyze this receipt image. Extract the following data:
      1. Merchant Name
      2. Date (in YYYY-MM-DD format if possible, otherwise as found)
      3. Total Amount (the final amount paid)
      4. A list of all line items with product description and price.

      IMPORTANT: Extract ONLY the actual purchased items, NOT subtotals, tax, tips, or totals.

      Return ONLY valid JSON with this exact schema:
      {
        "merchant": "string",
        "date": "string",
        "total": number,
        "currency": "USD",
        "items": [
          { "description": "string", "price": number }
        ]
      }

      Rules:
      - Each item must have a description and price
      - Prices should be numbers (e.g., 12.99, not "$12.99")
      - If you can't find the merchant, use "Unknown"
      - If you can't find the date, use empty string ""
      - The total should be the final amount (including tax/tip if shown)
      - Remove any quantity indicators from descriptions (1x, 2x, etc.)
    `;

    const imagePart = {
      inlineData: {
        data: imageBase64,
        mimeType: "image/jpeg",
      },
    };

    console.log('🤖 Sending image to Gemini for analysis...');
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    console.log('📝 Gemini Raw Response:', text);

    // Parse the JSON response
    const data = JSON.parse(text) as ParsedReceipt;

    // Validate we found at least some items
    if (!data.items || data.items.length === 0) {
      throw new Error('NOT_A_RECEIPT: Could not extract any items from the image');
    }

    // Ensure merchant is set
    if (!data.merchant) {
      data.merchant = 'Unknown';
    }

    // If total is missing, calculate from items
    if (!data.total || data.total === 0) {
      data.total = data.items.reduce((sum, item) => sum + item.price, 0);
    }

    // Ensure currency is set
    if (!data.currency) {
      data.currency = 'USD';
    }

    console.log(`✅ Parsed receipt with ${data.items.length} items (Total: $${data.total.toFixed(2)})`);
    console.log(`   Merchant: ${data.merchant}`);
    console.log(`   Date: ${data.date || 'Not found'}`);

    return data;

  } catch (error: any) {
    console.error('Error parsing receipt with Gemini:', error);

    // Provide more helpful error messages
    if (error.message && error.message.includes('API_KEY')) {
      throw new Error('GOOGLE_API_KEY is missing or invalid. Please set it in your .env file.');
    }

    if (error instanceof SyntaxError) {
      throw new Error('Failed to parse Gemini response as JSON. The image might not be a valid receipt.');
    }

    throw error;
  }
}

/**
 * Download attachment from XMTP message
 */
export async function downloadAttachment(
  attachmentData: Uint8Array
): Promise<string> {
  // Convert Uint8Array to base64 string
  const base64 = Buffer.from(attachmentData).toString('base64');
  return base64;
}

/**
 * Calculate total from line items if not provided
 */
export function calculateTotal(receipt: ParsedReceipt): number {
  if (receipt.total) {
    return receipt.total;
  }

  const itemsTotal = receipt.items.reduce((sum, item) => sum + item.price, 0);
  const tax = receipt.tax || 0;
  const tip = receipt.tip || 0;

  return itemsTotal + tax + tip;
}
