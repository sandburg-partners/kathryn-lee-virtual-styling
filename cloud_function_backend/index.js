import nodemailer from "nodemailer";
import express from "express";
import cors from "cors";
import axios from "axios";
import * as cheerio from "cheerio";

const app = express();

const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-api-key']
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.options('*', cors(corsOptions));

const SHOP_EMAIL = "hats@kathrynleemillinery.com";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || "587");
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM_NAME = process.env.SMTP_FROM_NAME || "Kathryn Lee Millinery";
const SMTP_FROM_EMAIL = process.env.SMTP_FROM_EMAIL || SHOP_EMAIL;

const SHOPIFY_STOREFRONT_TOKEN = "e8c9c5f5e7ae4b5665baed47903a9735";
const KLM_PUBLIC_ACCESS_KEY = 'klm-public-virtual-styling-2025';


async function sendHandler(req, res) {
  try {
    const { name, userEmail, hatTitle, hatUrl, imageBase64, filename } = req.body || {};

    if (!userEmail || !name || !imageBase64 || !filename || !hatTitle) {
      const missing = [];
      if (!userEmail) missing.push('userEmail');
      if (!name) missing.push('name');
      if (!imageBase64) missing.push('imageBase64');
      if (!filename) missing.push('filename');
      if (!hatTitle) missing.push('hatTitle');
      return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.SMTP_FROM_EMAIL) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
    const port = parseInt(process.env.SMTP_PORT || '587', 10);

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    await transporter.verify();
    
    const firstName = name.split(" ")[0];
    const subject = `AI Styling Image - Kathryn Lee Millinery - ${name}`;

    const text =
      `Hi ${firstName}!\n\nYour AI generated styling image is attached. Enjoy!\n\nWarm regards,\nKathryn Lee\n\n` +
      `Name: ${name}\n` +
      `Email: ${userEmail}\n` +
      `Hat: ${hatTitle}\n` +
      (hatUrl ? `Link: ${hatUrl}\n` : '');

    let hatLink = hatTitle;
    if (hatUrl) {
      hatLink = `<a href="${hatUrl}" target="_blank">${hatTitle}</a>`;
    }

    const html =
      `<p>Hi ${firstName}!<br><br>Your AI generated styling image is attached. Enjoy!<br><br>Warm regards,<br>Kathryn Lee</p>` +
      `<p><strong>Name:</strong> ${name}<br>` +
      `<strong>Email:</strong> ${userEmail}<br>` +
      `<strong>Hat:</strong> ${hatLink}</p>`;


    const mailOptions = {
      from: `"${SMTP_FROM_NAME}" <${SMTP_FROM_EMAIL}>`,
      to: userEmail,
      bcc: SHOP_EMAIL,
      subject,
      text,
      html,
      attachments: [{
        filename,
        content: cleanBase64,
        encoding: 'base64'
      }]
    };

    const info = await transporter.sendMail(mailOptions);

    return res.status(200).json({ 
      ok: true, 
      messageId: info.messageId 
    });

  } catch (err) {
    console.error('❌ EMAIL_SEND_ERROR:', err);
    return res.status(500).json({ 
      error: 'Email send failed', 
      details: err.message 
    });
  }
}

async function fetchImageFromUrlHandler(req, res) {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ details: 'URL is required' });
  }

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    'Referer': 'https://www.google.com/'
  };

  const isDirectImage = /\.(jpg|jpeg|png|webp)$/i.test(url.split('?')[0]);

  try {
    if (isDirectImage) {
      // Handle direct image URLs
      const response = await axios.get(url, { responseType: 'arraybuffer', headers });
      const base64 = Buffer.from(response.data, 'binary').toString('base64');
      const mimeType = response.headers['content-type'] || 'image/jpeg';
      return res.status(200).json({ base64, mimeType });
    } else {
      // Handle product page URLs
      const { data: html } = await axios.get(url, { headers });
      const $ = cheerio.load(html);

      // Scrape for image tags in the specified order
      let imageUrl = 
        $('meta[property="og:image"]').attr('content') ||
        $('meta[name="twitter:image"]').attr('content') ||
        $('meta[property="product:image"]').attr('content') ||
        $('img[class*="product"]').first().attr('src');
      
      if (!imageUrl) {
        return res.status(404).json({ details: 'Could not find a valid product image on the linked page.' });
      }

      // Resolve relative URLs
      if (imageUrl.startsWith('//')) {
        imageUrl = 'https:' + imageUrl;
      } else if (imageUrl.startsWith('/')) {
        const pageUrl = new URL(url);
        imageUrl = `${pageUrl.protocol}//${pageUrl.hostname}${imageUrl}`;
      }
      
      const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer', headers });
      const base64 = Buffer.from(imageResponse.data, 'binary').toString('base64');
      const mimeType = imageResponse.headers['content-type'] || 'image/jpeg';
      
      return res.status(200).json({ base64, mimeType });
    }
  } catch (error) {
    console.error(`Failed to fetch or process URL ${url}:`, error.message);
    return res.status(500).json({ details: `Failed to retrieve image from the provided link. Please ensure it's a valid, public URL.` });
  }
}

async function shopifyProxyHandler(req, res) {
  const clientKey = req.headers['x-api-key'];

  if (!clientKey || clientKey !== KLM_PUBLIC_ACCESS_KEY) {
    console.error('Unauthorized attempt to access Shopify proxy');
    return res.status(403).json({ error: 'Forbidden - invalid API key' });
  }

  if (!SHOPIFY_STOREFRONT_TOKEN) {
    console.error('SHOPIFY_STOREFRONT_TOKEN is not configured.');
    return res.status(500).json({ error: 'Server configuration error.' });
  }

  const SHOPIFY_DOMAIN = "kathryn-lee-millinery.myshopify.com";
  const SHOPIFY_API_URL = `https://${SHOPIFY_DOMAIN}/api/2023-10/graphql.json`;

  const query = `
    {
      products(first: 250) {
        edges {
          node {
            id
            title
            handle
            onlineStoreUrl
            tags
            totalInventory
            images(first: 10) {
              edges {
                node {
                  url
                }
              }
            }
          }
        }
      }
    }
  `;

  try {
    const response = await axios.post(
      SHOPIFY_API_URL,
      { query },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token": SHOPIFY_STOREFRONT_TOKEN,
        },
      }
    );

    if (response.data.errors) {
      console.error("Shopify GraphQL Errors:", response.data.errors);
      return res.status(500).json({ error: "Failed to fetch data from Shopify.", details: response.data.errors });
    }
    
    const products = response.data?.data?.products?.edges || [];

    const transformedProducts = products.map((edge, index) => {
        const product = edge.node;
        return {
          id: product.id,
          name: product.title,
          hatSlug: product.handle,
          productUrl: product.onlineStoreUrl,
          imageUrls: product.images.edges.map(img => img.node.url),
          tags: product.tags || [],
          totalInventory: product.totalInventory,
          availableForSale: (product.totalInventory || 0) > 0,
        };
      });

    res.status(200).json(transformedProducts);

  } catch (error) {
    console.error("Error proxying request to Shopify:", error.message);
    if (error.response) {
      console.error("Shopify Error Response:", error.response.data);
      return res.status(error.response.status).json({ error: "Failed to fetch data from Shopify.", details: error.response.data });
    }
    return res.status(500).json({ error: "An unexpected error occurred." });
  }
}


app.post('/send-email', sendHandler);
app.post('/fetch-image-from-url', fetchImageFromUrlHandler);

app.get('/', shopifyProxyHandler); 
app.post('/api/shopify-hats', shopifyProxyHandler);

app.post('/', sendHandler); 

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Shopify Hats Proxy running on port ${PORT}`);
});