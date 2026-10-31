import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fillSurveyPdf } from '../src/lib/surveyPrint/stamp';
import type { SurveyPrintModel } from '../src/lib/surveyPrint/model';

async function main() {
  const model: SurveyPrintModel = JSON.parse(readFileSync('tmp/zms-12-model.json', 'utf8'));
  const pdfBytes = await fillSurveyPdf(model);
  const outPath = path.join(process.cwd(), 'tmp', 'survey-ZMS-2026-000012.pdf');
  writeFileSync(outPath, pdfBytes);
  console.log('Final PDF generated:', outPath, 'Bytes:', pdfBytes.length);
}

main().catch(console.error);

