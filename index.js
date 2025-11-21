require('dotenv').config();
const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');

const {
  IMAP_USER,
  IMAP_PASS,
  IMAP_HOST = 'imap.gmail.com',
  IMAP_PORT = 993
} = process.env;

if (!IMAP_USER || !IMAP_PASS) {
  console.error('Faltan IMAP_USER o IMAP_PASS en variables de entorno');
  process.exit(1);
}

async function main() {
  const client = new ImapFlow({
    host: IMAP_HOST,
    port: Number(IMAP_PORT),
    secure: true,
    auth: {
      user: IMAP_USER,
      pass: IMAP_PASS
    }
  });

  try {
    console.log('Conectando a IMAP...');
    await client.connect();
    console.log('Conectado.');

    let lock = await client.getMailboxLock('INBOX');
    try {
      let uids = await client.search({
        from: 'info@account.netflix.com',
        seen: false
      });

      if (!uids || uids.length === 0) {
        console.log('No hay mails nuevos de Netflix');
        return;
      }

      const lastSeq = uids[uids.length - 1];
      console.log('Procesando mail de Netflix...');

      const { content } = await client.download(lastSeq, false);
      
      const chunks = [];
      for await (const chunk of content) {
        chunks.push(chunk);
      }
      const source = Buffer.concat(chunks);

      const parsed = await simpleParser(source);

      const html = parsed.html;
      if (!html) {
        console.log('El mail no tiene HTML');
        return;
      }

      const $ = cheerio.load(html);
      let targetHref = null;

      $('a').each((i, el) => {
        const text = $(el).text().trim();
        if (text.toLowerCase().includes('yes, this was me')) {
          targetHref = $(el).attr('href');
        }
      });

      if (!targetHref) {
        console.log('No se encontró el enlace de confirmación');
        await client.messageFlagsAdd(lastSeq, ['\\Seen']);
        return;
      }

      console.log('Confirmando Netflix Household...');

      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      
      await page.goto(targetHref, { waitUntil: 'networkidle2' });
      
      try {
        await page.waitForSelector('button[data-uia="set-primary-location-action"]', {
          timeout: 10000
        });
        
        await page.click('button[data-uia="set-primary-location-action"]');
        
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const pageContent = await page.content();
        
        if (pageContent.includes('updated') || pageContent.includes('confirmed') || pageContent.includes('Netflix Household')) {
          console.log('✅ Netflix Household actualizado correctamente');
        } else {
          console.log('⚠️  Confirmación completada');
        }
        
      } catch (error) {
        console.error('❌ Error:', error.message);
      } finally {
        await browser.close();
      }

      await client.messageFlagsAdd(lastSeq, ['\\Seen']);
      console.log('Mail procesado');
    } finally {
      lock.release();
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.logout();
  }
}

main();
