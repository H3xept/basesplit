import axios from 'axios';

// Ollama API configuration
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const MODEL = process.env.OLLAMA_MODEL || 'llama3.2-vision';

export interface ParsedReceipt {
  items: Array<{
    description: string;
    price: number;
  }>;
  subtotal?: number;
  tax?: number;
  tip?: number;
  total?: number;
}

/**
 * Parse receipt image using Ollama vision model
 * NOTE: Currently mocked for testing - returns default receipt data
 */
export async function parseReceiptWithOllama(
  imageBase64: string
): Promise<ParsedReceipt> {
  // MOCK: Return default receipt data for testing
  console.log('📋 Using mocked receipt parser (OCR disabled)');

  const mockReceipt: ParsedReceipt = {
    items: [
      { description: "Margherita Pizza", price: 0.01 },
      { description: "Caesar Salad", price: 0.01 },
      { description: "Spaghetti Carbonara", price: 0.01 },
      { description: "Tiramisu", price: 0.01 },
      { description: "Coca Cola (2x)", price: 0.01 }
    ],
    subtotal: 0.05,
    tax: 0.01,
    tip: 0.01,
    total: 0.07
  };

  console.log(`✅ Mocked receipt with ${mockReceipt.items.length} items (Total: $${mockReceipt.total})`);

  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  return mockReceipt;

  /* ORIGINAL OLLAMA INTEGRATION (commented out for testing)
  const prompt = `You are a receipt parser. Analyze this receipt image and extract the line items with their prices.

Return a JSON object with this exact structure:
{
  "items": [
    {"description": "Item name", "price": 12.99}
  ],
  "subtotal": 50.00,
  "tax": 5.00,
  "tip": 10.00,
  "total": 65.00
}

Rules:
- Extract ALL line items from the receipt
- Prices should be numbers (not strings)
- If you can't find subtotal, tax, tip, or total, omit those fields
- Be accurate with prices
- Return ONLY the JSON object, no other text

Now parse this receipt:`;

  try {
    const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
      model: MODEL,
      prompt: prompt,
      images: [imageBase64],
      stream: false,
      format: 'json',
      options: {
        temperature: 0.1, // Low temperature for more consistent parsing
      }
    });

    const parsedResponse = response.data.response;

    // Parse the JSON response
    let receiptData: ParsedReceipt;
    try {
      receiptData = JSON.parse(parsedResponse);
    } catch (parseError) {
      console.error('Failed to parse Ollama response as JSON:', parsedResponse);
      throw new Error('Invalid JSON response from Ollama');
    }

    // Validate the response structure
    if (!receiptData.items || !Array.isArray(receiptData.items)) {
      throw new Error('Invalid receipt data: missing items array');
    }

    // Validate items
    receiptData.items.forEach((item, index) => {
      if (!item.description || typeof item.price !== 'number') {
        throw new Error(`Invalid item at index ${index}`);
      }
    });

    console.log(`✅ Parsed receipt with ${receiptData.items.length} items`);
    return receiptData;

  } catch (error) {
    console.error('Error parsing receipt:', error);
    throw error;
  }
  */
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
