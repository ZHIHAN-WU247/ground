import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE_URL = 'https://www.yuque.com/cdek/api2';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const docsDir = join(rootDir, 'docs');
const tempDir = process.env.TEMP || process.env.TMP || join(rootDir, '.tmp');

async function fetchText(url, headers = {}) {
  const response = await fetch(url, {
    headers: {
      accept: 'text/html,application/json',
      'user-agent': USER_AGENT,
      ...headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Fetch failed ${response.status} ${response.statusText}: ${url}`);
  }

  return response.text();
}

function extractAppData(html) {
  const match = html.match(
    /window\.appData\s*=\s*JSON\.parse\(decodeURIComponent\("([^"]+)"\)\)/,
  );

  if (!match) {
    throw new Error('Unable to locate window.appData in Yuque HTML.');
  }

  return JSON.parse(decodeURIComponent(match[1]));
}

function decodeEntities(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

function stripTags(value) {
  return decodeEntities(value.replace(/<[^>]+>/g, ' '))
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function parseCardValue(rawValue) {
  if (!rawValue) return null;

  try {
    if (rawValue.startsWith('data:')) {
      return JSON.parse(decodeURIComponent(rawValue.slice(5)));
    }

    return JSON.parse(decodeEntities(rawValue));
  } catch {
    return null;
  }
}

function lakeToText(content) {
  if (!content) return '';

  return stripTags(
    content
      .replace(/<!doctype lake>/gi, '')
      .replace(/<meta\b[^>]*\/?>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|h[1-6]|li|tr|table|pre)>/gi, '\n')
      .replace(/<\/td>/gi, ' | ')
      .replace(/<card\b[^>]*name="codeblock"[^>]*value="([^"]*)"[^>]*><\/card>/gi, (_, encoded) => {
        const payload = parseCardValue(encoded);
        return payload?.code ? `\n${payload.code}\n` : '';
      }),
  );
}

function extractHeadings(content) {
  const headings = [];
  const re = /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi;
  let match;

  while ((match = re.exec(content))) {
    headings.push({
      level: Number(match[1]),
      title: stripTags(match[2]),
    });
  }

  return headings.filter((heading) => heading.title);
}

function extractEndpoints(text) {
  const endpoints = new Set();
  const patterns = [
    /\b(GET|POST|PUT|DELETE|PATCH)\b[\s-]*(https?:\/\/api(?:\.edu)?\.cdek\.ru\/v2\/[^\s|，。)]+)/gi,
    /\b(GET|POST|PUT|DELETE|PATCH)\b[\s-]*(\/v2\/[^\s|，。)]+)/gi,
    /https?:\/\/api(?:\.edu)?\.cdek\.ru\/v2\/[^\s|，。)]+/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text))) {
      endpoints.add(match[0].replace(/\s+/g, ' ').trim());
    }
  }

  return [...endpoints].sort();
}

function extractCodeBlocks(content) {
  const blocks = [];
  const cardRe = /<card\b[^>]*name="codeblock"[^>]*value="([^"]*)"[^>]*><\/card>/gi;
  let match;

  while ((match = cardRe.exec(content))) {
    const payload = parseCardValue(match[1]);
    if (payload?.code) {
      blocks.push({ mode: payload.mode || 'text', code: payload.code });
    }
  }

  const preRe = /<pre\b[^>]*>([\s\S]*?)<\/pre>/gi;
  while ((match = preRe.exec(content))) {
    const code = stripTags(match[1]);
    if (code) blocks.push({ mode: 'text', code });
  }

  return blocks;
}

function summarizeDoc(doc, text, content) {
  return {
    id: doc.id,
    slug: doc.slug,
    title: doc.title,
    sourceUrl: `${SOURCE_URL}/${doc.slug}`,
    wordCount: doc.word_count,
    updatedAt: doc.updated_at,
    publishedAt: doc.published_at,
    textLength: text.length,
    endpoints: extractEndpoints(text),
    headings: extractHeadings(content),
    codeBlockCount: extractCodeBlocks(content).length,
    firstParagraph: text.split(/\n{2,}/).find(Boolean)?.slice(0, 360) || '',
  };
}

function buildManifest(appData, docs) {
  return {
    sourceUrl: SOURCE_URL,
    generatedAt: new Date().toISOString(),
    book: {
      id: appData.book.id,
      slug: appData.book.slug,
      name: appData.book.name,
      description: appData.book.description,
      tocUpdatedAt: appData.book.toc_updated_at,
      updatedAt: appData.book.updated_at,
      contentUpdatedAt: appData.book.content_updated_at,
      itemsCount: appData.book.items_count,
    },
    toc: appData.book.toc.map((item) => ({
      type: item.type,
      title: item.title,
      slug: item.url || null,
      level: item.level,
      id: item.id || null,
      parentUuid: item.parent_uuid || null,
    })),
    docs,
  };
}

function buildReadingMap(manifest) {
  const lines = [
    '# CDEK API 2.0 Yuque Crawl Map',
    '',
    `Source: ${manifest.sourceUrl}`,
    `Generated at: ${manifest.generatedAt}`,
    `Book updated at: ${manifest.book.updatedAt}`,
    `TOC updated at: ${manifest.book.tocUpdatedAt}`,
    '',
    '## Directory',
    '',
  ];

  for (const item of manifest.toc) {
    const indent = '  '.repeat(item.level || 0);
    const target = item.slug ? ` - ${manifest.sourceUrl}/${item.slug}` : '';
    lines.push(`${indent}- ${item.type}: ${item.title}${target}`);
  }

  lines.push('', '## Documents', '');

  for (const doc of manifest.docs) {
    lines.push(`### ${doc.title}`);
    lines.push(`- Slug: ${doc.slug}`);
    lines.push(`- Source: ${doc.sourceUrl}`);
    lines.push(`- Updated: ${doc.updatedAt || 'unknown'}`);
    lines.push(`- Word count: ${doc.wordCount ?? 'unknown'}`);
    lines.push(`- Code blocks: ${doc.codeBlockCount}`);
    if (doc.endpoints.length) {
      lines.push(`- Endpoints: ${doc.endpoints.join('; ')}`);
    }
    if (doc.headings.length) {
      lines.push(`- Headings: ${doc.headings.map((h) => h.title).join(' / ')}`);
    }
    if (doc.firstParagraph) {
      lines.push(`- Opening note: ${doc.firstParagraph}`);
    }
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

async function main() {
  const html = await fetchText(SOURCE_URL);
  const appData = extractAppData(html);
  const docToc = appData.book.toc.filter((item) => item.type === 'DOC' && item.url);
  const docs = [];
  const fullTextLines = [
    `# ${appData.book.name}`,
    '',
    `Source: ${SOURCE_URL}`,
    `Generated at: ${new Date().toISOString()}`,
    '',
  ];

  for (const tocItem of docToc) {
    const apiUrl = new URL(`https://www.yuque.com/api/docs/${tocItem.url}`);
    apiUrl.searchParams.set('book_id', String(appData.book.id));
    apiUrl.searchParams.set('include_contributors', 'true');
    apiUrl.searchParams.set('include_like', 'false');
    apiUrl.searchParams.set('include_hits', 'false');
    apiUrl.searchParams.set('merge_dynamic_data', 'false');

    const json = JSON.parse(
      await fetchText(apiUrl, {
        accept: 'application/json',
        'x-requested-with': 'XMLHttpRequest',
      }),
    );

    const doc = json.data;
    const text = lakeToText(doc.content || '');
    docs.push(summarizeDoc(doc, text, doc.content || ''));
    fullTextLines.push(`## ${doc.title}`, '', `Source: ${SOURCE_URL}/${doc.slug}`, '', text, '');
  }

  const manifest = buildManifest(appData, docs);
  await mkdir(docsDir, { recursive: true });
  await mkdir(join(tempDir, 'yuque-cdek'), { recursive: true });

  const manifestPath = join(docsDir, 'cdek-api2-crawl-manifest.json');
  const readingMapPath = join(docsDir, 'cdek-api2-crawl-map.md');
  const fullTextPath = join(docsDir, 'cdek-api2-fulltext.md');
  const tempFullTextPath = join(tempDir, 'yuque-cdek', 'cdek-api2-fulltext.md');

  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  await writeFile(readingMapPath, buildReadingMap(manifest), 'utf8');
  await writeFile(fullTextPath, `${fullTextLines.join('\n')}\n`, 'utf8');
  await writeFile(tempFullTextPath, `${fullTextLines.join('\n')}\n`, 'utf8');

  process.stdout.write(`Fetched ${docs.length} docs from ${SOURCE_URL}\n`);
  process.stdout.write(`Manifest: ${manifestPath}\n`);
  process.stdout.write(`Reading map: ${readingMapPath}\n`);
  process.stdout.write(`Full text: ${fullTextPath}\n`);
  process.stdout.write(`Temporary full text: ${tempFullTextPath}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
