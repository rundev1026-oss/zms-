async function run() {
  try {
    const res = await fetch('https://www.figma.com/design/sM5A4WLiE4tA5w2Z0ck8gr/Untitled?node-id=2-50967&m=dev&t=IsL80ETEYPm0Tvg7-1', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    const t = await res.text();
    console.log('Status:', res.status, 'Length:', t.length);
    const titleMatch = t.match(/<title>(.*?)<\/title>/);
    console.log('Title:', titleMatch ? titleMatch[1] : null);
    const ogImage = t.match(/<meta property="og:image" content="(.*?)"/);
    console.log('OG Image:', ogImage ? ogImage[1] : null);
    const ogDesc = t.match(/<meta property="og:description" content="(.*?)"/);
    console.log('OG Desc:', ogDesc ? ogDesc[1] : null);
    const ogTitle = t.match(/<meta property="og:title" content="(.*?)"/);
    console.log('OG Title:', ogTitle ? ogTitle[1] : null);
  } catch (err) {
    console.log('Error:', err);
  }
}
run();

