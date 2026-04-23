/**
 * Provides access to the Gemini model for parsing queries.
 * We'll use the frontend SDK as dictated by rules, 
 * however we will use an API route to fetch HTML content securely if needed to bypass CORS.
 */
import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 });

    let finalUrl = url;
    if (!finalUrl.startsWith('http')) {
      finalUrl = 'https://' + finalUrl;
    }

    const res = await fetch(finalUrl, { 
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!res.ok) {
      throw new Error(`Failed to fetch ${finalUrl}: ${res.statusText}`);
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    // Remove scripts, styles, etc for cleaner text
    $('script, style, noscript, svg, img, video, iframe').remove();

    // Extract text
    const text = $('body').text().replace(/\s+/g, ' ').trim();
    
    // Attempt simple email scraping 
    const emailMatches = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi);
    const emails = emailMatches ? Array.from(new Set(emailMatches)) : [];

    // Also check mailto links
    $('a[href^="mailto:"]').each((i, el) => {
      const mailto = $(el).attr('href')?.replace('mailto:', '').split('?')[0];
      if (mailto && mailto.includes('@')) emails.push(mailto.trim());
    });
    
    const uniqueEmails = Array.from(new Set(emails));

    return NextResponse.json({ 
      text: text.slice(0, 15000), // Ensure we don't return enormous payloads
      emails: uniqueEmails,
      success: true 
    });

  } catch (error: any) {
    console.error("Scraper API Error:", error);
    return NextResponse.json({ error: error.message, success: false }, { status: 500 });
  }
}
