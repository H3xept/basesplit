import OpenAI from 'openai';

// OpenAI API configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is required');
}

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

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
 * Parse receipt image using OpenAI GPT-4 Vision API
 */
export async function parseReceiptWithOpenAI(
  imageBase64: string
): Promise<ParsedReceipt> {
  console.log('📋 Parsing receipt with OpenAI Vision API...');

  const systemPrompt = `You are an advanced optical character recognition (OCR) assistant specialized in restaurant and retail receipts. Your job is to extract line items, prices, and the total from a provided image and format them into strict JSON.

Constraints:
- Ignore tax, subtotal, and tip lines in the items array. Only extract distinct purchasable items.
- If multiple counts of an item exist (e.g., "2x Burger"), split them into separate entries if possible, or note the quantity in the description.
- Ensure all prices are numbers (floats), not strings.
- Do not hallucinate items that are not visible.

Output Format (JSON Only):
{
  "merchant": "Name of the place (or Unknown)",
  "date": "YYYY-MM-DD (or null)",
  "currency": "USD",
  "total_amount": 0.00,
  "items": [
    {
      "description": "Burger",
      "price": 15.00
    },
    {
      "description": "Fries",
      "price": 5.50
    }
  ]
}

Edge Case Handling:
- If the image is blurry and unreadable, return: {"error": "IMAGE_UNREADABLE"}
- If the image is not a receipt, return: {"error": "NOT_A_RECEIPT"}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Parse JSON response
    let parsedResponse: any;
    try {
      parsedResponse = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', content);
      throw new Error('Invalid JSON response from OpenAI');
    }

    // Check for error cases
    if (parsedResponse.error === 'IMAGE_UNREADABLE') {
      throw new Error('IMAGE_UNREADABLE: The receipt image is too blurry or unclear to read');
    }

    if (parsedResponse.error === 'NOT_A_RECEIPT') {
      throw new Error('NOT_A_RECEIPT: The provided image is not a receipt');
    }

    // Validate response structure
    if (!parsedResponse.items || !Array.isArray(parsedResponse.items)) {
      throw new Error('Invalid receipt data: missing items array');
    }

    // Convert to ParsedReceipt format
    const receiptData: ParsedReceipt = {
      merchant: parsedResponse.merchant,
      date: parsedResponse.date,
      currency: parsedResponse.currency,
      items: parsedResponse.items.map((item: any) => ({
        description: item.description,
        price: parseFloat(item.price),
      })),
      total: parsedResponse.total_amount,
    };

    // Validate items
    receiptData.items.forEach((item, index) => {
      if (!item.description || typeof item.price !== 'number' || isNaN(item.price)) {
        throw new Error(`Invalid item at index ${index}: ${JSON.stringify(item)}`);
      }
    });

    console.log(`✅ Parsed receipt with ${receiptData.items.length} items (Total: $${receiptData.total})`);
    return receiptData;

  } catch (error) {
    console.error('Error parsing receipt with OpenAI:', error);
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
