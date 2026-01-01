import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Validate if it's a Myntra URL
    if (!url.includes("myntra.com")) {
      return NextResponse.json(
        { error: "Currently only Myntra URLs are supported" },
        { status: 400 }
      );
    }

    // Define browser-like headers
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://www.google.com/',
    };

    // Make the request
    const response = await axios.get(url, {
      headers,
      timeout: 30000,
      maxRedirects: 5,
    });

    // Return the HTML content
    return new NextResponse(response.data, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      }
    });
  } catch (error: unknown) {
    console.error("Error in proxy:", error);
    const message = error instanceof Error ? error.message : "Failed to proxy request";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
} 